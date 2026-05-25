/**
 * 11-1 2차 master 단계 — 6개 clean 산출물 record를 결합해 4개 master record array를 만든다.
 *
 * **Pure function** — fs/path 등 Node API에 의존하지 않는다. 호출자(runEtl)가
 * readJson/writeJson을 통해 입출력을 처리한다. 이 함수는 입력 record array만 받고
 * 결과 객체만 반환한다.
 *
 * **데이터 게이트**: region master는 `/^\d{5}$/` 정규식을 만족하는 regionCode만
 * 포함한다. 그 외(예: "ABCD", "INVALID", 빈 문자열)는 issue로 보고하고 master에
 * 진입시키지 않는다. 후속 단계(mart, indicator)로 비정상 코드가 흘러가지 않게
 * 차단하는 역할을 한다.
 *
 * IssueCollector 콜백 패턴을 사용해 부수효과 없이 issue를 누적한다.
 */

import type { DataQualityIssue, IssueCollector } from "../../../src/lib/etl/types";
import type { CleanedDisabledPopulationRecord } from "../clean/cleanDisabledPopulation";
import type { CleanedGeocodingRecord } from "../clean/cleanGeocoding";
import type { CleanedLegalDongRecord } from "../clean/cleanLegalDongCodes";
import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";
import type { CleanedSchoolBasicRecord } from "../clean/cleanSchoolBasic";
import type { CleanedSpecialEducationRecord } from "../clean/cleanSpecialEducation";
import type { CleanedSupportCenterRecord } from "../clean/cleanSupportCenter";
import type {
  MasterAdminCodeRecord,
  MasterAdminLegalDongCrossrefRecord,
  MasterBuildResult,
  MasterDemandRecord,
  MasterLegalDongRecord,
  MasterRegionRecord,
  MasterSchoolRecord,
  MasterSupportCenterRecord,
} from "./types";

/** 5자리 숫자 sigunguCode 게이트 정규식. */
const SIGUNGU_CODE_PATTERN = /^\d{5}$/;

/**
 * buildMaster 입력 — 8개 clean 산출물의 record array.
 *
 * 11-2 1차-4: `legalDongCodeRecords` required 추가.
 * 11-2 1차-5: `adminCodeRecords` required 추가 (admin_codes CSV의 cleanRegionCodes 결과).
 *
 * runEtl과 `loadBuildMasterInputFromFixtures`가 모두 명시 전달한다 (default 미사용).
 */
export interface BuildMasterInput {
  regionCodeRecords: CleanedRegionCodeRecord[];
  geocodingRecords: CleanedGeocodingRecord[];
  specialEducationRecords: CleanedSpecialEducationRecord[];
  disabledPopulationRecords: CleanedDisabledPopulationRecord[];
  schoolBasicRecords: CleanedSchoolBasicRecord[];
  supportCenterRecords: CleanedSupportCenterRecord[];
  legalDongCodeRecords: CleanedLegalDongRecord[];
  adminCodeRecords: CleanedRegionCodeRecord[];
}

/**
 * clean 산출물을 결합해 master 단계 결과를 만든다.
 * 호출자가 입력 array를 직접 주입한다 (file I/O는 호출자 책임).
 */
