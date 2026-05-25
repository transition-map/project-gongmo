/**
 * 11-3 1차-34 — B-4 특수교육지원센터 master.real builder.
 *
 * 정책 (사용자 합의값 §1-7):
 * - master 단계 책임 (CLAUDE.md §4 단방향 5단계 원칙). 1차-23 buildSchoolMasterReal과
 *   동일 패턴 (이미 cleanXxx pure function을 거친 records를 입력으로 받아 master record 산출).
 * - 입력: G admin_codes clean records (validRegionCodes 검증용) + B `cleanSupportCenter`
 *   pure function이 산출한 CleanedSupportCenterRecord[].
 * - institutionName 누락 / regionCode admin set 외 → master records에서 제외 + warning issue.
 * - MasterSupportCenterRecord schema 무변경.
 * - `data/fixtures/B_special_support_center_sample.json` (3 records, KOSTAT regionCode
 *   11680/26350/41117 pre-baked)을 mini fixture proxy로 사용 — 실 공공데이터포털/교육청
 *   명단 raw는 후속 단계.
 *
 * **Pure function** — 입력 array·record 객체 mutate 0건.
 */

import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";
import type { CleanedSupportCenterRecord } from "../clean/cleanSupportCenter";
import type { DataQualityIssue } from "../types";
import type { MasterSupportCenterRecord } from "./types";

export interface BuildSupportCenterMasterRealInput {
  /** B `cleanSupportCenter` pure function이 산출한 cleaned records. */
  cleanedRecords: CleanedSupportCenterRecord[];
  /** G admin_codes clean records — validRegionCodes set 구성용. */
  adminCodes: CleanedRegionCodeRecord[];
}

export interface BuildSupportCenterMasterRealResult {
  records: MasterSupportCenterRecord[];
  issues: DataQualityIssue[];
}

/**
 * B-4 supportCenter master.real builder.
 *
 * admin_codes로부터 validRegionCodes set을 구성한 뒤, cleanedRecords를 순회하며
 * institutionName / regionCode 검증을 거친 record만 master records에 포함.
 * 제외 record는 warning issue로 보고 (record drop 정책, 1차-23 buildSchoolMasterReal 일관).
 */
export function buildSupportCenterMasterReal(
  input: BuildSupportCenterMasterRealInput,
): BuildSupportCenterMasterRealResult {
  const validRegionCodes = new Set(
    input.adminCodes.map((a) => a.regionCode),
  );
  const records: MasterSupportCenterRecord[] = [];
  const issues: DataQualityIssue[] = [];

  for (const r of input.cleanedRecords) {
    if (!r.institutionName || r.institutionName.trim().length === 0) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "institutionName",
        message: `supportCenter '${r.institutionId}'의 institutionName이 비어 master에서 제외`,
      });
      continue;
    }
    if (!validRegionCodes.has(r.regionCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "regionCode",
        message: `supportCenter '${r.institutionId}'의 regionCode '${r.regionCode}'가 G admin_codes에 없어 master에서 제외`,
      });
      continue;
    }

    const masterRecord: MasterSupportCenterRecord = {
      institutionId: r.institutionId,
      institutionType: "supportCenter",
      institutionName: r.institutionName,
      regionCode: r.regionCode,
      regionCodeType: r.regionCodeType,
    };
    if (r.address !== undefined) masterRecord.address = r.address;
    if (r.sidoName !== undefined) masterRecord.sidoName = r.sidoName;
    if (r.sigunguName !== undefined) masterRecord.sigunguName = r.sigunguName;
    records.push(masterRecord);
  }

  return { records, issues };
}
