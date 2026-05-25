/**
 * 시군구 단위 SchoolSummary mock (12개 = 6 시군구 × 2개).
 * 각 시군구당 specialSchool 1 + specialClassInGeneralSchool 1.
 *
 * 학교명은 모두 "(시연용)" suffix로 표기해 실제 학교 오해를 방지한다.
 * 일부 학교에 disabilityCategoryBreakdown(집계 전용)을 부여한다.
 */

import type {
  DisabilityCategoryBreakdown,
  SchoolSummary,
} from "../../types";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_REGIONS,
  DEMO_SOURCE_UPDATED_AT,
  demoCoordinate,
  makeSchoolId,
  regionRefOf,
} from "./_shared";

function schoolBreakdown(base: number): DisabilityCategoryBreakdown[] {
  return [
    { categoryCode: "DEMO-D-01", categoryName: "지적장애", count: base, source: "demo:학교알리미" },
    { categoryCode: "DEMO-D-02", categoryName: "자폐성장애", count: Math.round(base * 0.5), source: "demo:학교알리미" },
    { categoryCode: "DEMO-D-03", categoryName: "지체장애", count: Math.round(base * 0.3), source: "demo:학교알리미" },
  ];
}

interface SchoolEntry {
  regionCode: string;
  shortName: string;
  type: "specialSchool" | "specialClassInGeneralSchool";
  studentCount: number;
  teacherCount: number;
  classCount: number;
  inclusionPrograms: number;
  hasBarrierFree: boolean;
  hasShuttle: boolean;
  hasInclusion: boolean;
  /** 좌표 흐트러짐 (base 좌표 기준) */
  dx: number;
  dy: number;
  /** disabilityCategoryBreakdown 보유 시 base 인원 */
  breakdownBase?: number;
}

const ENTRIES: SchoolEntry[] = [
  // 강남구
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남특수학교", type: "specialSchool", studentCount: 220, teacherCount: 48, classCount: 22, inclusionPrograms: 4, hasBarrierFree: true, hasShuttle: true, hasInclusion: true, dx: 0.012, dy: 0.008, breakdownBase: 110 },
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남일반고특수학급", type: "specialClassInGeneralSchool", studentCount: 24, teacherCount: 4, classCount: 3, inclusionPrograms: 2, hasBarrierFree: true, hasShuttle: false, hasInclusion: true, dx: -0.018, dy: 0.014 },
  // 해운대구
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대특수학교", type: "specialSchool", studentCount: 180, teacherCount: 36, classCount: 18, inclusionPrograms: 3, hasBarrierFree: true, hasShuttle: true, hasInclusion: true, dx: 0.020, dy: -0.010, breakdownBase: 90 },
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대중특수학급", type: "specialClassInGeneralSchool", studentCount: 18, teacherCount: 3, classCount: 2, inclusionPrograms: 1, hasBarrierFree: true, hasShuttle: false, hasInclusion: true, dx: -0.012, dy: 0.020 },
  // 수원시 영통구
  { regionCode: "DEMO-SIGUNGU-03", shortName: "영통특수학교", type: "specialSchool", studentCount: 320, teacherCount: 58, classCount: 30, inclusionPrograms: 5, hasBarrierFree: true, hasShuttle: true, hasInclusion: true, dx: 0.015, dy: 0.005, breakdownBase: 160 },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "영통고특수학급", type: "specialClassInGeneralSchool", studentCount: 28, teacherCount: 5, classCount: 3, inclusionPrograms: 2, hasBarrierFree: false, hasShuttle: false, hasInclusion: true, dx: -0.022, dy: 0.018 },
  // 청주시 흥덕구
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕특수학교", type: "specialSchool", studentCount: 150, teacherCount: 32, classCount: 16, inclusionPrograms: 2, hasBarrierFree: true, hasShuttle: true, hasInclusion: true, dx: 0.010, dy: 0.012, breakdownBase: 80 },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕초특수학급", type: "specialClassInGeneralSchool", studentCount: 14, teacherCount: 2, classCount: 2, inclusionPrograms: 1, hasBarrierFree: false, hasShuttle: false, hasInclusion: true, dx: -0.015, dy: -0.010 },
  // 목포시
  { regionCode: "DEMO-SIGUNGU-05", shortName: "목포특수학교", type: "specialSchool", studentCount: 110, teacherCount: 24, classCount: 12, inclusionPrograms: 2, hasBarrierFree: true, hasShuttle: true, hasInclusion: true, dx: 0.018, dy: 0.006, breakdownBase: 60 },
  { regionCode: "DEMO-SIGUNGU-05", shortName: "목포중특수학급", type: "specialClassInGeneralSchool", studentCount: 12, teacherCount: 2, classCount: 1, inclusionPrograms: 1, hasBarrierFree: false, hasShuttle: false, hasInclusion: true, dx: -0.020, dy: 0.022 },
  // 춘천시
  { regionCode: "DEMO-SIGUNGU-06", shortName: "춘천특수학교", type: "specialSchool", studentCount: 130, teacherCount: 28, classCount: 14, inclusionPrograms: 2, hasBarrierFree: true, hasShuttle: false, hasInclusion: true, dx: 0.014, dy: 0.010, breakdownBase: 70 },
  { regionCode: "DEMO-SIGUNGU-06", shortName: "춘천고특수학급", type: "specialClassInGeneralSchool", studentCount: 16, teacherCount: 3, classCount: 2, inclusionPrograms: 1, hasBarrierFree: true, hasShuttle: false, hasInclusion: true, dx: -0.016, dy: -0.014 },
];

function regionShort(regionCode: string): string {
  const r = DEMO_REGIONS.find((x) => x.regionCode === regionCode);
  return r ? r.regionName ?? regionCode : regionCode;
}

export const schools: SchoolSummary[] = ENTRIES.map((e) => ({
  schoolId: makeSchoolId(`${e.regionCode}-${e.shortName}`),
  schoolName: `${e.shortName} (시연용)`,
  schoolType: e.type,
  region: regionRefOf(e.regionCode),
  address: `${regionShort(e.regionCode)} 시연용 주소`,
  coordinate: demoCoordinate(e.regionCode, e.dx, e.dy),

  specialEducationStudentCount: e.studentCount,
  specialEducationTeacherCount: e.teacherCount,
  specialEducationClassCount: e.classCount,
  inclusionProgramCount: e.inclusionPrograms,

  hasBarrierFreeFacility: e.hasBarrierFree,
  hasShuttleService: e.hasShuttle,
  hasInclusionProgram: e.hasInclusion,

  disabilityCategoryBreakdown: e.breakdownBase
    ? schoolBreakdown(e.breakdownBase)
    : undefined,

  meta: {
    source: "demo:학교알리미",
    datasetCategory: "B",
    sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
    collectedAt: DEMO_COLLECTED_AT,
    license: DEMO_LICENSE,
  },
}));
