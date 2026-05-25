/**
 * 11-2 1차-2 cleaner — 법정동 10자리 입력 → CleanedLegalDongRecord[].
 *
 * - `normalizeRegionCode({ expectedLevel: "legalDong" })`를 사용해 형식 검증과
 *   sidoCode/sigunguCode/legalDongCode 분해를 위임한다.
 * - 1차-1의 cleanRegionCodes는 무수정. 책임 분리: legalDong은 본 cleaner가 담당.
 * - DataQualityIssue는 IssueCollector 콜백으로 수집된다.
 */

import { normalizeRegionCode } from "../../../src/lib/etl/normalize";
import type { RegionCodeType } from "../../../src/types";
import type { CleanResult, DataQualityIssue } from "../types";

interface LegalDongInput {
  regionCode: string;     // 10자리
  sidoName?: string;
  sigunguName?: string;
  emdName?: string;
}

export interface CleanedLegalDongRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  legalDongCode?: string;
  sidoName?: string;
  sigunguName?: string;
  emdName?: string;
}

/**
 * G — 법정동 10자리 코드 정제.
 * regionCode 형식 검증 + 시도/시군구/법정동 분해.
 */
export function cleanLegalDongCodes(
  records: LegalDongInput[],
): CleanResult<CleanedLegalDongRecord> {
  const issues: DataQualityIssue[] = [];
  const collect = (issue: DataQualityIssue) => issues.push(issue);

  const cleaned = records.map((r) => {
    const normalized = normalizeRegionCode({
      raw: r.regionCode,
      expectedLevel: "legalDong",
      datasetCategory: "G",
      collectIssue: collect,
    });
    return {
      regionCode: normalized.regionCode,
      regionCodeType: normalized.regionCodeType,
      sidoCode: normalized.sidoCode,
      sigunguCode: normalized.sigunguCode,
      legalDongCode: normalized.legalDongCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      emdName: r.emdName,
    };
  });

  return { records: cleaned, issues };
}
