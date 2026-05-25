/**
 * 11-2 1차-17 cleaner — KIKmix 행정동↔법정동 매핑 input → CleanedKikmixRecord[].
 *
 * `ingestKikmix`의 mappingRecords를 받아 형식 검증 + 일관성 검증. 도메인 분리:
 * - 법정동(KIKcd_B) 정제는 `cleanLegalDongCodes`
 * - 행정동(KIKcd_H) 정제는 `cleanHjdCodes` (1차-16)
 * - 매핑(KIKmix) 정제는 본 `cleanKikmix` — 1차-17 사용자 합의값 (기존 cleaner 일반화 X)
 *
 * 검증 항목:
 * - hjdCode 10자리 숫자 형식 (`isValidLegalDongCode` 재사용 — 행정동·법정동 모두 10자리 numeric)
 * - legalDongCode 10자리 숫자 형식
 * - sigunguCode === hjdCode.slice(0, 5) (행정동 prefix 일관성)
 * - sigunguCode === legalDongCode.slice(0, 5) (법정동 prefix 일관성)
 * - hjdName 빈 값 금지
 * - legalDongName 빈 값 금지
 *
 * `cleanLegalDongCodes` / `cleanHjdCodes` 패턴과 일관 — **1:1 mapping** (입력 record당
 * 출력 record 1건). 형식 위반도 cleaned record로 emit하되 issue를 별도 수집.
 *
 * issue 분배 (1차-17 §10): 호출자(runEtl)가 hjd_legal_dong_mapping.clean.json에만 첨부.
 * admin_codes / legal_dong_codes / hjd_codes 산출물에는 섞이지 않음.
 */

import { isValidLegalDongCode } from "../ingest/guards";
import type { CleanResult, DataQualityIssue } from "../types";

export interface KikmixInput {
  hjdCode: string;
  legalDongCode: string;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
  hjdName?: string;
  legalDongName?: string;
}

export interface CleanedKikmixRecord {
  hjdCode: string;
  legalDongCode: string;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
  hjdName?: string;
  legalDongName?: string;
}

/**
 * G — KIKmix 행정동↔법정동 매핑 records 정제.
 * regionCode 형식 검증 + sigunguCode 양쪽 prefix 일관성 검증 + 이름 결측 검증.
 */
export function cleanKikmix(
  records: KikmixInput[],
): CleanResult<CleanedKikmixRecord> {
  const issues: DataQualityIssue[] = [];

  const cleaned: CleanedKikmixRecord[] = records.map((r) => {
    const hjdCode = (r.hjdCode ?? "").trim();
    const legalDongCode = (r.legalDongCode ?? "").trim();

    // 1) hjdCode 10자리 검증
    if (!isValidLegalDongCode(hjdCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "hjdCode",
        message: `행정동코드가 10자리 숫자 형식이 아님: '${r.hjdCode}'`,
      });
    }

    // 2) legalDongCode 10자리 검증
    if (!isValidLegalDongCode(legalDongCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "legalDongCode",
        message: `법정동코드가 10자리 숫자 형식이 아님: '${r.legalDongCode}'`,
      });
    }

    // 3) sigunguCode 일관성 검증 — hjdCode.slice(0, 5)와 비교
    const hjdSigungu = hjdCode.length >= 5 ? hjdCode.slice(0, 5) : undefined;
    if (
      r.sigunguCode !== undefined &&
      hjdSigungu !== undefined &&
      r.sigunguCode !== hjdSigungu
    ) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `sigunguCode '${r.sigunguCode}'가 hjdCode.slice(0,5) '${hjdSigungu}'와 불일치`,
      });
    }

    // 4) sigunguCode 일관성 검증 — legalDongCode.slice(0, 5)와 비교
    const legalDongSigungu =
      legalDongCode.length >= 5 ? legalDongCode.slice(0, 5) : undefined;
    if (
      r.sigunguCode !== undefined &&
      legalDongSigungu !== undefined &&
      r.sigunguCode !== legalDongSigungu
    ) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `sigunguCode '${r.sigunguCode}'가 legalDongCode.slice(0,5) '${legalDongSigungu}'와 불일치`,
      });
    }

    // 5) hjdName 빈 값 검증
    if (r.hjdName !== undefined && r.hjdName.trim().length === 0) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "hjdName",
        message: `hjdName이 빈 값`,
      });
    }

    // 6) legalDongName 빈 값 검증
    if (r.legalDongName !== undefined && r.legalDongName.trim().length === 0) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "legalDongName",
        message: `legalDongName이 빈 값`,
      });
    }

    // 7) cleaned record 1:1 emit — sidoCode/sigunguCode는 hjdCode 기준 정규화
    //    (정상 시 legalDongCode 기준과 동일). hjdCode가 유효하지 않으면 r.sigunguCode fallback.
    return {
      hjdCode,
      legalDongCode,
      sidoCode: hjdSigungu !== undefined ? hjdCode.slice(0, 2) : r.sidoCode,
      sigunguCode: hjdSigungu ?? r.sigunguCode,
      sidoName: r.sidoName,
      sigunguName: r.sigunguName,
      hjdName: r.hjdName,
      legalDongName: r.legalDongName,
    };
  });

  return { records: cleaned, issues };
}
