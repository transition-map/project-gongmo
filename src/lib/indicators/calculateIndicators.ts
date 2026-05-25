/**
 * 6단계 전환교육 지표 산식 — 도메인별 0~100 점수 계산.
 *
 * 모든 함수는 **pure function**이며 mock 데이터·service를 직접 호출하지 않는다.
 * compute 함수는 RawMetrics만 받으므로 9단계 단위 테스트에서 도메인 단위로
 * 입력을 주입할 수 있다.
 *
 * 산식·임계값·가중치는 모두 `./config`에서 관리한다.
 *
 * MVP 한계:
 * - 일부 RawMetrics 키(averageWage, stableEmploymentRatio, demandGrowthRate 등)는
 *   현재 mock에 부재 → 0 fallback. 실데이터 도입 시 가중치를 재조정한다.
 * - youthPopulation은 region.population(전체 인구)를 fallback으로 사용 → 비율
 *   정확성 부족. 청소년 인구 분리 데이터가 들어오면 보정한다.
 */

import type {
  CareerExperienceProgram,
  EmploymentOutcomeSummary,
  InstitutionSummary,
  JobPosting,
  MobilityAccess,
  RawMetrics,
  RegionSummary,
  SchoolSummary,
  TrainingProgram,
  WelfareFacility,
} from "../../types";
import {
  DOMAIN_THRESHOLDS,
  DOMAIN_WEIGHTS,
  RAW_KEYS,
  TRANSITION_GAP_WEIGHTS,
} from "./config";
import {
  clampScore,
  normalizePositive,
  roundScore,
  safeDivide,
  toFiniteNumber,
  weightedAverage,
} from "./normalization";

// ─── extractRawMetrics 입력 형태 ──────────────────────────────────────────
/**
 * 도메인 데이터 묶음. buildTransitionIndex의 TransitionIndexInput과 동일한
 * 형태이며, extractRawMetrics만 단독 호출하고 싶은 경우에도 사용된다.
 *
 * `mobilityAccess`는 시군구당 여러 baseYear(예: 2025/2026)가 들어올 수 있으므로
 * `selectedBaseYear`로 어떤 연도를 사용할지 명시 가능. 미지정 시 가장 최근
 * baseYear의 항목을 자동 선택.
 */
export interface ExtractRawMetricsInput {
  region: RegionSummary;
  schools: SchoolSummary[];
  institutions: InstitutionSummary[];
  trainingPrograms: TrainingProgram[];
  careerExperiencePrograms: CareerExperienceProgram[];
  jobPostings: JobPosting[];
  employmentOutcome?: EmploymentOutcomeSummary;
  welfareFacilities: WelfareFacility[];
  mobilityAccess: MobilityAccess[];
  selectedBaseYear?: number;
}

/** Set에 들어가도 안전하도록 falsy(undefined/empty string)를 제거. */
function uniqueDefinedCount(values: Array<string | undefined | null>): number {
  return new Set(
    values.filter((v): v is string => typeof v === "string" && v.length > 0),
  ).size;
}

/** mobilityAccess에서 selectedBaseYear 또는 가장 최근 연도 한 건 선택. */
function pickMobility(
  list: MobilityAccess[],
  selected?: number,
): MobilityAccess | undefined {
  if (list.length === 0) return undefined;
  if (selected !== undefined) {
    const exact = list.find((m) => m.meta?.baseYear === selected);
    if (exact) return exact;
  }
  // baseYear 내림차순. baseYear 부재 항목은 마지막.
  const sorted = [...list].sort(
    (a, b) => (b.meta?.baseYear ?? -Infinity) - (a.meta?.baseYear ?? -Infinity),
  );
  return sorted[0];
}

// ─── 1. RawMetrics 추출 ───────────────────────────────────────────────────
/**
 * 도메인 데이터 묶음을 평면 RawMetrics로 변환한다.
 * - 도메인 객체에 이미 집계된 필드가 있으면 우선 사용 (예: region.specialEducationStudentCount).
 * - 없으면 도메인 배열에서 reduce 또는 filter로 직접 산출.
 * - 부재 시 0 또는 undefined fallback. 본 함수에서 throw하지 않는다.
 */
