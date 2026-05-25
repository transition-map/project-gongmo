/**
 * cleanHjdCodes.test.ts — 11-2 1차-16 행정동 cleaner RED 테스트.
 *
 * `ingestKikcdH`의 hjdRecords를 받아 형식 검증 + 정규화. 책임 분리:
 * - 법정동(KIKcd_B) 정제는 `cleanLegalDongCodes`
 * - 행정동(KIKcd_H) 정제는 본 `cleanHjdCodes` — 도메인 분리 유지 (1차-16 사용자 합의값)
 *
 * 검증 정책:
 * - regionCode 10자리 숫자 형식
 * - regionCodeType === "haengjeongDong" (다르면 warning issue 후 보정)
 * - sidoCode === regionCode.slice(0, 2)
 * - sigunguCode === regionCode.slice(0, 5)
 * - hjdCode === regionCode
 *
 * cleanLegalDongCodes 패턴과 일관 — 1:1 mapping (입력 record당 출력 record 1건).
 * 형식 위반도 cleaned record로 emit하되 issue를 별도 수집 (drop 안 함).
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/clean/cleanHjdCodes.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 */

import { describe, expect, it } from "vitest";
import { cleanHjdCodes } from "../clean/cleanHjdCodes";

interface InputRecord {
  regionCode: string;
  regionCodeType?: string;
  sidoCode?: string;
  sigunguCode?: string;
  hjdCode?: string;
  sidoName?: string;
  sigunguName?: string;
  hjdName?: string;
}

function buildHjdInput(overrides: Partial<InputRecord> = {}): InputRecord {
  return {
    regionCode: "1111051500",
    regionCodeType: "haengjeongDong",
    sidoCode: "11",
    sigunguCode: "11110",
    hjdCode: "1111051500",
    sidoName: "서울특별시",
    sigunguName: "종로구",
    hjdName: "청운효자동",
    ...overrides,
  };
}

describe("cleanHjdCodes (11-2 1차-16)", () => {
  it("빈 입력 → records=[], issues=[]", () => {
    const result = cleanHjdCodes([]);
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("정상 행정동 record 1건 → cleaned 1건, issues 0건", () => {
    const result = cleanHjdCodes([buildHjdInput()]);
    expect(result.records.length).toBe(1);
    expect(result.issues.length).toBe(0);
    expect(result.records[0].regionCode).toBe("1111051500");
    expect(result.records[0].regionCodeType).toBe("haengjeongDong");
    expect(result.records[0].sidoCode).toBe("11");
    expect(result.records[0].sigunguCode).toBe("11110");
    expect(result.records[0].hjdCode).toBe("1111051500");
    expect(result.records[0].sidoName).toBe("서울특별시");
    expect(result.records[0].sigunguName).toBe("종로구");
    expect(result.records[0].hjdName).toBe("청운효자동");
  });

  it("정상 records 다수 (3건) → cleaned 3건, issues 0건", () => {
    const input: InputRecord[] = [
      buildHjdInput({ regionCode: "1111051500", sigunguCode: "11110", hjdCode: "1111051500", hjdName: "청운효자동" }),
      buildHjdInput({ regionCode: "1111053000", sigunguCode: "11110", hjdCode: "1111053000", hjdName: "사직동" }),
      buildHjdInput({ regionCode: "4111153500", sidoCode: "41", sigunguCode: "41111", hjdCode: "4111153500", sidoName: "경기도", sigunguName: "수원시 장안구", hjdName: "파장동" }),
    ];
    const result = cleanHjdCodes(input);
    expect(result.records.length).toBe(3);
    expect(result.issues.length).toBe(0);
  });

  it("regionCode 10자리 아님 (9자리) → warning issue (regionCode field)", () => {
    const result = cleanHjdCodes([buildHjdInput({ regionCode: "111105150" })]);
    expect(result.issues.some((i) => i.severity === "warning" && i.field === "regionCode")).toBe(true);
  });

  it("regionCodeType이 'haengjeongDong'이 아니면 warning issue", () => {
    const result = cleanHjdCodes([
      buildHjdInput({ regionCodeType: "legalDong" }),
    ]);
    expect(result.issues.some((i) => i.severity === "warning" && i.field === "regionCodeType")).toBe(true);
  });

  it("sidoCode가 regionCode.slice(0, 2)와 불일치 → warning issue", () => {
    const result = cleanHjdCodes([
      buildHjdInput({ sidoCode: "99" }),
    ]);
    expect(result.issues.some((i) => i.severity === "warning" && i.field === "sidoCode")).toBe(true);
  });

  it("sigunguCode가 regionCode.slice(0, 5)와 불일치 → warning issue", () => {
    const result = cleanHjdCodes([
      buildHjdInput({ sigunguCode: "99999" }),
    ]);
    expect(result.issues.some((i) => i.severity === "warning" && i.field === "sigunguCode")).toBe(true);
  });

  it("issue가 있어도 cleaned record는 1:1 emit (drop 안 함)", () => {
    // cleanLegalDongCodes 패턴과 일관 — 형식 위반도 cleaned record로 보존
    const result = cleanHjdCodes([buildHjdInput({ regionCode: "111105150" })]);
    expect(result.records.length).toBe(1); // input 1건당 record 1건
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("mixed input — 정상 2 + 형식위반 1 → cleaned 3건, warning issue", () => {
    const input: InputRecord[] = [
      buildHjdInput({ regionCode: "1111051500", sigunguCode: "11110" }),
      buildHjdInput({ regionCode: "111105150", sigunguCode: "11110" }), // 9자리
      buildHjdInput({ regionCode: "1111053000", sigunguCode: "11110" }),
    ];
    const result = cleanHjdCodes(input);
    expect(result.records.length).toBe(3);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });
});
