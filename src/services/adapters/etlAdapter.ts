/**
 * etlAdapter — 11-3 1차-21 frontend ETL adapter scaffold (narrow scope 5a)
 *            + 11-3 1차-26 master.real URL 전환 (Block A 해결 인프라)
 *            + 11-3 1차-28 ETL G admin_codes region 분기 (Block B partial 해결, opt-in)
 *            + 11-3 1차-32 mart.real region_summary 우선 분기 + 3단계 cascade (Block C partial
 *              화면 반영 — schoolCount 등 일부 mart field가 frontend region 흐름에 들어옴)
 *            + 11-3 1차-40 indicator.real `fetchTransitionIndexByRegion` cascade (indicator.real →
 *              mockAdapter). pre-computed indicator.real을 adapter가 읽을 수 있는 인프라 단계 —
 *              regionAdapter currentGapIndex 우선순위는 변경하지 않으므로 화면 표시 변화 0건.
 *
 * 활성화: `VITE_DATA_SOURCE=etl`. 기본값(`undefined`/`"mock"`)은 mockAdapter 유지.
 *
 * **narrow scope (1차-21 합의값 §7, 1차-26에서도 유지)**:
 * - `fetchSchoolsByRegion`만 ETL 시도.
 * - 나머지 12개 DataAdapter 함수는 `mockAdapter`로 그대로 delegate.
 * - regionService / mart / indicator / dashboard aggregate는 변경 없음.
 *
 * **ETL 연결 방식 (1차-21 합의값 §2, 1차-26 §1)**:
 * - **runtime fetch** 사용. dynamic import 금지 (build/CI 안전성 + Vite static 분석 회피).
 * - URL: `/etl-data/B/school_master.json` (1차-26 전환 — 기존 `schools.clean.json` → master).
 * - vite.config.ts의 dev middleware가 `data/master.real/B/school_master.json`을 이 URL로
 *   노출 (1차-26 §2). production build에서는 dev middleware가 동작하지 않아 fetch 404 →
 *   etlAdapter가 mockAdapter로 fallback.
 *
 * **input shape — MasterSchoolRecord (1차-26 §3)**:
 * - 1차-23 `buildSchoolMasterReal` 출력 결과. 기존 clean.real `CleanedSchoolRecord`와 다름.
 * - **regionCode 포함** — `SchoolSummary.region.regionCode`에 매핑 가능 (Block A 해결).
 * - **lat/lng 부재** — `SchoolSummary.coordinate`는 undefined.
 * - **schoolLevel / establishmentType 부재** — master record schema에 없음.
 * - schoolType은 optional이며 매핑 정책은 1차-21 그대로.
 *
 * **fallback 정책 (1차-21 §2·§4, 1차-26 §4)**:
 * - ETL fetch 실패 / 404 (`data/master.real/B/school_master.json` 부재 — 사용자가
 *   `tsx scripts/etl/runEtl.ts --mode real --stage master` 미실행 시) / JSON parse 실패 /
 *   records 빈 배열 → mockAdapter fallback.
 * - **Block B namespace 불일치** (master.real는 KOSTAT regionCode `"11680"` 등, frontend
 *   mock region은 `DEMO-SIGUNGU-*`) → filter 빈 결과 → mockAdapter fallback. 이는 1차-26에서
 *   해결되지 않음 (1차-28+ regionService ETL 전환 이후 해결).
 * - **모든 지역에 동일 ETL 학교 일괄 반환 금지** — 1차-21 정책 그대로 (지역 일관성 보존).
 *
 * **schoolType mapping (1차-21 §5, 1차-26에서도 동일)**:
 * - `"special"` → `"specialSchool"`, `"general"` → `"generalSchool"`,
 *   `"alternative"` → `"alternativeSchool"`, 그 외 / null → `"other"`.
 */

import type {
  RegionCodeType,
  RegionSummary,
  SchoolSummary,
  SchoolType,
  TransitionIndex,
} from "../../types";
import type { DataAdapter } from "../_adapter";
import { mockAdapter } from "./mockAdapter";

/**
 * 11-3 1차-26 — master.real URL. vite.config.ts dev middleware가
 * data/master.real/B/school_master.json을 이 URL로 노출.
 */
export const ETL_SCHOOLS_URL = "/etl-data/B/school_master.json";

/**
 * 11-3 1차-28 — ETL G admin_codes URL. 기존 vite middleware가 `*_master.json` 외
 * 파일을 data/clean.real/로 라우팅하므로 vite.config.ts 추가 변경 없이 작동.
 */
