/**
 * 11-2 1차-16 cleaner — 행정동 10자리 input → CleanedHjdRecord[].
 *
 * `ingestKikcdH`의 hjdRecords를 받아 형식 검증 + 정규화. 도메인 분리:
 * - 법정동(KIKcd_B) 정제는 `cleanLegalDongCodes`
 * - 행정동(KIKcd_H) 정제는 본 cleaner — 1차-16 사용자 합의값 (cleanLegalDongCodes 일반화 X)
 *
 * 검증 항목:
 * - regionCode 10자리 숫자 형식 (`isValidLegalDongCode` 재사용 — 둘 다 10자리 numeric)
 * - regionCodeType === "haengjeongDong"
 * - sidoCode === regionCode.slice(0, 2)
 * - sigunguCode === regionCode.slice(0, 5)
 *
 * `cleanLegalDongCodes` 패턴과 일관 — **1:1 mapping** (입력 record당 출력 record 1건).
 * 형식 위반도 cleaned record로 emit하되 issue를 별도 수집 (drop 안 함).
 *
 * DataQualityIssue source는 호출자(runEtl)가 hjd_codes.clean.json 출력에만 첨부 책임.
 */

import { isValidLegalDongCode } from "../ingest/guards";
import type { RegionCodeType } from "../../../src/types";
import type { CleanResult, DataQualityIssue } from "../types";

export interface HjdInput {
  regionCode: string;
  regionCodeType?: RegionCodeType | string;
  sidoCode?: string;
  sigunguCode?: string;
  hjdCode?: string;
  sidoName?: string;
  sigunguName?: string;
  hjdName?: string;
}

export interface CleanedHjdRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  hjdCode?: string;
  sidoName?: string;
  sigunguName?: string;
  hjdName?: string;
}

/**
 * G — 행정동 10자리 코드 정제.
 * regionCode 형식 검증 + sidoCode / sigunguCode 일관성 검증 + 정규화.
 */
export function cleanHjdCodes(records: HjdInput[]): CleanResult<CleanedHjdRecord> {
  const issues: DataQualityIssue[] = [];

  const cleaned: CleanedHjdRecord[] = records.map((r) => {
    const raw = (r.regionCode ?? "").trim();

    // 1) regionCode 10자리 검증
    if (!isValidLegalDongCode(raw)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "regionCode",
        message: `행정동코드가 10자리 숫자 형식이 아님: '${r.regionCode}'`,
      });
    }

    // 2) regionCodeType 검증
    if (r.regionCodeType !== undefined && r.regionCodeType !== "haengjeongDong") {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "regionCodeType",
        message: `regionCodeType이 'haengjeongDong'이 아님: '${r.regionCodeType}'`,
      });
    }

    // 3) sidoCode 일관성 검증
    const expectedSido = raw.length >= 2 ? raw.slice(0, 2) : undefined;
    if (
      r.sidoCode !== undefined &&
      expectedSido !== undefined &&
      r.sidoCode !== expectedSido
    ) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sidoCode",
        message: `sidoCode '${r.sidoCode}'가 regionCode.slice(0,2) '${expectedSido}'와 불일치`,
      });
    }

    // 4) sigunguCode 일관성 검증
    const expectedSigungu = raw.length >= 5 ? raw.slice(0, 5) : undefined;
    if (
      r.sigunguCode !== undefined &&
      expectedSigungu !== undefined &&
      r.sigunguCode !== expectedSigungu
    ) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `sigunguCode '${r.sigunguCode}'가 regionCode.slice(0,5) '${expectedSigungu}'와 불일치`,
      });
    }

    // 5) cleaned record 1:1 emit — raw가 유효하면 슬라이스로 정규화, 아니면 raw 그대로
    return {
      regionCode: raw,
      regionCodeType: "haengjeongDong",
      sidoCode: expectedSido,
      sigunguCode: expectedSigungu,
      hjdCode: raw.length === 10 ? raw : undefined,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      hjdName: r.hjdName,
    };
  });

  return { records: cleaned, issues };
}
