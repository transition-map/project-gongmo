import type { RegionCodeType } from "../../../src/types";
import {
  normalizeAddress,
  normalizeInstitutionId,
  normalizeRegionCode,
} from "../../../src/lib/etl/normalize";
import type { CleanResult, DataQualityIssue } from "../types";

interface SupportCenterInput {
  sourceId?: string;
  institutionName: string;
  address?: string;
  regionCode: string;
}

export interface CleanedSupportCenterRecord {
  institutionId: string;
  institutionType: "supportCenter";
  institutionName: string;
  regionCode: string;
  regionCodeType: RegionCodeType;
  address?: string;
  sidoName?: string;
  sigunguName?: string;
}

/**
 * B — 특수교육지원센터 정제.
 * institutionType은 "supportCenter" 고정. sourceId 부재 시 slug fallback.
 */
export function cleanSupportCenter(
  records: SupportCenterInput[],
): CleanResult<CleanedSupportCenterRecord> {
  const issues: DataQualityIssue[] = [];
  const collect = (issue: DataQualityIssue) => issues.push(issue);

  const cleaned = records.map((r) => {
    const region = normalizeRegionCode({
      raw: r.regionCode,
      expectedLevel: "sigungu",
      datasetCategory: "B",
      collectIssue: collect,
    });

    const inst = normalizeInstitutionId({
      institutionType: "supportCenter",
      source: "demo-support",
      sourceId: r.sourceId,
      institutionName: r.institutionName,
      address: r.address,
      datasetCategory: "B",
      collectIssue: collect,
    });

    const addr = r.address
      ? normalizeAddress({
          raw: r.address,
          datasetCategory: "B",
          collectIssue: collect,
        })
      : undefined;

    return {
      institutionId: inst.institutionId,
      institutionType: "supportCenter" as const,
      institutionName: r.institutionName,
      regionCode: region.regionCode,
      regionCodeType: region.regionCodeType,
      address: addr?.address,
      sidoName: addr?.sidoName,
      sigunguName: addr?.sigunguName,
    };
  });

  return { records: cleaned, issues };
}
