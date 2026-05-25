/**
 * 정규화 helper. 모든 함수는 pure하며 NaN/undefined를 0으로 처리한다.
 *
 * 사용 규약:
 * - `clampScore`: 0~100 범위로 강제
 * - `safeDivide`: 분모 0 / 비유한값 시 fallback (기본 0)
 * - `normalizePositive`: 값이 클수록 좋음 (0~maxValue → 0~100, 초과는 100 clamp)
 * - `normalizeInverse`: 값이 작을수록 좋음 (0 → 100, maxValue 도달 → 0)
 * - `weightedAverage`: 가중치 합으로 나눠 가중평균 (가중치 합 != 1 허용)
 * - `roundScore`: 0~100 clamp + 정수 반올림
 */

/** undefined·NaN·Infinity를 0으로 변환. 그 외는 그대로. */
export function toFiniteNumber(value: number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
}

/** 0~100 범위 강제. NaN/undefined는 0. */
export function clampScore(value: number | undefined | null): number {
  const v = toFiniteNumber(value);
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/** 분모 0 또는 비유한값일 때 fallback 반환. */
export function safeDivide(
  numerator: number | undefined | null,
  denominator: number | undefined | null,
  fallback = 0,
): number {
  const n = toFiniteNumber(numerator);
  const d = toFiniteNumber(denominator);
  if (d === 0) return fallback;
  const result = n / d;
  return Number.isFinite(result) ? result : fallback;
}

/** 값이 클수록 좋음. (value/maxValue) * 100, 0~100 clamp. */
export function normalizePositive(
  value: number | undefined | null,
  maxValue: number,
): number {
  if (maxValue <= 0) return 0;
  return clampScore(safeDivide(toFiniteNumber(value), maxValue) * 100);
}

/** 값이 작을수록 좋음. 100 - normalizePositive(value, maxValue). */
export function normalizeInverse(
  value: number | undefined | null,
  maxValue: number,
): number {
  if (maxValue <= 0) return 100;
  return clampScore(100 - safeDivide(toFiniteNumber(value), maxValue) * 100);
}

/**
 * 가중평균. 가중치 합이 0이면 0 반환.
 * `value`/`weight`의 NaN/undefined는 0 처리.
 */
export function weightedAverage(
  items: Array<{ value: number | undefined | null; weight: number }>,
): number {
  if (items.length === 0) return 0;
  let sum = 0;
  let totalWeight = 0;
  for (const item of items) {
    const v = toFiniteNumber(item.value);
    const w = toFiniteNumber(item.weight);
    if (w === 0) continue;
    sum += v * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return sum / totalWeight;
}

/** 최종 점수: 0~100 clamp 후 정수 반올림. */
export function roundScore(value: number | undefined | null): number {
  return Math.round(clampScore(value));
}
