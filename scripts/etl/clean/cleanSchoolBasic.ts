import type { RegionCodeType } from "../../../src/types";
import {
  normalizeAddress,
  normalizeRegionCode,
  normalizeSchoolId,
} from "../../../src/lib/etl/normalize";
import type { CleanResult, DataQualityIssue } from "../types";

interface SchoolBasicInput {
  neisSchoolCode?: string;
  schoolName: string;
  schoolType?: string;
  address?: string;
  regionCode: string;
}

export interface CleanedSchoolBasicRecord {
  schoolId: string;
  neisSchoolCode?: string;
  schoolName: string;
  schoolType?: string;
  regionCode: string;
  regionCodeType: RegionCodeType;
  address?: string;
  sidoName?: string;
  sigunguName?: string;
}

/**
 * B — 학교 기본정보 정제.
 * NEIS 코드 우선, 부재 시 source+slug fallback. 주소도 토큰 분리.
 */
export function cleanSchoolBasic(
  records: SchoolBasicInput[],
): CleanResult<CleanedSchoolBasicRecord> {
  const issues: DataQualityIssue[] = [];
  const collect = (issue: DataQualityIssue) => issues.push(issue);

  const cleaned = records.map((r) => {
    const region = normalizeRegionCode({
      raw: r.regionCode,
      expectedLevel: "sigungu",
      datasetCategory: "B",
      collectIssue: collect,
    });

    const school = normalizeSchoolId({
      neisSchoolCode: r.neisSchoolCode,
      schoolName: r.schoolName,
      address: r.address,
      source: "demo-school",
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
      schoolId: school.schoolId,
      neisSchoolCode: school.neisSchoolCode,
      schoolName: r.schoolName,
      schoolType: r.schoolType,
      regionCode: region.regionCode,
      regionCodeType: region.regionCodeType,
      address: addr?.address,
      sidoName: addr?.sidoName,
      sigunguName: addr?.sigunguName,
    };
  });

  return { records: cleaned, issues };
}
