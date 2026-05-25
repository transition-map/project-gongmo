/**
 * 6단계 지표 계산 모듈 barrel.
 *
 * - `buildTransitionIndex`가 통합 진입점.
 * - 도메인 산식 함수와 `extractRawMetrics`도 노출하여 단위 테스트(9단계) 또는
 *   화면(7단계)의 부분 호출을 지원한다.
 *
 * 본 모듈은 mock 데이터·service를 import하지 않는다 (pure function 모음).
 * 컴포넌트 연결은 7단계.
 */

// 통합 진입 함수와 입력 타입
export { buildTransitionIndex } from "./buildTransitionIndex";
export type { TransitionIndexInput } from "./buildTransitionIndex";

// 도메인 산식 함수 (단위 테스트·부분 호출용)
export {
  computeAccessibilityIndex,
  computeDemandIndex,
  computeEmploymentIndex,
  computeSchoolSupportIndex,
  computeTrainingSupplyIndex,
  computeTransitionGapIndex,
  computeWelfareIndex,
  extractRawMetrics,
} from "./calculateIndicators";
export type { ExtractRawMetricsInput } from "./calculateIndicators";

// 정규화 헬퍼 (테스트·다른 모듈 재사용용)
export {
  clampScore,
  normalizeInverse,
  normalizePositive,
  roundScore,
  safeDivide,
  toFiniteNumber,
  weightedAverage,
} from "./normalization";

// 가중치·임계값·키·버전 상수
export {
  DOMAIN_THRESHOLDS,
  DOMAIN_WEIGHTS,
  INDICATOR_VERSION,
  RAW_KEYS,
  TRANSITION_GAP_WEIGHTS,
} from "./config";
