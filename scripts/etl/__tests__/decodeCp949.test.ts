/**
 * decodeCp949.test.ts — 11-2 1차-15 CP949/EUC-KR 디코더 RED 테스트.
 *
 * 실제 행안부 KIKcd_B/H/mix 파일은 CP949 인코딩 (BOM 없음). 본 디코더는
 * Node 내장 `TextDecoder("euc-kr")`을 wrap하여 `Uint8Array → string` 변환을
 * 제공한다. 외부 라이브러리(iconv-lite 등) 의존 0건 — Step A 사전 검증으로
 * Node 24 + full ICU 환경에서 정상 동작 확인됨.
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/io/decodeCp949.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 모두 import-time TypeError 또는 missing-module 에러로 fail해야 한다.
 * - binary fixture 파일은 사용하지 않고 inline `Uint8Array`로 byte sequence 구성.
 * - 사용되는 byte 값은 Step A에서 verified된 CP949 표준 코드포인트.
 */

import { describe, expect, it } from "vitest";
import { decodeCp949 } from "../io/decodeCp949";

describe("decodeCp949 (11-2 1차-15 CP949/EUC-KR 디코더)", () => {
  it("'법정동코' (B9 FD C1 A4 B5 BF C4 DA) → 정상 디코드 — KIKcd_B 헤더 첫 4글자", () => {
    const bytes = new Uint8Array([0xB9, 0xFD, 0xC1, 0xA4, 0xB5, 0xBF, 0xC4, 0xDA]);
    expect(decodeCp949(bytes)).toBe("법정동코");
  });

  it("'행정동코' (C7 E0 C1 A4 B5 BF C4 DA) → 정상 디코드 — KIKcd_H/KIKmix 헤더 첫 4글자", () => {
    const bytes = new Uint8Array([0xC7, 0xE0, 0xC1, 0xA4, 0xB5, 0xBF, 0xC4, 0xDA]);
    expect(decodeCp949(bytes)).toBe("행정동코");
  });

  it("빈 Uint8Array → 빈 문자열", () => {
    expect(decodeCp949(new Uint8Array())).toBe("");
  });

  it("순수 ASCII 바이트 '1100000000' (10자리 코드 모사) → 동일 ASCII 문자열", () => {
    const bytes = new Uint8Array([
      0x31, 0x31, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30,
    ]);
    expect(decodeCp949(bytes)).toBe("1100000000");
  });

  it("CR LF 바이트 보존 (0x0D 0x0A) — fixed-width 줄 구분에 필수", () => {
    const bytes = new Uint8Array([0x41, 0x0D, 0x0A, 0x42]);
    expect(decodeCp949(bytes)).toBe("A\r\nB");
  });

  it("ASCII + 한글 혼합 ('11 법') → 정상 디코드", () => {
    // 0x31 0x31 (=11) + 0x20 (=space) + 0xB9 0xFD (=법)
    const bytes = new Uint8Array([0x31, 0x31, 0x20, 0xB9, 0xFD]);
    expect(decodeCp949(bytes)).toBe("11 법");
  });

  it("동일 입력을 두 번 호출해도 결정적 (decoder 재사용 안전)", () => {
    const bytes = new Uint8Array([0xB9, 0xFD]);
    expect(decodeCp949(bytes)).toBe(decodeCp949(bytes));
    expect(decodeCp949(bytes)).toBe("법");
  });
});
