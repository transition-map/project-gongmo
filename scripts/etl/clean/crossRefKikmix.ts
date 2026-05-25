/**
 * 11-2 1차-18 cross-file validator — KIKmix mapping ↔ KIKcd_B/KIKcd_H 참조 무결성 검증.
 * 11-2 1차-19 — `adminCodeSet?` 인자 추가, 시군구 단위 legalDongCode fallback 도입.
 *
 * 같은 ETL 호출(`runRealCleanStage`) 내 메모리에 보유한 **clean result records** 기준 Set과
 * KIKmix mapping records를 대조하여 참조 무결성을 확인한다. 디스크 산출물 재load X.
 *
 * **Set 구성 기준 (1차-18 사용자 합의값 §1-3 + 1차-19 §6)**:
 *   - `legalDongCodeSet` = `legalDongCleanResult.records.map(r => r.regionCode)` 기준 Set (10자리)
 *   - `hjdCodeSet`       = `hjdCleanResult.records.map(r => r.regionCode)` 기준 Set (10자리)
 *   - `adminCodeSet`     = `adminCleanResult.records.map(r => r.regionCode)` 기준 Set (5자리 시군구)
 *   - 이유: cross-file validation의 의미는 "최종 clean.real 산출물에 실제 존재하는 코드인가?"이므로
 *     raw ingest records가 아니라 cleaner를 거쳐 최종 정제된 records를 기준으로 한다.
 *
 * **검증 정책**:
 *   - mapping.hjdCode가 hjdCodeSet에 없음 → warning issue, field `crossRef:hjdCode` (1차-18 그대로)
 *   - mapping.legalDongCode가 legalDongCodeSet에 있음 → issue 없음 (1차-18 그대로)
 *   - mapping.legalDongCode가 legalDongCodeSet에 없을 때 (1차-19 fallback 검토):
 *     - 조건 모두 만족: `endsWith("00000")` + `!endsWith("00000000")` + `adminCodeSet?.has(slice(0,5))`
 *       → 시군구 단위 매핑으로 간주, silent (issue 미발행)
 *     - 조건 미만족 → warning issue, field `crossRef:legalDongCode` (1차-18 정책)
 *   - hjdCodeSet === undefined → info issue 1건 + hjdCode 검증 skip (legalDongCode 검증은 수행)
 *   - legalDongCodeSet === undefined → info issue 1건 + legalDongCode 검증 skip
 *   - adminCodeSet === undefined → fallback skip, 1차-18 정책 그대로 (info issue 발행 안 함)
 *   - mapping records **변형 0건** — pure function, 입력 array 무수정, 반환값은 `{ issues }`만
 *
 * **1차-19 fallback 조건 상세**:
 *   - `endsWith("00000")`: 시군구 자리(읍면동 5 자리 모두 0)
 *   - `!endsWith("00000000")`: 시도 단위 (시군구 자리도 모두 0)는 admin records 범위 밖이라
 *     fallback 제외. 시도 단위는 admin records(시군구 5자리)와 의미가 다름.
 *   - `adminCodeSet.has(slice(0,5))`: 시군구 5자리 prefix가 admin records에 존재
 *
 * **issue field 분리 (1차-17과 충돌 회피)**:
 *   - 1차-17 ingestKikmix/cleanKikmix field: `hjdCode`, `legalDongCode`, `sigunguCode`,
 *     `hjdName`, `legalDongName`, `abolished`, `duplicate`
 *   - 1차-18/1차-19 crossRefKikmix field: `crossRef:hjdCode`, `crossRef:legalDongCode`
 *     (콜론 prefix로 출처 구분)
 *
 * **issue 분배 (1차-17 §10 일관)**:
 *   - 본 validator의 모든 issue는 호출자(runEtl)가 hjd_legal_dong_mapping.clean.json에만 첨부.
 *   - admin_codes / legal_dong_codes / hjd_codes 산출물에는 섞이지 않음.
 */

import type { DataQualityIssue } from "../../../src/types";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
/**
 * cross-ref 검증에 필요한 mapping pair의 최소 shape.
 * 1차-17 `KikmixMappingRecord` / cleanKikmix `CleanedKikmixRecord`와 structural 호환.
 */
export interface CrossRefMappingPair {
  hjdCode: string;
  legalDongCode: string;
}