export function buildMaster(input: BuildMasterInput): MasterBuildResult {
  const issues: DataQualityIssue[] = [];
  const collect: IssueCollector = (issue) => issues.push(issue);

  // 11-2 1차-9 Option B + Policy A 흐름:
  //   1) buildRegionMaster로 JSON 기반 6건 생성
  //   2) unionAdminOnlyIntoRegionMaster로 admin-only 4건 흡수 → final 10건
  //   3) finalValidRegionCodes(10건) 기준으로 모든 후속 빌더 호출
  //      → adminCodeMaster.matchedRegionMaster 모두 true (Policy A)
  //      → legalDongMaster.matchedSigunguRegion 모두 true (Policy A)
  //      → demand/school/supportCenter는 fixture 보유 sigungu만 그대로 매칭됨

  const baseRegion = buildRegionMaster(
    input.regionCodeRecords,
    input.geocodingRecords,
    collect,
  );
  const regionMaster = unionAdminOnlyIntoRegionMaster(
    baseRegion,
    input.adminCodeRecords,
  );
  const validRegionCodes = new Set(regionMaster.map((r) => r.regionCode));

  const demandMaster = buildDemandMaster(
    input.specialEducationRecords,
    input.disabledPopulationRecords,
    validRegionCodes,
    collect,
  );

  const schoolMaster = buildSchoolMaster(
    input.schoolBasicRecords,
    validRegionCodes,
    collect,
  );

  const supportCenterMaster = buildSupportCenterMaster(
    input.supportCenterRecords,
    validRegionCodes,
    collect,
  );

  const legalDongMaster = buildLegalDongMaster(
    input.legalDongCodeRecords,
    validRegionCodes,
    collect,
  );

  const adminCodeMaster = buildAdminCodeMaster(
    input.adminCodeRecords,
    validRegionCodes,
    collect,
  );

  // 11-2 1차-7 — admin × legalDong cross-reference (final region 기준).
  const adminLegalDongCrossref = buildAdminLegalDongCrossref(
    regionMaster,
    adminCodeMaster,
    legalDongMaster,
    collect,
  );

  return {
    regionMaster,
    demandMaster,
    schoolMaster,
    supportCenterMaster,
    legalDongMaster,
    adminCodeMaster,
    adminLegalDongCrossref,
    issues,
  };
}

// ─── 11-2 1차-9 — admin-union helper ───────────────────────────────────────
/**
 * JSON fixture 기반 region master 6건에 admin_code_master의 admin-only 4건을
 * union해 final region master를 만든다.
 *
 * - 기존 6건: `source: "json-fixture"` 부여.
 * - 신규 admin-only N건: `source: "admin-union"`, `coordinate: undefined`,
 *   sidoCode/sigunguCode/sidoName/sigunguName는 admin_code_master clean record에서
 *   그대로 복사.
 * - 정렬: 최종 array를 sigunguCode ascending으로 정렬.
 * - 입력은 cleanRegionCodes의 결과(CleanedRegionCodeRecord[])이지 buildAdminCodeMaster
 *   결과가 아님 → 순환 의존 회피.
 */
function unionAdminOnlyIntoRegionMaster(
  baseRegion: MasterRegionRecord[],
  adminCodeRecords: CleanedRegionCodeRecord[],
): MasterRegionRecord[] {
  const existing = new Set(baseRegion.map((r) => r.regionCode));
  const baseWithSource: MasterRegionRecord[] = baseRegion.map((r) => ({
    ...r,
    source: "json-fixture" as const,
  }));
  const newAdminOnly: MasterRegionRecord[] = adminCodeRecords
    .filter((a) => !existing.has(a.regionCode))
    .map((a) => ({
      regionCode: a.regionCode,
      regionCodeType: a.regionCodeType,
      sidoCode: a.sidoCode,
      sigunguCode: a.sigunguCode,
      sidoName: a.sidoName,
      sigunguName: a.sigunguName,
      coordinate: undefined,
      source: "admin-union" as const,
    }));
  return [...baseWithSource, ...newAdminOnly].sort((x, y) =>
    x.regionCode.localeCompare(y.regionCode),
  );
}

// ─── region master ────────────────────────────────────────────────────────
/**
 * 5자리 sigunguCode만 통과시키고, sigunguName 단순 일치로 geocoding 결합.
 * fuzzy match는 사용하지 않는다.
 */
function buildRegionMaster(
  regions: CleanedRegionCodeRecord[],
  geocodings: CleanedGeocodingRecord[],
  collect: IssueCollector,
): MasterRegionRecord[] {
  // sigunguName → 첫 매칭 geocoding (verified만)
  const geoLookup = new Map<string, CleanedGeocodingRecord>();
  for (const g of geocodings) {
    const name = g.sigunguName;
    if (!name || name.length === 0) continue;
    if (g.coordinate.geocodingStatus !== "verified") continue;
    if (!geoLookup.has(name)) {
      geoLookup.set(name, g);
    }
  }

  const result: MasterRegionRecord[] = [];

  for (const r of regions) {
    if (!SIGUNGU_CODE_PATTERN.test(r.regionCode)) {
      collect({
        severity: "warning",
        datasetCategory: "G",
        field: "regionCode",
        message:
          "regionCode is not a 5-digit sigungu code; excluded from region master",
      });
      continue;
    }

    const geo = r.sigunguName ? geoLookup.get(r.sigunguName) : undefined;
    if (r.sigunguName && !geo) {
      collect({
        severity: "info",
        datasetCategory: "G",
        field: "geocoding",
        message: "no verified geocoding match for sigunguName in region master",
      });
    }

    result.push({
      regionCode: r.regionCode,
      regionCodeType: r.regionCodeType,
      sidoCode: r.sidoCode,
      sigunguCode: r.sigunguCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      coordinate: geo?.coordinate,
    });
  }

  return result;
}

