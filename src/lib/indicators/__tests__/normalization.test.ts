import { describe, expect, it } from "vitest";
import {
  clampScore,
  normalizeInverse,
  normalizePositive,
  roundScore,
  safeDivide,
  toFiniteNumber,
  weightedAverage,
} from "../normalization";

describe("clampScore", () => {
  it("0 미만은 0으로 제한", () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(-0.001)).toBe(0);
  });

  it("100 초과는 100으로 제한", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(100.0001)).toBe(100);
  });

  it("0~100 사이 값은 그대로", () => {
    expect(clampScore(0)).toBe(0);
    expect(clampScore(50)).toBe(50);
    expect(clampScore(100)).toBe(100);
  });

  it("NaN/undefined/null은 0으로 처리", () => {
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore(null)).toBe(0);
    expect(clampScore(Infinity)).toBe(0);
  });
});

describe("safeDivide", () => {
  it("정상 나눗셈", () => {
    expect(safeDivide(10, 2)).toBe(5);
    expect(safeDivide(7, 2)).toBe(3.5);
  });

  it("0 분모 시 fallback (default 0)", () => {
    expect(safeDivide(10, 0)).toBe(0);
  });

  it("0 분모 + 사용자 fallback", () => {
    expect(safeDivide(10, 0, 99)).toBe(99);
  });

  it("undefined / NaN 입력 처리", () => {
    expect(safeDivide(undefined, 5)).toBe(0);
    expect(safeDivide(10, undefined)).toBe(0);
    expect(safeDivide(NaN, 5)).toBe(0);
  });
});

describe("normalizePositive", () => {
  it("값이 클수록 큰 점수", () => {
    expect(normalizePositive(0, 100)).toBe(0);
    expect(normalizePositive(50, 100)).toBe(50);
    expect(normalizePositive(100, 100)).toBe(100);
  });

  it("maxValue 초과는 100 clamp", () => {
    expect(normalizePositive(200, 100)).toBe(100);
  });

  it("undefined/0 maxValue 안전 처리", () => {
    expect(normalizePositive(undefined, 100)).toBe(0);
    expect(normalizePositive(50, 0)).toBe(0);
  });
});

describe("normalizeInverse", () => {
  it("값이 작을수록 큰 점수", () => {
    expect(normalizeInverse(0, 100)).toBe(100);
    expect(normalizeInverse(50, 100)).toBe(50);
    expect(normalizeInverse(100, 100)).toBe(0);
  });

  it("maxValue 초과는 0 clamp", () => {
    expect(normalizeInverse(200, 100)).toBe(0);
  });

  it("undefined 입력 처리", () => {
    expect(normalizeInverse(undefined, 100)).toBe(100);
  });
});

describe("weightedAverage", () => {
  it("가중평균 계산", () => {
    expect(
      weightedAverage([
        { value: 80, weight: 0.4 },
        { value: 60, weight: 0.6 },
      ]),
    ).toBeCloseTo(68, 5);
  });

  it("가중치 합이 1이 아니어도 정규화", () => {
    expect(
      weightedAverage([
        { value: 100, weight: 2 },
        { value: 0, weight: 2 },
      ]),
    ).toBe(50);
  });

  it("빈 배열 → 0", () => {
    expect(weightedAverage([])).toBe(0);
  });

  it("가중치 합 0 → 0", () => {
    expect(
      weightedAverage([
        { value: 50, weight: 0 },
        { value: 100, weight: 0 },
      ]),
    ).toBe(0);
  });

  it("NaN 값/가중치 안전 처리", () => {
    expect(
      weightedAverage([
        { value: NaN, weight: 1 },
        { value: 100, weight: 1 },
      ]),
    ).toBe(50);
  });
});

describe("roundScore", () => {
  it("정수 반올림", () => {
    expect(roundScore(73.6)).toBe(74);
    expect(roundScore(73.4)).toBe(73);
  });

  it("0~100 clamp 후 반올림", () => {
    expect(roundScore(150)).toBe(100);
    expect(roundScore(-5)).toBe(0);
  });
});

describe("toFiniteNumber", () => {
  it("유한 숫자는 그대로", () => {
    expect(toFiniteNumber(42)).toBe(42);
    expect(toFiniteNumber(0)).toBe(0);
    expect(toFiniteNumber(-1)).toBe(-1);
  });

  it("undefined/null/NaN/Infinity → 0", () => {
    expect(toFiniteNumber(undefined)).toBe(0);
    expect(toFiniteNumber(null)).toBe(0);
    expect(toFiniteNumber(NaN)).toBe(0);
    expect(toFiniteNumber(Infinity)).toBe(0);
    expect(toFiniteNumber(-Infinity)).toBe(0);
  });
});
