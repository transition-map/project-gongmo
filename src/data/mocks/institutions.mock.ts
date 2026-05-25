/**
 * InstitutionSummary mock (32개).
 *
 * 분포:
 *  - supportCenter           6  (시군구별 1)
 *  - trainingCenter          4  (4개 시군구)
 *  - careerExperienceCenter  4  (4개 시군구)
 *  - welfareCenter           4  ← welfareFacilities.mock.ts SoT 매핑
 *  - dayCareFacility         4  ← welfareFacilities.mock.ts SoT 매핑
 *  - vocationalRehabFacility 4  ← welfareFacilities.mock.ts SoT 매핑
 *  - mobilityCenter          3
 *  - employer                3
 *
 * welfare 12개는 `welfareFacilities`를 매핑해 institutionId·이름·좌표·regionCode가
 * 양쪽에서 자동 일치한다.
 */

import type { InstitutionSummary, InstitutionType } from "../../types";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_REGIONS,
  DEMO_SOURCE_UPDATED_AT,
  demoCoordinate,
  makeInstitutionId,
  regionRefOf,
} from "./_shared";
import { welfareFacilities } from "./welfareFacilities.mock";

interface InstitutionEntry {
  regionCode: string;
  shortName: string;
  institutionType: InstitutionType;
  programCount?: number;
  capacity?: number;
  staffCount?: number;
  phone?: string;
  website?: string;
  accessibility?: string[];
  dx: number;
  dy: number;
}

function regionShort(regionCode: string): string {
  const r = DEMO_REGIONS.find((x) => x.regionCode === regionCode);
  return r ? r.regionName ?? regionCode : regionCode;
}

// ─── welfare 12개를 InstitutionSummary로 매핑 ─────────────────────────────
const welfareInstitutions: InstitutionSummary[] = welfareFacilities.map(
  (w) => ({
    institutionId: w.facilityId, // 일치
    institutionType: w.facilityType as InstitutionType,
    institutionName: w.facilityName, // 일치
    region: w.region,
    address: w.address,
    coordinate: w.coordinate,
    programCount: w.servicePrograms?.length,
    capacity: w.capacity,
    staffCount: w.staffCount,
    phone: w.phone,
    website: w.website,
    accessibilityFeatures: w.accessibilityFeatures,
    source: w.source,
    meta: w.meta,
  }),
);