// ─── demand master ────────────────────────────────────────────────────────
/**
 * special_education + disabled_population의 outer join.
 * 둘 중 한쪽만 있는 regionCode는 partialDemand issue (info).
 * region master에 없는 regionCode는 unmatchedRegion issue (warning) + 제외.
 */
function buildDemandMaster(
  specialEducation: CleanedSpecialEducationRecord[],
  disabledPopulation: CleanedDisabledPopulationRecord[],
  validRegionCodes: Set<string>,
  collect: IssueCollector,
): MasterDemandRecord[] {
  const map = new Map<string, MasterDemandRecord>();

  for (const r of specialEducation) {
    if (!validRegionCodes.has(r.regionCode)) {
      collect({
        severity: "warning",
        datasetCategory: "A",
        field: "regionCode",
        message:
          "specialEducation regionCode not present in region master; excluded from demand master",
      });
      continue;
    }
    const existing = map.get(r.regionCode);
    if (existing) {
      existing.specialEducationStudentCount = r.specialEducationStudentCount;
      existing.year = r.year ?? existing.year;
    } else {
      map.set(r.regionCode, {
        regionCode: r.regionCode,
        regionCodeType: r.regionCodeType,
        specialEducationStudentCount: r.specialEducationStudentCount,
        year: r.year,
      });
    }
  }

  for (const r of disabledPopulation) {
    if (!validRegionCodes.has(r.regionCode)) {
      collect({
        severity: "warning",
        datasetCategory: "A",
        field: "regionCode",
        message:
          "disabledPopulation regionCode not present in region master; excluded from demand master",
      });
      continue;
    }
    const existing = map.get(r.regionCode);
    if (existing) {
      existing.registeredDisabledCount = r.registeredDisabledCount;
      existing.year = r.year ?? existing.year;
    } else {
      map.set(r.regionCode, {
        regionCode: r.regionCode,
        regionCodeType: r.regionCodeType,
        registeredDisabledCount: r.registeredDisabledCount,
        year: r.year,
      });
    }
  }

  const result = Array.from(map.values());
  for (const r of result) {
    if (
      r.specialEducationStudentCount === undefined ||
      r.registeredDisabledCount === undefined
    ) {
      collect({
        severity: "info",
        datasetCategory: "A",
        field: "partialDemand",
        message:
          "regionCode has only one of (specialEducation, disabledPopulation) sources",
      });
    }
  }
  return result;
}

// ─── school master ────────────────────────────────────────────────────────
function buildSchoolMaster(
  schools: CleanedSchoolBasicRecord[],
  validRegionCodes: Set<string>,
  collect: IssueCollector,
): MasterSchoolRecord[] {
  const result: MasterSchoolRecord[] = [];

  for (const r of schools) {
    if (!validRegionCodes.has(r.regionCode)) {
      collect({
        severity: "warning",
        datasetCategory: "B",
        field: "regionCode",
        message:
          "school regionCode not present in region master; excluded from school master",
      });
      continue;
    }
    if (!r.schoolName || r.schoolName.trim().length === 0) {
      collect({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolName",
        message: "school with empty schoolName excluded from school master",
      });
      continue;
    }
    result.push({
      schoolId: r.schoolId,
      neisSchoolCode: r.neisSchoolCode,
      schoolName: r.schoolName,
      schoolType: r.schoolType,
      regionCode: r.regionCode,
      regionCodeType: r.regionCodeType,
      address: r.address,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
    });
  }

  return result;
}

