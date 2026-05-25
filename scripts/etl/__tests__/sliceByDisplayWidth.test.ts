/**
 * sliceByDisplayWidth.test.ts — 11-2 1차-15 display-width 슬라이스 RED 테스트.
 *
 * 행안부 KIKcd_B/H/mix는 fixed-width 텍스트인데, 한글 1글자는 display column 2개를
 * 차지하지만 JavaScript string에서는 UTF-16 code unit 1개로 표현된다. 단순
 * `String.prototype.slice`는 display column 기준으로 잘리지 않으므로 별도
 * helper가 필요하다.
 *
 * helper 책임:
 * - `displayWidth(s)`: 문자열의 display column 폭 계산. 한글 syllable·CJK·fullwidth = 2,
 *   그 외 = 1.
 * - `sliceByDisplayWidth(s, startDisplay, endDisplay)`: display column 범위로 슬라이스.
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/ingest/sliceByDisplayWidth.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 모두 missing-module로 fail해야 한다.
 * - 한글 가운데 자르는 경계 케이스(예: '법'의 절반에서 시작·끝)는 1차-15 RED 범위에서
 *   엄격히 강제하지 않는다 — 정책은 GREEN에서 확정 (현재는 character boundary
 *   유지를 권장하나, 본 RED는 명확히 정렬되는 케이스만 테스트).
 */

import { describe, expect, it } from "vitest";
import {
  displayWidth,
  sliceByDisplayWidth,
} from "../ingest/sliceByDisplayWidth";

describe("displayWidth (11-2 1차-15)", () => {
  it("ASCII 문자열 'ABCDE' → 5", () => {
    expect(displayWidth("ABCDE")).toBe(5);
  });

  it("ASCII 숫자 '1111010100' (KIKcd_B 코드 모사) → 10", () => {
    expect(displayWidth("1111010100")).toBe(10);
  });

  it("한글 1글자 '법' → 2", () => {
    expect(displayWidth("법")).toBe(2);
  });

  it("한글 다글자 '법정동코드' → 10 (5 × 2)", () => {
    expect(displayWidth("법정동코드")).toBe(10);
  });

  it("한글 + 공백 혼합 '법정동 시도' → 11 (3×2 + 1 + 2×2)", () => {
    expect(displayWidth("법정동 시도")).toBe(11);
  });

  it("빈 문자열 → 0", () => {
    expect(displayWidth("")).toBe(0);
  });

  it("순수 공백 '   ' → 3", () => {
    expect(displayWidth("   ")).toBe(3);
  });
});

describe("sliceByDisplayWidth (11-2 1차-15)", () => {
  it("ASCII 슬라이스 'ABCDE' [0, 3) → 'ABC'", () => {
    expect(sliceByDisplayWidth("ABCDE", 0, 3)).toBe("ABC");
  });

  it("ASCII 슬라이스 'ABCDE' [2, 4) → 'CD'", () => {
    expect(sliceByDisplayWidth("ABCDE", 2, 4)).toBe("CD");
  });

  it("한글 1글자 정확히: '법정동' [0, 2) → '법' (한글 1글자 = display 2)", () => {
    expect(sliceByDisplayWidth("법정동", 0, 2)).toBe("법");
  });

  it("한글 2글자: '법정동' [0, 4) → '법정'", () => {
    expect(sliceByDisplayWidth("법정동", 0, 4)).toBe("법정");
  });

  it("한글 중간 2글자: '법정동' [2, 6) → '정동'", () => {
    expect(sliceByDisplayWidth("법정동", 2, 6)).toBe("정동");
  });

  it("KIKcd_B 헤더 첫 컬럼 슬라이스: '법정동코드 시도명' [0, 10) → '법정동코드'", () => {
    expect(sliceByDisplayWidth("법정동코드 시도명", 0, 10)).toBe("법정동코드");
  });

  it("KIKcd_B 데이터 첫 컬럼 슬라이스: '1111010100 ABCDE' [0, 10) → '1111010100'", () => {
    expect(sliceByDisplayWidth("1111010100 ABCDE", 0, 10)).toBe("1111010100");
  });

  it("trailing space 보존: '법정동코드 시도명' [0, 11) → '법정동코드 ' (코드 + 공백 1)", () => {
    expect(sliceByDisplayWidth("법정동코드 시도명", 0, 11)).toBe("법정동코드 ");
  });

  it("빈 슬라이스 [3, 3) → ''", () => {
    expect(sliceByDisplayWidth("ABCDE", 3, 3)).toBe("");
  });

  it("끝을 넘는 슬라이스 'ABC' [0, 100) → 'ABC' (가용 범위만)", () => {
    expect(sliceByDisplayWidth("ABC", 0, 100)).toBe("ABC");
  });

  it("start가 display width를 초과 — 'ABC' [10, 20) → ''", () => {
    expect(sliceByDisplayWidth("ABC", 10, 20)).toBe("");
  });

  it("한글 데이터 슬라이스: '서울특별시' (10 display) [0, 10) → '서울특별시'", () => {
    expect(sliceByDisplayWidth("서울특별시", 0, 10)).toBe("서울특별시");
  });
});