export const ETL_REGIONS_URL = "/etl-data/G/admin_codes.clean.json";

/**
 * 11-3 1차-32 — ETL B region_summary mart.real URL.
 * vite.config.ts dev middleware는 `.mart.json` 패턴을 data/mart.real/로 라우팅
 * (1차-32 분기 추가). cascade primary source — fetchRegions / fetchRegionByCode는
 * 이 URL을 가장 먼저 시도하고, 실패 시 admin_codes로 fallback한다.
 */
export const ETL_REGION_SUMMARY_MART_URL =
  "/etl-data/B/region_summary.mart.json";

/**
 * 11-3 1차-40 — ETL B transition_index indicator.real URL.
 * vite.config.ts dev middleware는 `.real.json` 패턴을 data/indicator.real/로 라우팅
 * (1차-40 분기 추가). `fetchTransitionIndexByRegion`이 이 URL을 fetch해 indicator.real
 * 산출물(1차-38 `runRealIndicatorStage` 결과)을 읽고, regionCode 매칭 / fetch 실패 /
 * parse 실패 / records 부재 시 `mockAdapter.fetchTransitionIndexByRegion` fallback.
 */
export const ETL_TRANSITION_INDEX_URL =
  "/etl-data/B/transition_index.real.json";

/**
 * ETL `MasterSchoolRecord` shape (scripts/etl/master/types.ts와 동기).
 * 1차-23 buildSchoolMasterReal 출력 결과. regionCode가 required.
 */
interface EtlMasterSchoolRecord {
  schoolId: string;
  neisSchoolCode?: string;
  schoolName: string;
  schoolType?: string;
  regionCode: string;
  regionCodeType: string;
  address?: string;
  sidoName?: string;
  sigunguName?: string;
}

/** ETL `MasterOutputFile<MasterSchoolRecord>` shape (scripts/etl/runEtl.ts와 일관). */
interface EtlMasterSchoolsFile {
  _meta?: unknown;
  records?: EtlMasterSchoolRecord[];
  issues?: unknown[];
}

/**
 * 11-3 1차-28 — ETL `CleanedRegionCodeRecord` shape (scripts/etl/clean/cleanRegionCodes.ts와
 * 동기). G admin_codes.clean.json 산출물의 records 항목.
 */
interface EtlAdminCodeRecord {
  regionCode: string;
  regionCodeType: string;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
}

/** ETL `CleanOutputFile<CleanedRegionCodeRecord>` shape. */
interface EtlAdminCodesFile {
  _meta?: unknown;
  records?: EtlAdminCodeRecord[];
  issues?: unknown[];
}

/**
 * 11-3 1차-32 — ETL `MartRegionSummaryRecord` shape (scripts/etl/mart/types.ts와 동기).
 * 1차-30 buildRegionSummaryMartReal 출력. regionCode 필수 + schoolCount 등 mart 집계.
 * RegionSummary에 동등 필드가 없는 specialSchoolCount/specialClassCount는 본 타입에서만
 * 표현 (mapper에서 미반영).
 */
interface EtlMartRegionRecord {
  regionCode: string;
  regionCodeType: string;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
  regionName?: string;
  schoolCount?: number;
  specialSchoolCount?: number;
  specialClassCount?: number;
  supportCenterCount?: number;
  trainingInstitutionCount?: number;
  careerExperienceCenterCount?: number;
  welfareFacilityCount?: number;
  jobPostingCount?: number;
  specialEducationStudentCount?: number;
  registeredDisabledCount?: number;
  partialRegionFlag?: boolean;
}

/** ETL `MartRealOutputFile` shape (scripts/etl/runEtl.ts와 일관). */
interface EtlMartRegionSummaryFile {
  _meta?: unknown;
  records?: EtlMartRegionRecord[];
  issues?: unknown[];
}

/**
 * 11-3 1차-40 — ETL `IndicatorRealOutputFile` shape (scripts/etl/runEtl.ts와 일관).
 * 1차-38 `runRealIndicatorStage` 산출물. `_meta.source = "real:B-transition-index"`,
 * `_meta.indicatorVersion = "mvp-v1"`, records는 `TransitionIndex[]` (각 record에
 * regionCode + indicators + indicatorVersion + calculatedAt 등).
 */
interface EtlIndicatorRealFile {
  _meta?: unknown;
  records?: TransitionIndex[];
  issues?: unknown[];
}

