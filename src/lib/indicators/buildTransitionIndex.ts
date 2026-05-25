/**
 * 6단계 통합 진입 함수.
 *
 * `TransitionIndexInput` 묶음을 받아 산식 결과(`TransitionIndex`)를 반환한다.
 * 화면(7단계)·테스트(9단계)에서 도메인 데이터를 모아 한 번에 호출하는 용도.
 *
 * **순수성 노트:**
 * - `extractRawMetrics`, 6개 도메인 compute 함수, computeTransitionGapIndex는
 *   모두 pure function이다.
 * - `buildTransitionIndex`는 기본 호출 시 `new Date().toISOString()`로
 *   `calculatedAt`을 자동 채우므로 비결정적이다.
 * - 결정적 동작이 필요한 경우(테스트 등) `input.calculatedAt`을 직접 주입한다.
 */

import type {
  CareerExperienceProgram,
  EmploymentOutcomeSummary,
  InstitutionSummary,
  JobPosting,
  MobilityAccess,
  RegionSummary,
  SchoolSummary,
  TrainingProgram,
  TransitionIndex,
  WelfareFacility,
} from "../../types";
import {
  computeAccessibilityIndex,
  computeDemandIndex,
  computeEmploymentIndex,
  computeSchoolSupportIndex,
  computeTrainingSupplyIndex,
  computeTransitionGapIndex,
  computeWelfareIndex,
  extractRawMetrics,
} from "./calculateIndicators";
import { INDICATOR_VERSION } from "./config";

/**
 * `buildTransitionIndex` 입력 묶음.
 *
 * - `baseYear`: 산출 기준연도. mobilityAccess가 baseYear별 여러 건이면 이 값으로 필터링.
 * - `calculatedAt`: 결정적 동작을 위한 직접 주입(ISO 8601). 미지정 시 `new Date().toISOString()`.
 * - `metaOverrides`: 결과 TransitionIndex의 메타 일부를 명시 주입.
 */
export interface TransitionIndexInput {
  region: RegionSummary;
  schools: SchoolSummary[];
  institutions: InstitutionSummary[];
  trainingPrograms: TrainingProgram[];
  careerExperiencePrograms: CareerExperienceProgram[];
  jobPostings: JobPosting[];
  employmentOutcome?: EmploymentOutcomeSummary;
  welfareFacilities: WelfareFacility[];
  mobilityAccess: MobilityAccess[];
  baseYear?: number;
  calculatedAt?: string;
  metaOverrides?: Partial<
    Pick<TransitionIndex, "sourceUpdatedAt" | "collectedAt" | "baseMonth">
  >;
}

/**
 * 도메인 데이터 → TransitionIndex(`indicatorVersion: "mvp-v1"`) 변환.
 *
 * - `input.calculatedAt` 미지정 시 `new Date().toISOString()` 자동 채움.
 * - 결정적 동작이 필요하면 `input.calculatedAt`을 직접 주입한다.
 */
export function buildTransitionIndex(
  input: TransitionIndexInput,
): TransitionIndex {
  const rawMetrics = extractRawMetrics({
    region: input.region,
    schools: input.schools,
    institutions: input.institutions,
    trainingPrograms: input.trainingPrograms,
    careerExperiencePrograms: input.careerExperiencePrograms,
    jobPostings: input.jobPostings,
    employmentOutcome: input.employmentOutcome,
    welfareFacilities: input.welfareFacilities,
    mobilityAccess: input.mobilityAccess,
    selectedBaseYear: input.baseYear,
  });

  const demandIndex = computeDemandIndex(rawMetrics);
  const schoolSupportIndex = computeSchoolSupportIndex(rawMetrics);
  const trainingSupplyIndex = computeTrainingSupplyIndex(rawMetrics);
  const employmentIndex = computeEmploymentIndex(rawMetrics);
  const welfareIndex = computeWelfareIndex(rawMetrics);
  const accessibilityIndex = computeAccessibilityIndex(rawMetrics);

  const transitionGapIndex = computeTransitionGapIndex({
    demandIndex,
    schoolSupportIndex,
    trainingSupplyIndex,
    employmentIndex,
    welfareIndex,
    accessibilityIndex,
  });

  return {
    regionCode: input.region.regionCode,
    rawMetrics,
    normalizedScores: {
      demand: demandIndex,
      schoolSupport: schoolSupportIndex,
      trainingSupply: trainingSupplyIndex,
      employment: employmentIndex,
      welfare: welfareIndex,
      accessibility: accessibilityIndex,
    },
    indicators: {
      demandIndex,
      schoolSupportIndex,
      trainingSupplyIndex,
      employmentIndex,
      welfareIndex,
      accessibilityIndex,
      transitionGapIndex,
    },
    indicatorVersion: INDICATOR_VERSION,
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
    baseYear: input.baseYear,
    baseMonth: input.metaOverrides?.baseMonth,
    sourceUpdatedAt: input.metaOverrides?.sourceUpdatedAt,
    collectedAt: input.metaOverrides?.collectedAt,
  };
}
