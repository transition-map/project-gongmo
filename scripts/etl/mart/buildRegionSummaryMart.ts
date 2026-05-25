/**
 * 11-1 2차 3차 mart 단계 — master 산출물 4개를 시군구 단위로 결합해 region
 * summary mart record를 만든다.
 *
 * **Pure function** — fs/path/process 사용 X. 호출자(runEtl)가 readJson/writeJson을
 * 통해 입출력을 처리한다.
 *
 * **결합 규칙**:
 * - regionMaster의 regionCode를 base로 1:1 mart record 생성.
 * - demandMaster는 regionCode로 left join (없으면 specialEducationStudentCount /
 *   registeredDisabledCount는 undefined).
 * - schoolMaster는 regionCode로 group by → schoolCount/specialSchoolCount/
 *   specialClassCount 산출.
 * - supportCenterMaster는 group by → supportCenterCount 산출.
 * - C/D/E/F 카운트는 0 (도메인 부재).
 *
 * **issue 유형**:
 * - info / A / demand: regionMaster에는 있지만 demandMaster에 없음.
 * - warning / B / schoolCount: 시군구 학교 카운트 0.
 * - info / B / supportCenterCount: 시군구 지원센터 카운트 0.
 * - warning / G / regionCode: master를 통과한 비정상 코드 (방어적 — 정상 fixture에선 발생 X).
 */

import type {
  DataQualityIssue,
  IssueCollector,
} from "../../../src/lib/etl/types";
import type {
  MasterDemandRecord,
  MasterRegionRecord,
  MasterSchoolRecord,
  MasterSupportCenterRecord,
} from "../master/types";
import type { MartBuildResult, MartRegionSummaryRecord } from "./types";

/** 5자리 숫자 sigunguCode 게이트 (master 단계와 동일). */
const SIGUNGU_CODE_PATTERN = /^\d{5}$/;

export interface BuildRegionSummaryMartInput {
  regionMaster: MasterRegionRecord[];
  demandMaster: MasterDemandRecord[];
  schoolMaster: MasterSchoolRecord[];
  supportCenterMaster: MasterSupportCenterRecord[];
}

/**
 * regionMaster를 base로 4개 master를 결합해 mart record array를 만든다.
 * regionCode는 master 단계에서 이미 5자리로 검증된 상태지만 방어적으로 한 번 더 확인.
 */
export function buildRegionSummaryMart(
  input: BuildRegionSummaryMartInput,
): MartBuildResult {
  const issues: DataQualityIssue[] = [];
  const collect: IssueCollector = (issue) => issues.push(issue);

  // demandMaster를 regionCode 기준 lookup map으로
  const demandByRegion = new Map<string, MasterDemandRecord>(
    input.demandMaster.map((d) => [d.regionCode, d]),
  );

  // school / supportCenter는 regionCode 기준 group by
  const schoolsByRegion = groupBy(
    input.schoolMaster,
    (s) => s.regionCode,
  );
  const centersByRegion = groupBy(
    input.supportCenterMaster,
    (c) => c.regionCode,
  );

  const records: MartRegionSummaryRecord[] = [];

  for (const r of input.regionMaster) {
    if (!SIGUNGU_CODE_PATTERN.test(r.regionCode)) {
      collect({
        severity: "warning",
        datasetCategory: "G",
        field: "regionCode",
        message:
          "mart: regionCode is not a 5-digit sigungu code (should be blocked by master)",
      });
      continue;
    }

    const demand = demandByRegion.get(r.regionCode);
    if (!demand) {
      collect({
        severity: "info",
        datasetCategory: "A",
        field: "demand",
        message: "mart: no demand data for regionCode (left join miss)",
      });
    }

    const schools = schoolsByRegion.get(r.regionCode) ?? [];
    const centers = centersByRegion.get(r.regionCode) ?? [];

    if (schools.length === 0) {
      collect({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolCount",
        message: "mart: no schools aggregated for regionCode",
      });
    }
    if (centers.length === 0) {
      collect({
        severity: "info",
        datasetCategory: "B",
        field: "supportCenterCount",
        message: "mart: no support centers aggregated for regionCode",
      });
    }

    const specialSchoolCount = schools.filter(
      (s) => s.schoolType === "specialSchool",
    ).length;
    const specialClassCount = schools.filter(
      (s) => s.schoolType === "specialClassInGeneralSchool",
    ).length;

    // 11-2 1차-9 Option B + Policy A — region master source가 "admin-union"이면
    // 이 mart record는 admin-only skeletal region (demand/school/supportCenter 0건).
    // partialRegionFlag=true로 노출해 후속 화면에서 "데이터 부재" 표시 분기 가능.
    const partialRegionFlag = r.source === "admin-union";

    records.push({
      regionCode: r.regionCode,
      regionCodeType: r.regionCodeType,
      sidoCode: r.sidoCode,
      sigunguCode: r.sigunguCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      regionName: composeRegionName(r),
      coordinate: r.coordinate,

      specialEducationStudentCount: demand?.specialEducationStudentCount,
      registeredDisabledCount: demand?.registeredDisabledCount,

      schoolCount: schools.length,
      specialSchoolCount,
      specialClassCount,
      supportCenterCount: centers.length,

      trainingInstitutionCount: 0,
      careerExperienceCenterCount: 0,
      welfareFacilityCount: 0,
      jobPostingCount: 0,

      partialRegionFlag,

      meta: {
        source: "demo:fixture-etl",
        note: "partial fixture — C/D/E/F domains missing",
      },
    });
  }

  return { records, issues };
}

/** sidoName + sigunguName 합성. 부재 시 regionCode fallback. */
function composeRegionName(r: MasterRegionRecord): string {
  if (r.sidoName && r.sigunguName) return `${r.sidoName} ${r.sigunguName}`;
  if (r.sidoName) return r.sidoName;
  if (r.sigunguName) return r.sigunguName;
  return r.regionCode;
}

function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const existing = result.get(key);
    if (existing) {
      existing.push(item);
    } else {
      result.set(key, [item]);
    }
  }
  return result;
}