export function extractRawMetrics(
  input: ExtractRawMetricsInput,
): RawMetrics {
  const {
    region,
    schools,
    institutions,
    trainingPrograms,
    careerExperiencePrograms,
    jobPostings,
    employmentOutcome,
    welfareFacilities,
    mobilityAccess,
    selectedBaseYear,
  } = input;

  // === A. 수요 ===========================================================
  const specialEducationStudents =
    region.specialEducationStudentCount ??
    schools.reduce(
      (sum, s) => sum + toFiniteNumber(s.specialEducationStudentCount),
      0,
    );
  const registeredDisabledYouth = region.registeredDisabledCount ?? 0;
  // MVP fallback: youthPopulation을 region.population(전체)로 대체.
  const youthPopulation = region.population ?? 0;
  const demandGrowthRate = 0; // mock 부재 → 0
  const disabilityCategoryBreakdownTotal = (
    region.disabilityCategoryBreakdown ?? []
  ).reduce((sum, b) => sum + toFiniteNumber(b.count), 0);

  // === B. 학교지원 =======================================================
  const specialSchools = schools.filter(
    (s) => s.schoolType === "specialSchool",
  ).length;
  const specialClasses = schools.filter(
    (s) => s.schoolType === "specialClassInGeneralSchool",
  ).length;
  const specialEducationTeachers = schools.reduce(
    (sum, s) => sum + toFiniteNumber(s.specialEducationTeacherCount),
    0,
  );
  const supportCenters = institutions.filter(
    (i) => i.institutionType === "supportCenter",
  ).length;
  const schoolAccessibilityFacilities = schools.filter(
    (s) => s.hasBarrierFreeFacility === true,
  ).length;
  const specialTeacherPerStudentRatio = safeDivide(
    specialEducationTeachers,
    specialEducationStudents,
    0,
  );

  // === C. 훈련공급 =======================================================
  const trainingInstitutionsCount = institutions.filter(
    (i) => i.institutionType === "trainingCenter",
  ).length;
  const trainingProgramsCount = trainingPrograms.length;
  const careerExperienceProgramsCount = careerExperiencePrograms.length;
  // MVP fallback: 모든 훈련과정이 장애인 대상이라 가정.
  const disabilityFocusedTrainingPrograms = trainingProgramsCount;
  const jobCategoryDiversity = uniqueDefinedCount(
    trainingPrograms.map((t) => t.jobCode),
  );

  // === D. 고용 ==========================================================
  const disabledJobPostings = jobPostings.length;
  const employmentOutcomesValue = employmentOutcome?.employmentRate ?? 0;
  const majorJobCategoryCount = uniqueDefinedCount(
    jobPostings.map((j) => j.jobCode),
  );
  // mock 부재 → undefined
  const averageWage = undefined;
  const stableEmploymentRatio = undefined;

  // === E. 복지 ==========================================================
  const welfareCenters = welfareFacilities.filter(
    (w) => w.facilityType === "welfareCenter",
  ).length;
  const dayCareFacilitiesCount = welfareFacilities.filter(
    (w) => w.facilityType === "dayCareFacility",
  ).length;
  const vocationalRehabFacilitiesCount = welfareFacilities.filter(
    (w) => w.facilityType === "vocationalRehabFacility",
  ).length;
  const welfareCapacity = welfareFacilities.reduce(
    (sum, w) => sum + toFiniteNumber(w.capacity),
    0,
  );
  const welfareProgramCount = welfareFacilities.reduce(
    (sum, w) => sum + (w.servicePrograms?.length ?? 0),
    0,
  );

  // === F. 접근성 ========================================================
  const mob = pickMobility(mobilityAccess, selectedBaseYear);
  const accessibilityScore = mob?.accessibilityScore;
  const lowFloorBusRate = mob?.lowFloorBusRate;
  const accessibleBusStopCount = mob?.accessibleBusStopCount;
  const specialTransportVehicleCount = mob?.specialTransportVehicleCount;
  const barrierFreeFacilityCount = mob?.barrierFreeFacilityCount;

  // === RawMetrics 평면 객체 ============================================
  const out: RawMetrics = {};
  out[RAW_KEYS.specialEducationStudents] = specialEducationStudents;
  out[RAW_KEYS.registeredDisabledYouth] = registeredDisabledYouth;
  out[RAW_KEYS.youthPopulation] = youthPopulation;
  out[RAW_KEYS.demandGrowthRate] = demandGrowthRate;
  out[RAW_KEYS.disabilityCategoryBreakdownTotal] =
    disabilityCategoryBreakdownTotal;

  out[RAW_KEYS.specialSchools] = specialSchools;
  out[RAW_KEYS.specialClasses] = specialClasses;
  out[RAW_KEYS.specialEducationTeachers] = specialEducationTeachers;
  out[RAW_KEYS.supportCenters] = supportCenters;
  out[RAW_KEYS.schoolAccessibilityFacilities] = schoolAccessibilityFacilities;
  out[RAW_KEYS.specialTeacherPerStudentRatio] = specialTeacherPerStudentRatio;

  out[RAW_KEYS.trainingInstitutions] = trainingInstitutionsCount;
  out[RAW_KEYS.trainingPrograms] = trainingProgramsCount;
  out[RAW_KEYS.careerExperiencePrograms] = careerExperienceProgramsCount;
  out[RAW_KEYS.disabilityFocusedTrainingPrograms] =
    disabilityFocusedTrainingPrograms;
  out[RAW_KEYS.jobCategoryDiversity] = jobCategoryDiversity;

  out[RAW_KEYS.disabledJobPostings] = disabledJobPostings;
  out[RAW_KEYS.employmentOutcomes] = employmentOutcomesValue;
  out[RAW_KEYS.majorJobCategoryCount] = majorJobCategoryCount;
  out[RAW_KEYS.averageWage] = averageWage;
  out[RAW_KEYS.stableEmploymentRatio] = stableEmploymentRatio;

  out[RAW_KEYS.welfareCenters] = welfareCenters;
  out[RAW_KEYS.dayCareFacilities] = dayCareFacilitiesCount;
  out[RAW_KEYS.vocationalRehabFacilities] = vocationalRehabFacilitiesCount;
  out[RAW_KEYS.welfareCapacity] = welfareCapacity;
  out[RAW_KEYS.welfareProgramCount] = welfareProgramCount;

  out[RAW_KEYS.accessibilityScore] = accessibilityScore;
  out[RAW_KEYS.lowFloorBusRate] = lowFloorBusRate;
  out[RAW_KEYS.accessibleBusStopCount] = accessibleBusStopCount;
  out[RAW_KEYS.specialTransportVehicleCount] = specialTransportVehicleCount;
  out[RAW_KEYS.barrierFreeFacilityCount] = barrierFreeFacilityCount;

  return out;
}

