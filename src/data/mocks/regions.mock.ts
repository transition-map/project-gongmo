/**
 * 시군구 단위 RegionSummary mock (6개).
 * indicators는 transitionIndexes.mock.ts에서 lookup하여 결합한다.
 *
 * disabilityCategoryBreakdown은 집계 통계 전용 — 추천 후보 제한에 사용 금지.
 */

import type {
  DisabilityCategoryBreakdown,
  RegionSummary,
} from "../../types";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_REGIONS,
  DEMO_SOURCE_UPDATED_AT,
} from "./_shared";
import { transitionIndexes } from "./transitionIndexes.mock";

const indexByRegion = new Map(
  transitionIndexes.map((t) => [t.regionCode, t]),
);

/** 시연용 장애유형 집계 — 시군구 단위 */
function demoBreakdown(
  base: number,
): DisabilityCategoryBreakdown[] {
  return [
    { categoryCode: "DEMO-D-01", categoryName: "지적장애", count: base, source: "demo:특수교육통계" },
    { categoryCode: "DEMO-D-02", categoryName: "자폐성장애", count: Math.round(base * 0.7), source: "demo:특수교육통계" },
    { categoryCode: "DEMO-D-03", categoryName: "지체장애", count: Math.round(base * 0.4), source: "demo:특수교육통계" },
    { categoryCode: "DEMO-D-04", categoryName: "기타", count: Math.round(base * 0.3), source: "demo:특수교육통계" },
  ];
}

interface RegionMockInput {
  regionCode: string;
  population: number;
  registeredDisabledCount: number;
  studentDemandCount: number;
  schoolCount: number;
  specialEducationStudentCount: number;
  specialEducationTeacherCount: number;
  trainingInstitutionCount: number;
  careerExperienceCenterCount: number;
  welfareFacilityCount: number;
  jobPostingCount: number;
  breakdownBase: number;
  mainIssue: string;
  policyUse: string;
  teacherUse: string;
  /**
   * 11-2 1차-11 신규 — 시연용 partial/skeletal region 표시.
   * true이면 RegionSummary.partialRegionFlag=true로 출력, disabilityCategoryBreakdown은 빈 배열.
   */
  partialRegionFlag?: boolean;
}

function build(input: RegionMockInput): RegionSummary {
  const ref = DEMO_REGIONS.find((r) => r.regionCode === input.regionCode);
  if (!ref) {
    throw new Error(
      `[regions.mock] unknown demo regionCode: ${input.regionCode}`,
    );
  }
  return {
    regionCode: ref.regionCode,
    regionCodeType: ref.regionCodeType,
    sigunguCode: ref.sigunguCode,
    regionName: ref.regionName,

    population: input.population,
    registeredDisabledCount: input.registeredDisabledCount,
    studentDemandCount: input.studentDemandCount,
    disabilityCategoryBreakdown: input.partialRegionFlag
      ? []
      : demoBreakdown(input.breakdownBase),

    schoolCount: input.schoolCount,
    specialEducationStudentCount: input.specialEducationStudentCount,
    specialEducationTeacherCount: input.specialEducationTeacherCount,
    trainingInstitutionCount: input.trainingInstitutionCount,
    careerExperienceCenterCount: input.careerExperienceCenterCount,
    welfareFacilityCount: input.welfareFacilityCount,
    jobPostingCount: input.jobPostingCount,

    indicators: indexByRegion.get(input.regionCode),

    mainIssue: input.mainIssue,
    policyUse: input.policyUse,
    teacherUse: input.teacherUse,

    partialRegionFlag: input.partialRegionFlag,

    meta: {
      source: "demo:integrated",
      collectedAt: DEMO_COLLECTED_AT,
      sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
      version: "demo-v0",
      license: DEMO_LICENSE,
    },
  };
}

