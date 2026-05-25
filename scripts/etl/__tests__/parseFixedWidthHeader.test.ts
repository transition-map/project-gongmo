/**
 * parseFixedWidthHeader.test.ts — 11-2 1차-15 fixed-width 헤더 파서 RED 테스트.
 *
 * 행안부 KIKcd_B 헤더 라인에서 각 컬럼의 display column 시작·끝 위치를 동적으로
 * 추출한다. 데이터 행은 헤더와 동일한 컬럼 폭을 가진다는 fixed-width 전제 하에,
 * 본 helper가 반환한 ColumnSpec[]을 `sliceByDisplayWidth`와 함께 사용해 row를
 * 파싱한다.
 *
 * helper 책임:
 * - 헤더 라인에서 requiredKeys 각각의 display column 시작 위치 찾기
 * - 두 컬럼 사이 displayEnd = 다음 컬럼 displayStart (연속 boundary)
 * - 마지막 컬럼의 displayEnd는 행 끝까지 확장 (>= 헤더 display width)
 * - requiredKeys 중 하나라도 누락이면 Error throw (한국어 메시지 — 누락 키 포함)
 * - 반환 순서는 입력 requiredKeys 순서를 유지 (display column 순서와 동일하지 않을 수 있음)
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/ingest/parseFixedWidthHeader.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 * - HWPX Layout 사양서 기반 상수 fallback은 1차-16+ — 본 RED는 동적 검출만 강제.
 */

import { describe, expect, it } from "vitest";
import { parseFixedWidthHeader } from "../ingest/parseFixedWidthHeader";

const KIKCD_B_HEADER_KEYS = [
  "법정동코드",
  "시도명",
  "시군구명",
  "읍면동명",
  "동리명",
  "생성일자",
  "말소일자",
] as const;

// KIKcd_B 실 헤더와 동일한 컬럼 구조 (폭만 축소).
// 폭 합계:
//   법정동코드(10) + " "(1) + 시도명(14) + " "(1) + 시군구명(10) + " "(1) +
//   읍면동명(10) + " "(1) + 동리명(10) + " "(1) + 생성일자(8) + " "(1) + 말소일자(8) = 76 display
const HEADER_TIGHT =
  "법정동코드 " +
  "시도명         " + // padding to 14 display (3 Korean = 6 display + 8 spaces)
  " " +
  "시군구명   " + // padding to 10 display (4 Korean = 8 display + 2 spaces)
  " " +
  "읍면동명   " + // 10
  " " +
  "동리명     " + // 10 (3 Korean = 6 + 4 spaces)
  " " +
  "생성일자 " +
  "말소일자";

describe("parseFixedWidthHeader (11-2 1차-15)", () => {
  it("KIKcd_B 헤더 라인에서 7개 ColumnSpec 반환", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    expect(specs.length).toBe(7);
  });

  it("반환 spec의 key는 입력 requiredKeys와 동일 순서로 보존", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    expect(specs.map((s) => s.key)).toEqual([...KIKCD_B_HEADER_KEYS]);
  });

  it("첫 컬럼 '법정동코드'의 displayStart = 0", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    const first = specs.find((s) => s.key === "법정동코드");
    expect(first?.displayStart).toBe(0);
  });

  it("'시도명' displayStart = '법정동코드'(width 10) + 공백 1 = 11", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    const sido = specs.find((s) => s.key === "시도명");
    expect(sido?.displayStart).toBe(11);
  });

  it("두 인접 컬럼: spec[i].displayEnd === spec[i+1].displayStart (연속 boundary)", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    for (let i = 0; i < specs.length - 1; i++) {
      expect(specs[i].displayEnd).toBe(specs[i + 1].displayStart);
    }
  });

  it("마지막 컬럼('말소일자')의 displayEnd는 헤더 전체 display width 이상", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    const last = specs[specs.length - 1];
    expect(last.displayEnd).toBeGreaterThanOrEqual(
      inlineDisplayWidth(HEADER_TIGHT),
    );
  });

  it("필수 키 누락 시 Error throw — 누락 키 이름이 메시지에 포함", () => {
    const partialHeader = "법정동코드 시도명 시군구명";
    expect(() =>
      parseFixedWidthHeader(partialHeader, [...KIKCD_B_HEADER_KEYS]),
    ).toThrow(/읍면동명/);
  });

  it("존재하지 않는 키가 requiredKeys에 있으면 Error throw (해당 키 이름 포함)", () => {
    expect(() =>
      parseFixedWidthHeader(HEADER_TIGHT, ["법정동코드", "시도명", "행정구역명"]),
    ).toThrow(/행정구역명/);
  });

  it("빈 헤더 라인 → throw (필수 키 0개 매칭)", () => {
    expect(() =>
      parseFixedWidthHeader("", [...KIKCD_B_HEADER_KEYS]),
    ).toThrow();
  });

  it("ColumnSpec 형상: { key, displayStart, displayEnd } — 모두 정의됨", () => {
    const specs = parseFixedWidthHeader(HEADER_TIGHT, [...KIKCD_B_HEADER_KEYS]);
    for (const s of specs) {
      expect(s.key).toBeDefined();
      expect(typeof s.displayStart).toBe("number");
      expect(typeof s.displayEnd).toBe("number");
      expect(s.displayEnd).toBeGreaterThan(s.displayStart);
    }
  });
});

// 인라인 helper — sliceByDisplayWidth.ts의 displayWidth와 동일 로직.
// 본 테스트가 sliceByDisplayWidth import에 의존하지 않도록 자체 보유 (RED 단계 단순성).
function inlineDisplayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp >= 0xac00 && cp <= 0xd7a3) w += 2;
    else w += 1;
  }
  return w;
}
