/**
 * cleanKikmix.test.ts — 11-2 1차-17 KIKmix 매핑 cleaner RED 테스트.
 *
 * `ingestKikmix`의 mappingRecords를 받아 형식 검증 + 일관성 검증. 1차-15/1차-16
 * cleaner 패턴과 일관 — **1:1 mapping** (입력 record당 출력 record 1건),
 * 형식 위반도 cleaned record로 emit하되 issue를 별도 수집.
 *
 * 검증 항목 (모두 warning issue 발생, records는 보존):
 * - hjdCode 10자리 숫자 형식 (`isValidLegalDongCode` 재사용)
 * - legalDongCode 10자리 숫자 형식
 * - sigunguCode === hjdCode.slice(0, 5) (행정동 prefix)
 * - sigunguCode === legalDongCode.slice(0, 5) (법정동 prefix) — 정상 시 둘 다 동일
 * - hjdName / legalDongName 빈 값 (시도/시군구 행 제외 후에도 결측이면 데이터 결함)
 *
 * issue 분배 정책 (1차-17 사용자 합의값 §10):
 * - cleanKikmix issue는 hjd_legal_dong_mapping.clean.json에만 첨부.
 * - admin_codes.clean.json / legal_dong_codes.clean.json / hjd_codes.clean.json에
 *   섞이지 않음 — runEtl의 출력 분배 책임.
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/clean/cleanKikmix.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 */

import { describe, expect, it } from "vitest";
import { cleanKikmix } from "../clean/cleanKikmix";

interface InputRecord {
  hjdCode: string;
  legalDongCode: string;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
  hjdName?: string;
  legalDongName?: string;
}

function buildInput(overrides: Partial<InputRecord> = {}): InputRecord {
  return {
    hjdCode: "1111051500",
    legalDongCode: "1111010100",
    sidoCode: "11",
    sigunguCode: "11110",
    sidoName: "서울특별시",
    sigunguName: "종로구",
    hjdName: "청운효자동",
    legalDongName: "청운동",
    ...overrides,
  };
}

describe("cleanKikmix (11-2 1차-17)", () => {
  it("빈 입력 → records=[], issues=[]", () => {
    const result = cleanKikmix([]);
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("정상 mapping record 1건 → cleaned 1건, issues 0건", () => {
    const result = cleanKikmix([buildInput()]);
    expect(result.records.length).toBe(1);
    expect(result.issues.length).toBe(0);
    expect(result.records[0].hjdCode).toBe("1111051500");
    expect(result.records[0].legalDongCode).toBe("1111010100");
    expect(result.records[0].sidoCode).toBe("11");
    expect(result.records[0].sigunguCode).toBe("11110");
    expect(result.records[0].hjdName).toBe("청운효자동");
    expect(result.records[0].legalDongName).toBe("청운동");
  });

  it("hjdCode 10자리 아님 (9자리) → warning issue", () => {
    const result = cleanKikmix([buildInput({ hjdCode: "111105150" })]);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "hjdCode",
      ),
    ).toBe(true);
  });

  it("legalDongCode 10자리 아님 (9자리) → warning issue", () => {
    const result = cleanKikmix([buildInput({ legalDongCode: "111101010" })]);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "legalDongCode",
      ),
    ).toBe(true);
  });

  it("sigunguCode가 hjdCode.slice(0,5)와 불일치 → warning issue", () => {
    const result = cleanKikmix([buildInput({ sigunguCode: "99999" })]);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "sigunguCode",
      ),
    ).toBe(true);
  });

  it("sigunguCode가 legalDongCode.slice(0,5)와 불일치 → warning issue", () => {
    // hjdCode prefix와 sigunguCode는 일치하지만 legalDongCode prefix와는 불일치
    const result = cleanKikmix([
      buildInput({
        hjdCode: "1111051500",
        sigunguCode: "11110",
        legalDongCode: "1114010100", // prefix 11140 — sigungu 11110과 불일치
      }),
    ]);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "sigunguCode",
      ),
    ).toBe(true);
  });

  it("hjdName 빈 값 → warning issue", () => {
    const result = cleanKikmix([buildInput({ hjdName: "" })]);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "hjdName",
      ),
    ).toBe(true);
  });

  it("legalDongName 빈 값 → warning issue", () => {
    const result = cleanKikmix([buildInput({ legalDongName: "" })]);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "legalDongName",
      ),
    ).toBe(true);
  });

  it("issue가 있어도 cleaned record는 1:1 emit (drop 안 함)", () => {
    // cleanLegalDongCodes / cleanHjdCodes 패턴과 일관 — 형식 위반도 cleaned record로 보존
    const result = cleanKikmix([buildInput({ hjdCode: "111105150" })]);
    expect(result.records.length).toBe(1);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("정상 records 다수 (3건) → cleaned 3건, sigunguCode 일관성 유지", () => {
    const input: InputRecord[] = [
      buildInput({
        hjdCode: "1111051500",
        legalDongCode: "1111010100",
        sigunguCode: "11110",
        hjdName: "청운효자동",
        legalDongName: "청운동",
      }),
      buildInput({
        hjdCode: "1111051500",
        legalDongCode: "1111010200",
        sigunguCode: "11110",
        hjdName: "청운효자동",
        legalDongName: "신교동",
      }),
      buildInput({
        hjdCode: "4111153500",
        legalDongCode: "4111110100",
        sidoCode: "41",
        sigunguCode: "41111",
        sidoName: "경기도",
        sigunguName: "장안구",
        hjdName: "파장동",
        legalDongName: "파장동",
      }),
    ];
    const result = cleanKikmix(input);
    expect(result.records.length).toBe(3);
    expect(result.issues.length).toBe(0);
    for (const r of result.records) {
      expect(r.sigunguCode).toBe(r.hjdCode.slice(0, 5));
      expect(r.sigunguCode).toBe(r.legalDongCode.slice(0, 5));
    }
  });
});
