import type { RegionCodeType } from "../../../src/types";
import { normalizeRegionCode } from "../../../src/lib/etl/normalize";
import type { CleanResult, DataQualityIssue } from "../types";

interface DisabledPopulationInput {
  regionCode: string;
  registeredDisabledCount: number | string;
  year?: number;
}

export interface CleanedDisabledPopulationRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  registeredDisabledCount: number;
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
 * A — 시군구별 등록장애인 수 정제.
 */
export function cleanDisabledPopulation(
  records: DisabledPopulationInput[],
): CleanResult<CleanedDisabledPopulationRecord> {
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
      registeredDisabledCount: toFiniteInt(r.registeredDisabledCount),
      year: r.year,
    };
  });

  return { records: cleaned, issues };
}