export const regions: RegionSummary[] = [
  build({
    regionCode: "DEMO-SIGUNGU-01",
    population: 540_000,
    registeredDisabledCount: 18_400,
    studentDemandCount: 720,
    schoolCount: 2,
    specialEducationStudentCount: 380,
    specialEducationTeacherCount: 84,
    trainingInstitutionCount: 4,
    careerExperienceCenterCount: 5,
    welfareFacilityCount: 2,
    jobPostingCount: 26,
    breakdownBase: 320,
    mainIssue:
      "전반적 자원이 양호하나 진로체험 프로그램 다양성이 부족합니다 (시연용).",
    policyUse: "추가 진로체험 프로그램 확충 및 기존 자원 효율화 검토.",
    teacherUse:
      "학생 관심 분야 다양화에 맞춘 인접 자치구 프로그램 연계 안내 가능.",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-02",
    population: 410_000,
    registeredDisabledCount: 16_700,
    studentDemandCount: 560,
    schoolCount: 2,
    specialEducationStudentCount: 295,
    specialEducationTeacherCount: 62,
    trainingInstitutionCount: 3,
    careerExperienceCenterCount: 3,
    welfareFacilityCount: 3,
    jobPostingCount: 22,
    breakdownBase: 240,
    mainIssue:
      "중간 수준의 자원·접근성. 일부 권역의 진로체험 기회가 부족합니다 (시연용).",
    policyUse: "권역 내 자원 균형 배분과 거점기관 운영 검토.",
    teacherUse:
      "거점기관 우선 안내 + 인접 권역 보조 자원 결합 안내 가능.",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-03",
    population: 380_000,
    registeredDisabledCount: 12_900,
    studentDemandCount: 940,
    schoolCount: 2,
    specialEducationStudentCount: 510,
    specialEducationTeacherCount: 92,
    trainingInstitutionCount: 2,
    careerExperienceCenterCount: 2,
    welfareFacilityCount: 2,
    jobPostingCount: 28,
    breakdownBase: 420,
    mainIssue:
      "학생 수요가 빠르게 증가했으나 훈련·복지 공급이 따라가지 못합니다 (시연용 수요폭증형).",
    policyUse: "수요 증가에 대응한 훈련기관 신규 지정·복지자원 확충 우선 검토.",
    teacherUse:
      "현재 기준 한정 자원에 과부하 가능. 인접 시군구 자원과 온라인 자원 결합 안내 권장.",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-04",
    population: 320_000,
    registeredDisabledCount: 13_500,
    studentDemandCount: 480,
    schoolCount: 2,
    specialEducationStudentCount: 240,
    specialEducationTeacherCount: 58,
    trainingInstitutionCount: 3,
    careerExperienceCenterCount: 3,
    welfareFacilityCount: 2,
    jobPostingCount: 18,
    breakdownBase: 200,
    mainIssue:
      "학교·훈련 자원은 평균이나 복지 자원이 부족합니다 (시연용 복지 빈약형).",
    policyUse: "장애인복지관·주간이용시설 신규 지정 또는 운영시간 확장 검토.",
    teacherUse:
      "복지 자원 부족을 보완하는 외부 기관 연계 안내 권장.",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-05",
    population: 220_000,
    registeredDisabledCount: 11_800,
    studentDemandCount: 360,
    schoolCount: 2,
    specialEducationStudentCount: 180,
    specialEducationTeacherCount: 44,
    trainingInstitutionCount: 2,
    careerExperienceCenterCount: 1,
    welfareFacilityCount: 2,
    jobPostingCount: 12,
    breakdownBase: 150,
    mainIssue:
      "농산어촌 특성상 이동·접근성이 낮고 훈련 공급이 부족합니다 (시연용 접근성 취약형).",
    policyUse: "셔틀·특별교통수단 확충, 거점기관·온라인 진로탐색 인프라 확장.",
    teacherUse:
      "온라인·거주지 인근 자원 우선 안내, 보호자 동행 사전 협의 권장.",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-06",
    population: 290_000,
    registeredDisabledCount: 12_200,
    studentDemandCount: 410,
    schoolCount: 2,
    specialEducationStudentCount: 210,
    specialEducationTeacherCount: 48,
    trainingInstitutionCount: 1,
    careerExperienceCenterCount: 2,
    welfareFacilityCount: 1,
    jobPostingCount: 16,
    breakdownBase: 170,
    mainIssue:
      "훈련 공급 자원이 매우 적습니다 (시연용 훈련 공급 취약형).",
    policyUse: "권역 내 직업훈련 자원 신규 지정 또는 인접 권역과의 공동 운영 검토.",
    teacherUse:
      "인접 권역 훈련 자원 + 온라인 훈련 자원 결합 경로 안내 권장.",
  }),
  // 11-2 1차-11 신규 — 시연용 partial/skeletal region.
  // ETL `MartRegionSummaryRecord.partialRegionFlag=true` 정의와 일관되게 모든 주요 카운트 0.
  // transitionIndexes.mock에서 transitionGapIndex=60으로 부여 (ETL Policy A 시뮬레이션 결과와 동일).
  // 60은 실제 공백이 아닌 데이터 부재 상태의 산식 기본값 — Dashboard partial badge로 안내한다.
  build({
    regionCode: "DEMO-SIGUNGU-07-PARTIAL",
    population: 0,
    registeredDisabledCount: 0,
    studentDemandCount: 0,
    schoolCount: 0,
    specialEducationStudentCount: 0,
    specialEducationTeacherCount: 0,
    trainingInstitutionCount: 0,
    careerExperienceCenterCount: 0,
    welfareFacilityCount: 0,
    jobPostingCount: 0,
    breakdownBase: 0,
    mainIssue:
      "데이터가 부족한 시연용 지역입니다. 모든 도메인(수요·학교·훈련·고용·복지·접근성) 카운트가 0이며, transitionGapIndex 60은 데이터 부재 상태에서 산식이 산출한 기본값입니다.",
    policyUse:
      "데이터 부재 상태이므로 정책 판단에 사용할 수 없습니다. 우선 demand·school·institution 등 기본 데이터 수집이 필요합니다.",
    teacherUse:
      "이 지역은 데이터 부재로 추천 경로 산출이 어렵습니다. 후속 데이터 확보 후 재검토를 권장합니다.",
    partialRegionFlag: true,
  }),
];