// ─── support center master ────────────────────────────────────────────────
function buildSupportCenterMaster(
  centers: CleanedSupportCenterRecord[],
  validRegionCodes: Set<string>,
  collect: IssueCollector,
): MasterSupportCenterRecord[] {
  const result: MasterSupportCenterRecord[] = [];

  for (const r of centers) {
    if (!validRegionCodes.has(r.regionCode)) {
      collect({
        severity: "warning",
        datasetCategory: "B",
        field: "regionCode",
        message:
          "supportCenter regionCode not present in region master; excluded",
      });
      continue;
    }
    if (!r.institutionName || r.institutionName.trim().length === 0) {
      collect({
        severity: "warning",
        datasetCategory: "B",
        field: "institutionName",
        message: "supportCenter with empty institutionName excluded",
      });
      continue;
    }
    result.push({
      institutionId: r.institutionId,
      institutionType: "supportCenter",
      institutionName: r.institutionName,
      regionCode: r.regionCode,
      regionCodeType: r.regionCodeType,
      address: r.address,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
    });
  }

  return result;
}

// ─── legal dong master (11-2 1차-4) ───────────────────────────────────────
/**
 * legalDong 5건을 그대로 dimension table로 보존하면서, sigunguCode가 region
 * master(JSON fixture 기반)에 매칭되는지 검증한다.
 *
 * - 모든 record는 `matchedSigunguRegion: boolean`을 포함한다.
 * - 미매칭(false)인 경우 `info / G / sigunguCode` issue 1건씩 보고 (메시지에
 *   "legalDong" 키워드 포함 — runEtl의 issue 분리 식별에 사용).
 * - records는 필터링하지 않는다 (dimension table 원칙).
 *
 * cleanLegalDongCodes의 결과는 sigunguCode/legalDongCode가 optional이지만
 * 정상 fixture에서는 모두 채워져 있다. 부재 시 legalDongCode.slice(0, 5)로
 * fallback한다 (방어적).
 */
function buildLegalDongMaster(
  legalDongs: CleanedLegalDongRecord[],
  validRegionCodes: Set<string>,
  collect: IssueCollector,
): MasterLegalDongRecord[] {
  const result: MasterLegalDongRecord[] = [];

  for (const r of legalDongs) {
    const legalDongCode = r.legalDongCode ?? r.regionCode;
    const sigunguCode = r.sigunguCode ?? legalDongCode.slice(0, 5);
    const matched = validRegionCodes.has(sigunguCode);

    if (!matched) {
      collect({
        severity: "info",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `legalDong sigunguCode '${sigunguCode}' not present in region master`,
      });
    }

    result.push({
      legalDongCode,
      regionCode: r.regionCode,
      regionCodeType: "legalDong",
      sidoCode: r.sidoCode,
      sigunguCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      emdName: r.emdName,
      matchedSigunguRegion: matched,
    });
  }

  return result;
}

// ─── admin code master (11-2 1차-5) ───────────────────────────────────────
/**
 * admin_codes(CSV 시군구 5자리) 5건을 그대로 dimension table로 보존하면서,
 * regionCode(=sigunguCode)가 region master(JSON fixture 기반)에 매칭되는지
 * 검증한다.
 *
 * - 모든 record는 `matchedRegionMaster: boolean`을 포함한다.
 * - 미매칭(false)인 경우 `info / G / sigunguCode` issue 1건씩 보고 (메시지에
 *   "adminCode" 키워드 포함 — runEtl의 issue 분리 식별에 사용).
 * - records는 필터링하지 않는다 (dimension table 원칙).
 *
 * cleanRegionCodes 결과 record의 sigunguCode는 optional이지만 정상 mini fixture
 * 에서는 모두 채워져 있다 (regionCode와 동일 값). 부재 시 regionCode로 fallback.
 */
