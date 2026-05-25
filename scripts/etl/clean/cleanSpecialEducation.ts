import type { RegionCodeType } from "../../../src/types";
import { normalizeRegionCode } from "../../../src/lib/etl/normalize";
import type { CleanResult, DataQualityIssue } from "../types";

interface SpecialEducationInput {
  regionCode: string;
  specialEducationStudentCount: number | string;
  year?: number;
}

export interface CleanedSpecialEducationRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  specialEducationStudentCount: number;
  year?: number;
}

function toFiniteInt(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * A — 시군구별 특수교육대상자 수 정제.
 */
export function cleanSpecialEducation(
  records: SpecialEducationInput[],
): CleanResult<CleanedSpecialEducationRecord> {
  const issues: DataQualityIssue[] = [];
  const collect = (issue: DataQualityIssue) => issues.push(issue);

  const cleaned = records.map((r) => {
    const region = normalizeRegionCode({
      raw: r.regionCode,
      expectedLevel: "sigungu",
      datasetCategory: "A",
      collectIssue: collect,
    });
    return {
      regionCode: region.regionCode,
      regionCodeType: region.regionCodeType,
      sidoCode: region.sidoCode,
      sigunguCode: region.sigunguCode,
      specialEducationStudentCount: toFiniteInt(r.specialEducationStudentCount),
      year: r.year,
    };
  });

  return { records: cleaned, issues };
}
