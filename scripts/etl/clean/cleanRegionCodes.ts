import type { RegionCodeType } from "../../../src/types";
import { normalizeRegionCode } from "../../../src/lib/etl/normalize";
import type { CleanResult, DataQualityIssue } from "../types";

interface RegionCodeInput {
  regionCode: string;
  sidoName?: string;
  sigunguName?: string;
}

export interface CleanedRegionCodeRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
}

/**
 * G — 시군구 코드 마스터 정제.
 * regionCode 형식 검증 + 시도/시군구 분리.
 */
export function cleanRegionCodes(
  records: RegionCodeInput[],
): CleanResult<CleanedRegionCodeRecord> {
  const issues: DataQualityIssue[] = [];
  const collect = (issue: DataQualityIssue) => issues.push(issue);

  const cleaned = records.map((r) => {
    const normalized = normalizeRegionCode({
      raw: r.regionCode,
      expectedLevel: "sigungu",
      datasetCategory: "G",
      collectIssue: collect,
    });
    return {
      regionCode: normalized.regionCode,
      regionCodeType: normalized.regionCodeType,
      sidoCode: normalized.sidoCode,
      sigunguCode: normalized.sigunguCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
    };
  });

  return { records: cleaned, issues };
}
