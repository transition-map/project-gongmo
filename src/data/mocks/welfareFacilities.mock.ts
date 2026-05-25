/**
 * 묶음 E — WelfareFacility mock (12개).
 *
 * 분포: welfareCenter 4 + dayCareFacility 4 + vocationalRehabFacility 4.
 *
 * **본 파일이 SoT (Source of Truth).**
 * `institutions.mock.ts`에서 같은 12개를 InstitutionSummary로 매핑한다.
 * 동일 시설의 institutionId는 양쪽에서 일치해야 한다.
 */

import type { WelfareFacility } from "../../types";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_REGIONS,
  DEMO_SOURCE_UPDATED_AT,
  demoCoordinate,
  makeInstitutionId,
} from "./_shared";

interface WelfareEntry {
  regionCode: string;
  shortName: string;
  facilityType: "welfareCenter" | "dayCareFacility" | "vocationalRehabFacility";
  capacity: number;
  staffCount: number;
  servicePrograms: string[];
  /** 좌표 흐트러짐 */
  dx: number;
  dy: number;
  accessibility: string[];
}

const ENTRIES: WelfareEntry[] = [
  // welfareCenter ── 4개
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남장애인복지관", facilityType: "welfareCenter", capacity: 220, staffCount: 38, servicePrograms: ["직업적응훈련", "여가지원", "보조공학"], dx: 0.022, dy: -0.005, accessibility: ["휠체어 동선", "엘리베이터"] },
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대장애인복지관", facilityType: "welfareCenter", capacity: 180, staffCount: 32, servicePrograms: ["직업적응훈련", "사회적응훈련"], dx: -0.024, dy: 0.012, accessibility: ["휠체어 동선"] },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "영통장애인종합복지관", facilityType: "welfareCenter", capacity: 240, staffCount: 42, servicePrograms: ["직업재활", "여가지원", "가족상담"], dx: 0.018, dy: 0.022, accessibility: ["휠체어 동선", "엘리베이터", "수어통역"] },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕장애인복지관", facilityType: "welfareCenter", capacity: 150, staffCount: 28, servicePrograms: ["직업재활", "주간보호"], dx: -0.016, dy: -0.018, accessibility: ["휠체어 동선"] },

  // dayCareFacility ── 4개
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남주간이용시설", facilityType: "dayCareFacility", capacity: 60, staffCount: 14, servicePrograms: ["일상생활훈련", "여가활동"], dx: -0.020, dy: 0.018, accessibility: ["휠체어 동선"] },
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대주간이용시설", facilityType: "dayCareFacility", capacity: 50, staffCount: 12, servicePrograms: ["일상생활훈련"], dx: 0.026, dy: -0.014, accessibility: [] },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "영통주간이용시설", facilityType: "dayCareFacility", capacity: 70, staffCount: 16, servicePrograms: ["일상생활훈련", "사회적응훈련"], dx: -0.024, dy: -0.012, accessibility: ["휠체어 동선"] },
  { regionCode: "DEMO-SIGUNGU-05", shortName: "목포주간이용시설", facilityType: "dayCareFacility", capacity: 40, staffCount: 10, servicePrograms: ["일상생활훈련"], dx: 0.022, dy: 0.014, accessibility: [] },

  // vocationalRehabFacility ── 4개
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대직업재활시설", facilityType: "vocationalRehabFacility", capacity: 80, staffCount: 18, servicePrograms: ["보호작업", "근로지원"], dx: 0.018, dy: 0.024, accessibility: ["휠체어 동선"] },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕직업재활시설", facilityType: "vocationalRehabFacility", capacity: 70, staffCount: 16, servicePrograms: ["보호작업"], dx: 0.020, dy: 0.020, accessibility: [] },
  { regionCode: "DEMO-SIGUNGU-05", shortName: "목포직업재활시설", facilityType: "vocationalRehabFacility", capacity: 60, staffCount: 14, servicePrograms: ["보호작업", "근로지원"], dx: -0.018, dy: -0.022, accessibility: ["휠체어 동선"] },
  { regionCode: "DEMO-SIGUNGU-06", shortName: "춘천직업재활시설", facilityType: "vocationalRehabFacility", capacity: 50, staffCount: 12, servicePrograms: ["보호작업"], dx: 0.016, dy: -0.016, accessibility: [] },
];

function regionShort(regionCode: string): string {
  const r = DEMO_REGIONS.find((x) => x.regionCode === regionCode);
  return r ? r.regionName ?? regionCode : regionCode;
}

export const welfareFacilities: WelfareFacility[] = ENTRIES.map((e) => ({
  facilityId: makeInstitutionId(e.facilityType, `${e.regionCode}-${e.shortName}`),
  facilityName: `${e.shortName} (시연용)`,
  facilityType: e.facilityType,

  region: {
    regionCode: e.regionCode,
    regionCodeType: "sigungu",
    sigunguCode: e.regionCode,
    regionName: regionShort(e.regionCode),
  },
  address: `${regionShort(e.regionCode)} 시연용 주소`,
  coordinate: demoCoordinate(e.regionCode, e.dx, e.dy),

  capacity: e.capacity,
  staffCount: e.staffCount,
  servicePrograms: e.servicePrograms,

  accessibilityFeatures: e.accessibility,

  source: "demo:장애인복지시설현황",
  meta: {
    source: "demo:장애인복지시설현황",
    datasetCategory: "E",
    sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
    collectedAt: DEMO_COLLECTED_AT,
    license: DEMO_LICENSE,
  },
}));
