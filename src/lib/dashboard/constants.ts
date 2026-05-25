/**
 * Dashboard 계층 공용 상수.
 *
 * - 본 모듈은 `src/data/mocks/_shared.ts`를 직접 import하지 않는다.
 *   UI 계층이 mock 내부 구현에 의존하지 않게 분리한다.
 * - 값이 mock의 DEMO_CALCULATED_AT과 우연히 같지만 코드 의존은 없다.
 */

/**
 * `buildTransitionIndex`의 결정적 호출용 고정 시각 (ISO 8601, KST).
 * 7단계 화면이 매 렌더에서 다른 calculatedAt을 만들지 않도록 고정.
 */
export const DEMO_FIXED_CALCULATED_AT = "2026-05-11T00:00:00+09:00";

/**
 * 모든 지표 산출 기준연도.
 * mobilityAccess가 baseYear별 다중 항목인 경우 이 값으로 필터링한다.
 *
 * 2026 정책: 본 프로토타입은 2026년에 사용되며, 분석 기준연도도 2026으로 통일한다.
 */
export const DEFAULT_BASE_YEAR = 2026;