function buildAdminCodeMaster(
  adminCodes: CleanedRegionCodeRecord[],
  validRegionCodes: Set<string>,
  collect: IssueCollector,
): MasterAdminCodeRecord[] {
  const result: MasterAdminCodeRecord[] = [];

  for (const r of adminCodes) {
    const matchKey = r.sigunguCode ?? r.regionCode;
    const matched = validRegionCodes.has(matchKey);

    if (!matched) {
      collect({
        severity: "info",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `adminCode sigunguCode '${matchKey}' not present in region master`,
      });
    }

    result.push({
      regionCode: r.regionCode,
      regionCodeType: r.regionCodeType,
      sidoCode: r.sidoCode,
      sigunguCode: r.sigunguCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      matchedRegionMaster: matched,
    });
  }

  return result;
}

// ─── admin × legalDong cross-reference (11-2 1차-7) ────────────────────────
/**
 * region_master / admin_code_master / legal_dong_master 세 master가 공유하는
 * sigunguCode 집합을 union해 cross-reference quality artifact를 생성한다.
 *
 * 입력: clean records가 아닌 **이미 만들어진 master records** (1차-4/1차-5 빌더와의
 * 차이점). 따라서 호출 순서는 region/admin/legalDong 빌더 후.
 *
 * 산출 records:
 * - sigunguCode union of (regionMaster ∪ adminCodeMaster ∪ legalDongMaster.distinct).
 * - 각 record는 inRegionMaster/inAdminCodeMaster/inLegalDongMaster boolean과
 *   legalDongRecordCount(legalDongMaster에서 같은 sigunguCode의 row 개수)를 보유.
 * - 정렬: sigunguCode ascending (결정성·재현성 우선).
 *
 * 산출 issues (1차-4/1차-5와 중복되지 않는 NEW 관계만 보고):
 * - admin-only orphan (admin=true, legalDong=false): info / G / "crossref"
 * - region-only (region=true, admin=false, legalDong=false): info / G / "crossref"
 * - 모든 message에 "crossref" 키워드 포함.
 *
 * mart/indicator로 흘러가지 않는다 (1차-7 Option B: derived quality artifact only).
 */
function buildAdminLegalDongCrossref(
  regionMaster: MasterRegionRecord[],
  adminCodeMaster: MasterAdminCodeRecord[],
  legalDongMaster: MasterLegalDongRecord[],
  collect: IssueCollector,
): MasterAdminLegalDongCrossrefRecord[] {
  const regionSet = new Set(regionMaster.map((r) => r.regionCode));
  const adminSet = new Set(adminCodeMaster.map((r) => r.regionCode));
  const legalDongSet = new Set(legalDongMaster.map((r) => r.sigunguCode));

  // legalDong record count by sigunguCode
  const legalDongCountBySigungu = new Map<string, number>();
  for (const r of legalDongMaster) {
    legalDongCountBySigungu.set(
      r.sigunguCode,
      (legalDongCountBySigungu.get(r.sigunguCode) ?? 0) + 1,
    );
  }

  // sigunguCode union
  const unionSet = new Set<string>([
    ...regionSet,
    ...adminSet,
    ...legalDongSet,
  ]);
  const sortedUnion = Array.from(unionSet).sort((a, b) => a.localeCompare(b));

  const result: MasterAdminLegalDongCrossrefRecord[] = [];

  for (const sigunguCode of sortedUnion) {
    const inRegionMaster = regionSet.has(sigunguCode);
    const inAdminCodeMaster = adminSet.has(sigunguCode);
    const inLegalDongMaster = legalDongSet.has(sigunguCode);
    const legalDongRecordCount = legalDongCountBySigungu.get(sigunguCode) ?? 0;

    // issue 1: admin-only orphan (admin=true, legalDong=false)
    if (inAdminCodeMaster && !inLegalDongMaster) {
      collect({
        severity: "info",
        datasetCategory: "G",
        field: "crossref",
        message: `adminCode ${sigunguCode} has no legalDong sibling in crossref`,
      });
    }

    // issue 2: region-only (region=true, admin=false, legalDong=false)
    if (inRegionMaster && !inAdminCodeMaster && !inLegalDongMaster) {
      collect({
        severity: "info",
        datasetCategory: "G",
        field: "crossref",
        message: `regionMaster ${sigunguCode} has no adminCode/legalDong coverage in crossref`,
      });
    }

    result.push({
      sigunguCode,
      inRegionMaster,
      inAdminCodeMaster,
      inLegalDongMaster,
      legalDongRecordCount,
    });
  }

  return result;
}