// ─── 2. 도메인 산식 ────────────────────────────────────────────────────────

/** 수요지수 — 값이 클수록 수요가 높음(공백지수의 + 항). */
export function computeDemandIndex(rm: RawMetrics): number {
  const t = DOMAIN_THRESHOLDS.demand;
  const w = DOMAIN_WEIGHTS.demand;
  const studentCount = rm[RAW_KEYS.specialEducationStudents];
  const registered = rm[RAW_KEYS.registeredDisabledYouth];
  const population = rm[RAW_KEYS.youthPopulation];
  const growth = rm[RAW_KEYS.demandGrowthRate];

  const ratio = safeDivide(studentCount, population, 0);

  return roundScore(
    weightedAverage([
      {
        value: normalizePositive(studentCount, t.specialEducationStudents),
        weight: w.studentCount,
      },
      {
        value: normalizePositive(registered, t.registeredDisabledYouth),
        weight: w.registeredCount,
      },
      {
        value: normalizePositive(ratio, t.studentToPopulationRatio),
        weight: w.studentRatio,
      },
      {
        value: normalizePositive(growth, t.demandGrowthRate),
        weight: w.growthRate,
      },
    ]),
  );
}

/** 학교지원지수 — 값이 클수록 자원이 풍부. */
export function computeSchoolSupportIndex(rm: RawMetrics): number {
  const t = DOMAIN_THRESHOLDS.schoolSupport;
  const w = DOMAIN_WEIGHTS.schoolSupport;
  return roundScore(
    weightedAverage([
      {
        value: normalizePositive(
          rm[RAW_KEYS.specialSchools],
          t.specialSchools,
        ),
        weight: w.specialSchools,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.specialClasses],
          t.specialClasses,
        ),
        weight: w.specialClasses,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.specialEducationTeachers],
          t.specialEducationTeachers,
        ),
        weight: w.specialEducationTeachers,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.supportCenters],
          t.supportCenters,
        ),
        weight: w.supportCenters,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.schoolAccessibilityFacilities],
          t.schoolAccessibilityFacilities,
        ),
        weight: w.accessibilityFacilities,
      },
    ]),
  );
}

/** 훈련공급지수. */
export function computeTrainingSupplyIndex(rm: RawMetrics): number {
  const t = DOMAIN_THRESHOLDS.trainingSupply;
  const w = DOMAIN_WEIGHTS.trainingSupply;
  return roundScore(
    weightedAverage([
      {
        value: normalizePositive(
          rm[RAW_KEYS.trainingInstitutions],
          t.trainingInstitutions,
        ),
        weight: w.institutions,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.trainingPrograms],
          t.trainingPrograms,
        ),
        weight: w.programs,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.careerExperiencePrograms],
          t.careerExperiencePrograms,
        ),
        weight: w.careerExperience,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.disabilityFocusedTrainingPrograms],
          t.disabilityFocusedTrainingPrograms,
        ),
        weight: w.disabilityFocused,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.jobCategoryDiversity],
          t.jobCategoryDiversity,
        ),
        weight: w.jobDiversity,
      },
    ]),
  );
}

