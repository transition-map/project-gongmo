/**
 * 6단계 전환교육 지표 산식의 가중치·임계값·키 상수.
 *
 * - 본 산식은 **MVP 프로토타입(`mvp-v1`)**이며, 실제 적용 시 교육청·특수교육
 *   전문가·데이터 전문가의 검토를 거쳐 가중치·임계값을 보정해야 한다.
 * - 4단계 mock의 손으로 짠 demo 값(`indicatorVersion: "demo-v0"`)과는
 *   명확히 구분된다.
 * - 모든 가중치는 본 파일 한 곳에서만 변경한다.
 */

/** 산식 버전. 4단계 mock의 "demo-v0"와 구분. */
export const INDICATOR_VERSION = "mvp-v1" as const;

// ─── RawMetrics 키 상수 ────────────────────────────────────────────────────
/**
 * `RawMetrics` 평면 키 모음. extractRawMetrics·compute 함수는 이 상수만 사용한다.
 * 키를 직접 문자열로 작성하는 곳이 있으면 오타를 컴파일러가 잡지 못한다.
 */
export const RAW_KEYS = {
  // 수요 (A)
  specialEducationStudents: "specialEducationStudents",
  registeredDisabledYouth: "registeredDisabledYouth",
  youthPopulation: "youthPopulation",
  demandGrowthRate: "demandGrowthRate",
  disabilityCategoryBreakdownTotal: "disabilityCategoryBreakdownTotal",

  // 학교지원 (B)
  specialSchools: "specialSchools",
  specialClasses: "specialClasses",
  specialEducationTeachers: "specialEducationTeachers",
  supportCenters: "supportCenters",
  schoolAccessibilityFacilities: "schoolAccessibilityFacilities",
  specialTeacherPerStudentRatio: "specialTeacherPerStudentRatio",

  // 훈련공급 (C)
  trainingInstitutions: "trainingInstitutions",
  trainingPrograms: "trainingPrograms",
  careerExperiencePrograms: "careerExperiencePrograms",
  disabilityFocusedTrainingPrograms: "disabilityFocusedTrainingPrograms",
  jobCategoryDiversity: "jobCategoryDiversity",

  // 고용 (D)
  disabledJobPostings: "disabledJobPostings",
  employmentOutcomes: "employmentOutcomes",
  majorJobCategoryCount: "majorJobCategoryCount",
  averageWage: "averageWage",
  stableEmploymentRatio: "stableEmploymentRatio",

  // 복지 (E)
  welfareCenters: "welfareCenters",
  dayCareFacilities: "dayCareFacilities",
  vocationalRehabFacilities: "vocationalRehabFacilities",
  welfareCapacity: "welfareCapacity",
  welfareProgramCount: "welfareProgramCount",

  // 접근성 (F)
  accessibilityScore: "accessibilityScore",
  lowFloorBusRate: "lowFloorBusRate",
  accessibleBusStopCount: "accessibleBusStopCount",
  specialTransportVehicleCount: "specialTransportVehicleCount",
  barrierFreeFacilityCount: "barrierFreeFacilityCount",
} as const;

// ─── 정규화 임계값 (각 키의 100점 도달 maxValue) ────────────────────────────
/**
 * `normalizePositive(value, maxValue)`에서 사용. 임계값 초과 시 100으로 clamp.
 * 시군구 단위 시연용 임계값이며, 실데이터 분포에 맞춰 보정 필요.
 */
export const DOMAIN_THRESHOLDS = {
  demand: {
    specialEducationStudents: 1000,
    registeredDisabledYouth: 5000,
    /** 학생수/인구 비율의 100점 도달값 (1% = 0.01) */
    studentToPopulationRatio: 0.01,
    /** 전년대비 증가율 % */
    demandGrowthRate: 20,
  },
  schoolSupport: {
    specialSchools: 5,
    specialClasses: 30,
    specialEducationTeachers: 200,
    supportCenters: 3,
    schoolAccessibilityFacilities: 50,
  },
  trainingSupply: {
    trainingInstitutions: 8,
    trainingPrograms: 30,
    careerExperiencePrograms: 20,
    disabilityFocusedTrainingPrograms: 20,
    jobCategoryDiversity: 10,
  },
  employment: {
    disabledJobPostings: 50,
    majorJobCategoryCount: 10,
    /** employmentOutcomes(고용률 %)는 이미 0~100이므로 임계값 없이 clamp. */
  },
  welfare: {
    welfareCenters: 5,
    dayCareFacilities: 5,
    vocationalRehabFacilities: 5,
    welfareCapacity: 500,
    welfareProgramCount: 30,
  },
  accessibility: {
    /** lowFloorBusRate은 이미 % */
    accessibleBusStopCount: 500,
    specialTransportVehicleCount: 50,
    barrierFreeFacilityCount: 1500,
  },
} as const;

// ─── 도메인 내부 가중평균 가중치 ───────────────────────────────────────────
/** 각 도메인별 산식 항목 가중치. 도메인 내부 합 = 1.0 */
export const DOMAIN_WEIGHTS = {
  demand: {
    studentCount: 0.4,
    registeredCount: 0.3,
    studentRatio: 0.2,
    growthRate: 0.1,
  },
  schoolSupport: {
    specialSchools: 0.25,
    specialClasses: 0.2,
    specialEducationTeachers: 0.2,
    supportCenters: 0.15,
    accessibilityFacilities: 0.2,
  },
  trainingSupply: {
    institutions: 0.25,
    programs: 0.3,
    careerExperience: 0.2,
    disabilityFocused: 0.1,
    jobDiversity: 0.15,
  },
  employment: {
    postings: 0.4,
    employmentRate: 0.4,
    jobDiversity: 0.2,
  },
  welfare: {
    welfareCenters: 0.25,
    dayCareFacilities: 0.2,
    vocationalRehabFacilities: 0.2,
    capacity: 0.2,
    programCount: 0.15,
  },
  accessibility: {
    lowFloorBus: 0.3,
    busStops: 0.25,
    specialTransport: 0.2,
    barrierFree: 0.25,
  },
} as const;

// ─── transitionGapIndex 가중치 ────────────────────────────────────────────
/**
 * `computeTransitionGapIndex` 산식에 사용.
 *
 * 합 = 0.4 + 0.15 + 0.15 + 0.1 + 0.1 + 0.1 = 1.0
 *
 * 산식:
 *   demandIndex                  * 0.40
 *   + (100 - schoolSupportIndex) * 0.15
 *   + (100 - trainingSupplyIndex)* 0.15
 *   + (100 - employmentIndex)    * 0.10
 *   + (100 - welfareIndex)       * 0.10
 *   + (100 - accessibilityIndex) * 0.10
 */
export const TRANSITION_GAP_WEIGHTS = {
  demand: 0.4,
  schoolSupportInverse: 0.15,
  trainingSupplyInverse: 0.15,
  employmentInverse: 0.1,
  welfareInverse: 0.1,
  accessibilityInverse: 0.1,
} as const;