/**
 * ETL schoolType → frontend SchoolType 매핑 (1차-21 §5, 1차-26에서도 유지).
 * 정의 외 값 또는 null/undefined → "other" fallback.
 */
export function mapSchoolType(
  etlSchoolType: string | null | undefined,
): SchoolType {
  switch (etlSchoolType) {
    case "special":
      return "specialSchool";
    case "general":
      return "generalSchool";
    case "alternative":
      return "alternativeSchool";
    case "other":
      return "other";
    default:
      return "other";
  }
}

/**
 * master record의 sidoName/sigunguName을 RegionRef.regionName으로 derived 변환.
 * 둘 다 있으면 `"{sidoName} {sigunguName}"`, 하나라도 없으면 undefined.
 * 1차-26 §3 — "regionName은 없으면 undefined. 무리하게 hardcode하지 않는다" 정책.
 */
function deriveRegionName(
  sidoName: string | undefined,
  sigunguName: string | undefined,
): string | undefined {
  if (!sidoName || !sigunguName) return undefined;
  return `${sidoName} ${sigunguName}`;
}

/**
 * 단일 master record → SchoolSummary 매핑 (1차-26 신규).
 * - region: master record의 regionCode를 그대로 부여 (Block A 해결).
 *   regionName은 sidoName + sigunguName derived (둘 다 있으면).
 *   RegionRef의 sidoCode/sigunguCode 필드는 master record가 보유하지 않으므로 미설정.
 * - coordinate: master record에 lat/lng 없으므로 undefined (1차-26 §3).
 * - schoolType: 1차-21 mapping 정책 그대로.
 */
function mapToSchoolSummary(record: EtlMasterSchoolRecord): SchoolSummary {
  return {
    schoolId: record.schoolId,
    neisSchoolCode: record.neisSchoolCode,
    schoolName: record.schoolName,
    schoolType: mapSchoolType(record.schoolType),
    address: record.address,
    region: {
      regionCode: record.regionCode,
      regionCodeType: record.regionCodeType as RegionCodeType,
      regionName: deriveRegionName(record.sidoName, record.sigunguName),
    },
    // coordinate: undefined — master record에 lat/lng 없음 (1차-26)
  };
}

/**
 * ETL master schools 파일을 fetch + parse + map. 실패 시 null 반환 (caller가 mock fallback).
 * **dynamic import 사용 금지** — runtime fetch만.
 */
async function loadEtlSchools(): Promise<SchoolSummary[] | null> {
  try {
    const resp = await fetch(ETL_SCHOOLS_URL);
    if (!resp.ok) return null;
    const file = (await resp.json()) as EtlMasterSchoolsFile;
    if (!Array.isArray(file.records)) return null;
    return file.records.map(mapToSchoolSummary);
  } catch {
    return null;
  }
}

/**
 * 11-3 1차-28 — ETL admin_codes record → RegionSummary 매핑.
 * - regionCode / regionCodeType / sidoCode / sigunguCode 전파.
 * - regionName은 `sidoName + " " + sigunguName` derived 합성 (둘 다 있을 때만).
 * - mock의 풍부한 도메인 필드 (population / mainIssue / yearlySupport / indicators 등)는
 *   ETL admin_codes에 없으므로 undefined. 1차-30+ mart.real 도입 시 보강.
 */
function mapToRegionSummary(record: EtlAdminCodeRecord): RegionSummary {
  return {
    regionCode: record.regionCode,
    regionCodeType: record.regionCodeType as RegionCodeType,
    sidoCode: record.sidoCode,
    sigunguCode: record.sigunguCode,
    regionName: deriveRegionName(record.sidoName, record.sigunguName),
  };
}

/**
 * 11-3 1차-28 — ETL G admin_codes 파일을 fetch + parse + map. 실패 시 null 반환
 * (caller가 mockAdapter fallback). **dynamic import 사용 금지** — runtime fetch만.
 */
async function loadEtlRegions(): Promise<RegionSummary[] | null> {
  try {
    const resp = await fetch(ETL_REGIONS_URL);
    if (!resp.ok) return null;
    const file = (await resp.json()) as EtlAdminCodesFile;
    if (!Array.isArray(file.records)) return null;
    return file.records.map(mapToRegionSummary);
  } catch {
    return null;
  }
}