// ─── 나머지 20개 ──────────────────────────────────────────────────────────
const NON_WELFARE_ENTRIES: InstitutionEntry[] = [
  // supportCenter ─ 6개 (시군구별 1)
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남특수교육지원센터", institutionType: "supportCenter", programCount: 8, staffCount: 12, phone: "02-0000-0001", accessibility: ["휠체어 동선"], dx: 0.005, dy: 0.018 },
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대특수교육지원센터", institutionType: "supportCenter", programCount: 6, staffCount: 10, phone: "051-000-0001", accessibility: ["휠체어 동선"], dx: 0.014, dy: 0.018 },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "수원영통특수교육지원센터", institutionType: "supportCenter", programCount: 7, staffCount: 11, phone: "031-000-0001", accessibility: ["휠체어 동선", "엘리베이터"], dx: -0.016, dy: -0.012 },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "청주흥덕특수교육지원센터", institutionType: "supportCenter", programCount: 5, staffCount: 8, phone: "043-000-0001", accessibility: [], dx: 0.012, dy: -0.020 },
  { regionCode: "DEMO-SIGUNGU-05", shortName: "목포특수교육지원센터", institutionType: "supportCenter", programCount: 4, staffCount: 7, phone: "061-000-0001", accessibility: ["휠체어 동선"], dx: -0.014, dy: 0.014 },
  { regionCode: "DEMO-SIGUNGU-06", shortName: "춘천특수교육지원센터", institutionType: "supportCenter", programCount: 5, staffCount: 8, phone: "033-000-0001", accessibility: [], dx: -0.012, dy: 0.020 },

  // trainingCenter ─ 4개 (4개 시군구)
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남발달장애인훈련센터", institutionType: "trainingCenter", programCount: 6, capacity: 80, staffCount: 14, accessibility: ["휠체어 동선", "엘리베이터"], dx: -0.024, dy: 0.006 },
  { regionCode: "DEMO-SIGUNGU-02", shortName: "해운대장애인민간훈련기관", institutionType: "trainingCenter", programCount: 4, capacity: 60, staffCount: 10, accessibility: ["휠체어 동선"], dx: -0.018, dy: -0.020 },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "수원영통HRD훈련기관", institutionType: "trainingCenter", programCount: 5, capacity: 70, staffCount: 12, accessibility: ["휠체어 동선"], dx: 0.024, dy: -0.014 },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕HRD훈련기관", institutionType: "trainingCenter", programCount: 3, capacity: 50, staffCount: 8, accessibility: [], dx: -0.022, dy: 0.018 },

  // careerExperienceCenter ─ 4개
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남꿈길진로체험처", institutionType: "careerExperienceCenter", programCount: 8, accessibility: ["휠체어 동선"], dx: 0.030, dy: -0.010 },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "수원영통꿈길진로체험처", institutionType: "careerExperienceCenter", programCount: 6, accessibility: ["휠체어 동선"], dx: -0.030, dy: 0.020 },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕꿈길진로체험처", institutionType: "careerExperienceCenter", programCount: 4, accessibility: [], dx: 0.025, dy: 0.025 },
  { regionCode: "DEMO-SIGUNGU-06", shortName: "춘천꿈길진로체험처", institutionType: "careerExperienceCenter", programCount: 5, accessibility: ["휠체어 동선"], dx: -0.025, dy: -0.018 },

  // mobilityCenter ─ 3개
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남교통약자이동지원센터", institutionType: "mobilityCenter", programCount: 0, staffCount: 22, accessibility: ["저상버스", "특별교통수단"], dx: -0.030, dy: 0.022 },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "수원영통교통약자이동지원센터", institutionType: "mobilityCenter", programCount: 0, staffCount: 18, accessibility: ["저상버스", "특별교통수단"], dx: 0.028, dy: 0.026 },
  { regionCode: "DEMO-SIGUNGU-05", shortName: "목포교통약자이동지원센터", institutionType: "mobilityCenter", programCount: 0, staffCount: 12, accessibility: ["특별교통수단"], dx: 0.024, dy: -0.022 },

  // employer ─ 3개
  { regionCode: "DEMO-SIGUNGU-01", shortName: "강남시연사업장A", institutionType: "employer", staffCount: 120, accessibility: ["휠체어 동선", "엘리베이터", "재택근무"], dx: 0.034, dy: 0.014 },
  { regionCode: "DEMO-SIGUNGU-03", shortName: "수원영통시연사업장B", institutionType: "employer", staffCount: 85, accessibility: ["엘리베이터"], dx: -0.034, dy: -0.018 },
  { regionCode: "DEMO-SIGUNGU-04", shortName: "흥덕시연사업장C", institutionType: "employer", staffCount: 60, accessibility: ["휠체어 동선"], dx: 0.030, dy: -0.030 },
];

function categoryOf(type: InstitutionType): "B" | "C" | "D" | "F" {
  if (type === "supportCenter") return "B";
  if (type === "trainingCenter" || type === "careerExperienceCenter") return "C";
  if (type === "employer") return "D";
  return "F"; // mobilityCenter
}

function sourceOf(type: InstitutionType): string {
  switch (type) {
    case "supportCenter":
      return "demo:특수교육지원센터";
    case "trainingCenter":
      return "demo:HRD-Net";
    case "careerExperienceCenter":
      return "demo:꿈길";
    case "mobilityCenter":
      return "demo:교통약자이동지원센터";
    case "employer":
      return "demo:장애인구인정보";
    default:
      return "demo:장애인복지시설현황";
  }
}

const nonWelfareInstitutions: InstitutionSummary[] = NON_WELFARE_ENTRIES.map(
  (e) => ({
    institutionId: makeInstitutionId(
      e.institutionType,
      `${e.regionCode}-${e.shortName}`,
    ),
    institutionType: e.institutionType,
    institutionName: `${e.shortName} (시연용)`,

    region: regionRefOf(e.regionCode),
    address: `${regionShort(e.regionCode)} 시연용 주소`,
    coordinate: demoCoordinate(e.regionCode, e.dx, e.dy),

    phone: e.phone,
    website: e.website,
    programCount: e.programCount,
    capacity: e.capacity,
    staffCount: e.staffCount,
    accessibilityFeatures: e.accessibility,

    source: sourceOf(e.institutionType),
    meta: {
      source: sourceOf(e.institutionType),
      datasetCategory: categoryOf(e.institutionType),
      sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
      collectedAt: DEMO_COLLECTED_AT,
      license: DEMO_LICENSE,
    },
  }),
);

export const institutions: InstitutionSummary[] = [
  ...welfareInstitutions, // 12
  ...nonWelfareInstitutions, // 20
];