/** 고용지수. employmentOutcomes(고용률 %)는 이미 0~100이므로 clampScore. */
export function computeEmploymentIndex(rm: RawMetrics): number {
  const t = DOMAIN_THRESHOLDS.employment;
  const w = DOMAIN_WEIGHTS.employment;
  return roundScore(
    weightedAverage([
      {
        value: normalizePositive(
          rm[RAW_KEYS.disabledJobPostings],
          t.disabledJobPostings,
        ),
        weight: w.postings,
      },
      {
        value: clampScore(rm[RAW_KEYS.employmentOutcomes]),
        weight: w.employmentRate,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.majorJobCategoryCount],
          t.majorJobCategoryCount,
        ),
        weight: w.jobDiversity,
      },
    ]),
  );
}

/** 복지지수. */
export function computeWelfareIndex(rm: RawMetrics): number {
  const t = DOMAIN_THRESHOLDS.welfare;
  const w = DOMAIN_WEIGHTS.welfare;
  return roundScore(
    weightedAverage([
      {
        value: normalizePositive(rm[RAW_KEYS.welfareCenters], t.welfareCenters),
        weight: w.welfareCenters,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.dayCareFacilities],
          t.dayCareFacilities,
        ),
        weight: w.dayCareFacilities,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.vocationalRehabFacilities],
          t.vocationalRehabFacilities,
        ),
        weight: w.vocationalRehabFacilities,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.welfareCapacity],
          t.welfareCapacity,
        ),
        weight: w.capacity,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.welfareProgramCount],
          t.welfareProgramCount,
        ),
        weight: w.programCount,
      },
    ]),
  );
}

/**
 * 접근성지수.
 * 1순위: rm.accessibilityScore (0~100, 이미 가공된 점수).
 * 부재·비유한값일 때만 보조 산식으로 fallback.
 */
export function computeAccessibilityIndex(rm: RawMetrics): number {
  const direct = rm[RAW_KEYS.accessibilityScore];
  if (direct !== undefined && Number.isFinite(direct)) {
    return roundScore(clampScore(direct));
  }
  const t = DOMAIN_THRESHOLDS.accessibility;
  const w = DOMAIN_WEIGHTS.accessibility;
  return roundScore(
    weightedAverage([
      {
        value: clampScore(rm[RAW_KEYS.lowFloorBusRate]),
        weight: w.lowFloorBus,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.accessibleBusStopCount],
          t.accessibleBusStopCount,
        ),
        weight: w.busStops,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.specialTransportVehicleCount],
          t.specialTransportVehicleCount,
        ),
        weight: w.specialTransport,
      },
      {
        value: normalizePositive(
          rm[RAW_KEYS.barrierFreeFacilityCount],
          t.barrierFreeFacilityCount,
        ),
        weight: w.barrierFree,
      },
    ]),
  );
}

// ─── 3. transitionGapIndex ─────────────────────────────────────────────────
/**
 * 전환공백지수. 수요가 높고 공급·접근성이 낮을수록 ↑.
 *
 * 산식 (사용자 §8 명세 그대로):
 *   demandIndex                  * 0.40
 *   + (100 - schoolSupportIndex) * 0.15
 *   + (100 - trainingSupplyIndex)* 0.15
 *   + (100 - employmentIndex)    * 0.10
 *   + (100 - welfareIndex)       * 0.10
 *   + (100 - accessibilityIndex) * 0.10
 *
 * 가중치는 TRANSITION_GAP_WEIGHTS에서 관리. 함수 내부 하드코딩 없음.
 */
export function computeTransitionGapIndex(scores: {
  demandIndex: number;
  schoolSupportIndex: number;
  trainingSupplyIndex: number;
  employmentIndex: number;
  welfareIndex: number;
  accessibilityIndex: number;
}): number {
  const w = TRANSITION_GAP_WEIGHTS;
  const total =
    clampScore(scores.demandIndex) * w.demand +
    (100 - clampScore(scores.schoolSupportIndex)) * w.schoolSupportInverse +
    (100 - clampScore(scores.trainingSupplyIndex)) * w.trainingSupplyInverse +
    (100 - clampScore(scores.employmentIndex)) * w.employmentInverse +
    (100 - clampScore(scores.welfareIndex)) * w.welfareInverse +
    (100 - clampScore(scores.accessibilityIndex)) * w.accessibilityInverse;
  return roundScore(total);
}