/**
 * 11-3 1차-32 — mart.real record → RegionSummary 매핑.
 * - regionCode / regionCodeType / sidoCode / sigunguCode 그대로 전파.
 * - regionName은 mart record가 이미 보유 (composeRegionName) — 그대로 사용. 부재 시
 *   sidoName+sigunguName derived fallback.
 * - **schoolCount / supportCenterCount / partialRegionFlag** 전파 — Block C partial
 *   화면 반영 핵심.
 * - specialEducationStudentCount / registeredDisabledCount: mart record가 보유 가능
 *   (미래 A 도메인 도입 시), 현재는 보통 undefined → 그대로 전파.
 * - **specialSchoolCount / specialClassCount**: RegionSummary에 동등 필드 없음 → 미반영
 *   (1차-32 사용자 합의값 §5 — 무리한 hardcode 금지).
 * - **mainIssue / policyUse / teacherUse / yearlySupport / indicators / population 등**:
 *   mart.real에 없음 → undefined (frontend에서 mock fallback 등 별도 처리).
 */
function mapMartToRegionSummary(record: EtlMartRegionRecord): RegionSummary {
  return {
    regionCode: record.regionCode,
    regionCodeType: record.regionCodeType as RegionCodeType,
    sidoCode: record.sidoCode,
    sigunguCode: record.sigunguCode,
    regionName:
      record.regionName ?? deriveRegionName(record.sidoName, record.sigunguName),
    schoolCount: record.schoolCount,
    specialEducationStudentCount: record.specialEducationStudentCount,
    registeredDisabledCount: record.registeredDisabledCount,
    partialRegionFlag: record.partialRegionFlag,
  };
}

/**
 * 11-3 1차-32 — ETL B region_summary mart.real 파일을 fetch + parse + map. 실패 시
 * null 반환 (caller가 admin_codes fallback). **dynamic import 사용 금지** — runtime fetch만.
 */
async function loadEtlMartRegions(): Promise<RegionSummary[] | null> {
  try {
    const resp = await fetch(ETL_REGION_SUMMARY_MART_URL);
    if (!resp.ok) return null;
    const file = (await resp.json()) as EtlMartRegionSummaryFile;
    if (!Array.isArray(file.records) || file.records.length === 0) return null;
    return file.records.map(mapMartToRegionSummary);
  } catch {
    return null;
  }
}

/**
 * 11-3 1차-40 — ETL B transition_index indicator.real 파일을 fetch + parse. 실패 시
 * null 반환 (caller가 mockAdapter fallback). **dynamic import 사용 금지** — runtime fetch만.
 *
 * TransitionIndex shape는 ETL 산출물(1차-38 `IndicatorRealOutputFile`)이 src/types의
 * `TransitionIndex`를 직접 사용하므로 별도 mapper 불필요. records를 그대로 반환.
 * regionCode 필터링은 caller(`fetchTransitionIndexByRegion`)가 수행.
 */
async function loadEtlTransitionIndexes(): Promise<TransitionIndex[] | null> {
  try {
    const resp = await fetch(ETL_TRANSITION_INDEX_URL);
    if (!resp.ok) return null;
    const file = (await resp.json()) as EtlIndicatorRealFile;
    if (!Array.isArray(file.records) || file.records.length === 0) return null;
    return file.records;
  } catch {
    return null;
  }
}

/**
 * etlAdapter — narrow scope: `fetchSchoolsByRegion`만 ETL 시도, 나머지 12개는
 * mockAdapter delegate.
 */