export interface ValidateCrossRefKikmixInput {
  mappingRecords: CrossRefMappingPair[];
  /**
   * KIKcd_H에서 cleanHjdCodes 산출 records의 regionCode 집합.
   * `undefined`면 hjdCode 참조 검증을 skip하고 info issue 1건 발행.
   */
  hjdCodeSet?: Set<string>;
  /**
   * KIKcd_B에서 cleanLegalDongCodes 산출 records의 regionCode 집합 (10자리).
   * `undefined`면 legalDongCode 참조 검증을 skip하고 info issue 1건 발행.
   */
  legalDongCodeSet?: Set<string>;
  /**
   * 11-2 1차-19 신규 — KIKcd_B에서 cleanRegionCodes 산출 admin records의
   * regionCode 집합 (5자리 시군구).
   *
   * `mapping.legalDongCode`가 `legalDongCodeSet`에 없을 때 시군구 단위 매핑 fallback:
   *   - `legalDongCode.endsWith("00000")` (시군구 자리)
   *   - `!legalDongCode.endsWith("00000000")` (시도 단위는 제외)
   *   - `adminCodeSet.has(legalDongCode.slice(0, 5))` (시군구 5자리가 admin records에 존재)
   * 위 모두 만족 시 정상 매핑으로 간주, issue 미발행 (silent).
   *
   * `undefined`면 fallback skip — 1차-18 정책 그대로 (warning 발행). info issue 발행 X.
   */
  adminCodeSet?: Set<string>;
}

export interface ValidateCrossRefKikmixResult {
  issues: DataQualityIssue[];
}

// ─── 검증 entry ────────────────────────────────────────────────────────────
/**
 * KIKmix mapping records의 hjdCode / legalDongCode가 KIKcd_H / KIKcd_B의 clean result에
 * 실제 존재하는지 Set lookup으로 검증.
 *
 * - **Pure function** — 입력 array 변형 0건.
 * - 반환값은 `{ issues }`만 — records는 보존 정책상 호출자가 그대로 유지.
 */
export function validateCrossRefKikmix(
  input: ValidateCrossRefKikmixInput,
): ValidateCrossRefKikmixResult {
  const issues: DataQualityIssue[] = [];

  // 1) Set undefined 시 info issue 발행 (검증 skip 안내).
  //    runEtl에서 --hjd-codes 미지정 시 hjdCodeSet은 undefined로 전달됨.
  if (input.hjdCodeSet === undefined) {
    issues.push({
      severity: "info",
      datasetCategory: "G",
      field: "crossRef:hjdCode",
      message:
        "hjd_codes clean records 미보유 — KIKmix mapping의 hjdCode 참조 무결성 검증 건너뜀 (--hjd-codes 미지정 가능성)",
    });
  }
  if (input.legalDongCodeSet === undefined) {
    issues.push({
      severity: "info",
      datasetCategory: "G",
      field: "crossRef:legalDongCode",
      message:
        "legal_dong_codes clean records 미보유 — KIKmix mapping의 legalDongCode 참조 무결성 검증 건너뜀",
    });
  }

  // 2) 각 mapping record에 대해 Set 보유 측만 lookup. 부재 시 warning issue.
  //    1차-19 — legalDongCode 부재 시 시군구 단위 admin fallback 검토.
  for (const r of input.mappingRecords) {
    // 2-a) hjdCode 검증 (1차-18 정책 그대로)
    if (input.hjdCodeSet !== undefined && !input.hjdCodeSet.has(r.hjdCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "crossRef:hjdCode",
        message: `mapping의 hjdCode '${r.hjdCode}'가 hjd_codes clean records에 존재하지 않음`,
      });
    }

    // 2-b) legalDongCode 검증 (1차-18 base + 1차-19 fallback)
    if (
      input.legalDongCodeSet !== undefined &&
      !input.legalDongCodeSet.has(r.legalDongCode)
    ) {
      // 1차-19 fallback: 시군구 단위 매핑이면 admin_codes로 검증.
      //   조건: endsWith("00000") + !endsWith("00000000") + adminCodeSet.has(slice(0,5))
      //   시도 단위(endsWith "00000000")는 admin records 범위 밖이라 제외.
      const isSiguMapping =
        r.legalDongCode.endsWith("00000") &&
        !r.legalDongCode.endsWith("00000000");
      const adminFallback =
        isSiguMapping &&
        input.adminCodeSet !== undefined &&
        input.adminCodeSet.has(r.legalDongCode.slice(0, 5));

      if (!adminFallback) {
        issues.push({
          severity: "warning",
          datasetCategory: "G",
          field: "crossRef:legalDongCode",
          message: `mapping의 legalDongCode '${r.legalDongCode}'가 legal_dong_codes clean records에 존재하지 않음`,
        });
      }
      // adminFallback === true → silent (시군구 단위 정상 매핑, issue 미발행)
    }
  }

  return { issues };
}
