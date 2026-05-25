import type { Coordinate } from "../../../src/types";
import {
  normalizeAddress,
  normalizeCoordinate,
} from "../../../src/lib/etl/normalize";
import type { CleanResult, DataQualityIssue } from "../types";

interface GeocodingInput {
  address: string;
  lat?: number | string | null;
  lng?: number | string | null;
}

export interface CleanedGeocodingRecord {
  address: string;
  sidoName?: string;
  sigunguName?: string;
  emdName?: string;
  coordinate: Coordinate;
}

/**
 * G — 주소 정제 + 좌표 정규화.
 * normalizeAddress · normalizeCoordinate 재사용.
 */
export function cleanGeocoding(
  records: GeocodingInput[],
): CleanResult<CleanedGeocodingRecord> {
  const issues: DataQualityIssue[] = [];
  const collect = (issue: DataQualityIssue) => issues.push(issue);

  const cleaned = records.map((r) => {
    const addr = normalizeAddress({
      raw: r.address,
      datasetCategory: "G",
      collectIssue: collect,
    });
    const coord = normalizeCoordinate({
      rawLat: r.lat ?? undefined,
      rawLng: r.lng ?? undefined,
      datasetCategory: "G",
      collectIssue: collect,
    });
    return {
      address: addr.address,
      sidoName: addr.sidoName,
      sigunguName: addr.sigunguName,
      emdName: addr.emdName,
      coordinate: coord.coordinate,
    };
  });

  return { records: cleaned, issues };
}