export const etlAdapter: DataAdapter = {
  // ─── ETL 시도 (단 1개) ────────────────────────────────────────────────────
  async fetchSchoolsByRegion(regionCode) {
    const etlSchools = await loadEtlSchools();
    if (etlSchools === null) {
      // fetch / parse 실패 / records 부재 → mock fallback
      return mockAdapter.fetchSchoolsByRegion(regionCode);
    }
    // 1차-26: master record는 regionCode를 보유하므로 region filter가 정상 작동한다.
    // 단, Block B (KOSTAT vs DEMO-SIGUNGU-* namespace 불일치)로 인해 호출자가 mock
    // namespace의 regionCode를 전달하면 filter 빈 결과 → mockAdapter fallback.
    const filtered = etlSchools.filter(
      (s) => s.region?.regionCode === regionCode,
    );
    if (filtered.length === 0) {
      return mockAdapter.fetchSchoolsByRegion(regionCode);
    }
    return filtered;
  },

  // ─── 12개 delegate (narrow scope guard) ──────────────────────────────────
  // ─── 11-3 1차-32 — mart.real → admin_codes → mock 3단계 cascade ─────────
  // primary: mart.real (1차-30 산출) — schoolCount 등 mart field 보유
  // secondary: admin_codes (1차-28 그대로) — KOSTAT region 식별·라벨만
  // final: mockAdapter — VITE_DATA_SOURCE 미설정 / 둘 다 부재 / parse 실패 시
  async fetchRegions() {
    const martRegions = await loadEtlMartRegions();
    if (martRegions !== null) return martRegions;
    const adminRegions = await loadEtlRegions();
    if (adminRegions !== null && adminRegions.length > 0) return adminRegions;
    return mockAdapter.fetchRegions();
  },

  async fetchRegionByCode(regionCode) {
    // 1단계: mart.real에서 매칭 시도 (schoolCount 등 포함)
    const martRegions = await loadEtlMartRegions();
    if (martRegions !== null) {
      const martMatch = martRegions.find((r) => r.regionCode === regionCode);
      if (martMatch) return martMatch;
    }
    // 2단계: admin_codes에서 매칭 시도 (1차-28 그대로 — schoolCount 없음)
    const adminRegions = await loadEtlRegions();
    if (adminRegions !== null) {
      const adminMatch = adminRegions.find((r) => r.regionCode === regionCode);
      if (adminMatch) return adminMatch;
    }
    // 3단계: mockAdapter.fetchRegionByCode fallback
    // ETL 모두 미일치 (DEMO-SIGUNGU-* 등) → mock에서 찾기. KOSTAT regionCode가
    // mock에 없으면 mockAdapter가 자연스럽게 undefined 반환.
    // **DEMO ↔ KOSTAT hardcoded mapping 미도입** (1차-28 정책 그대로 유지).
    return mockAdapter.fetchRegionByCode(regionCode);
  },
  fetchInstitutionsByRegion: mockAdapter.fetchInstitutionsByRegion.bind(
    mockAdapter,
  ),
  fetchInstitutionsByType: mockAdapter.fetchInstitutionsByType.bind(
    mockAdapter,
  ),
  fetchTrainingProgramsByRegion: mockAdapter.fetchTrainingProgramsByRegion.bind(
    mockAdapter,
  ),
  fetchCareerExperienceProgramsByRegion:
    mockAdapter.fetchCareerExperienceProgramsByRegion.bind(mockAdapter),
  fetchJobPostingsByRegion: mockAdapter.fetchJobPostingsByRegion.bind(
    mockAdapter,
  ),
  fetchEmploymentOutcomeByRegion:
    mockAdapter.fetchEmploymentOutcomeByRegion.bind(mockAdapter),
  fetchWelfareFacilitiesByRegion:
    mockAdapter.fetchWelfareFacilitiesByRegion.bind(mockAdapter),
  fetchMobilityAccessByRegion: mockAdapter.fetchMobilityAccessByRegion.bind(
    mockAdapter,
  ),

  // ─── 11-3 1차-40 — indicator.real → mock 2단계 cascade ───────────────────
  // primary: indicator.real (1차-38 산출) — pre-computed mvp-v1 TransitionIndex
  // final: mockAdapter — VITE_DATA_SOURCE 미설정 / 파일 부재 / 매칭 실패 시
  //
  // 화면 표시 정책 변경 0건 — regionAdapter currentGapIndex 우선순위(`calculatedTransitionIndex`
  // 1순위)는 그대로. demoTransitionIndex(transitionIndexService 결과)는 현재 regionAdapter에서
  // `void`로 폐기되므로 1차-40 단독 화면 회귀 0. 표시 정책은 1차-42+ 별도 합의.
  //
  // DEMO-SIGUNGU-* ↔ KOSTAT hardcoded mapping 미도입 — indicator.real records가 KOSTAT
  // regionCode이므로 DEMO-SIGUNGU-* 호출 시 자연 미일치 → mockAdapter fallback.
  async fetchTransitionIndexByRegion(regionCode) {
    const etlIndexes = await loadEtlTransitionIndexes();
    if (etlIndexes !== null) {
      const match = etlIndexes.find((t) => t.regionCode === regionCode);
      if (match) return match;
    }
    return mockAdapter.fetchTransitionIndexByRegion(regionCode);
  },
  fetchRecommendationsByRegion: mockAdapter.fetchRecommendationsByRegion.bind(
    mockAdapter,
  ),
};
