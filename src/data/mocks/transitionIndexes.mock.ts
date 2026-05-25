/**
 * 시군구 단위 통합 지표 mock.
 *
 * - **모든 값은 손으로 정한 demo 값**이며, 산식 함수로 계산된 결과가 아니다.
 *   실제 산식·가중치는 7단계 `src/lib/indicators/`에서 구현한다.
 * - 6개 시군구는 의도된 4가지 패턴을 보이도록 차등 부여:
 *   - 강남구: 양호 패턴 (gap ↓)
 *   - 해운대구: 중간
 *   - 수원시 영통구: 수요폭증형 (gap ↑)
 *   - 청주시 흥덕구: 복지 빈약 패턴
 *   - 목포시: 접근성 취약 패턴 (gap ↑)
 *   - 춘천시: 훈련 공급 취약 패턴
 */

import type { TransitionIndex } from "../../types";
import {
  DEMO_BASE_YEAR,
  DEMO_CALCULATED_AT,
  DEMO_COLLECTED_AT,
  DEMO_INDICATOR_VERSION,
  DEMO_SOURCE_UPDATED_AT,
} from "./_shared";

const NOTE = "manual demo values; formula not implemented yet";

interface DemoIndexInput {
  regionCode: string;
  demand: number;
  schoolSupport: number;
  trainingSupply: number;
  employment: number;
  welfare: number;
  accessibility: number;
  transitionGap: number;
  /** 라벨링용 패턴 설명 (rawMetrics에 함께 보관) */
  patternLabel: string;
}

function build(input: DemoIndexInput): TransitionIndex {
  return {
    regionCode: input.regionCode,
    rawMetrics: {
      // 산식이 미구현 상태이므로 정규화 점수만 보관. 실제 raw 입력값은 7단계.
      patternLabelHash: input.patternLabel.length,
      demoBaseYear: DEMO_BASE_YEAR,
    },
    normalizedScores: {
      demand: input.demand,
      schoolSupport: input.schoolSupport,
      trainingSupply: input.trainingSupply,
      employment: input.employment,
      welfare: input.welfare,
      accessibility: input.accessibility,
    },
    indicators: {
      demandIndex: input.demand,
      schoolSupportIndex: input.schoolSupport,
      trainingSupplyIndex: input.trainingSupply,
      employmentIndex: input.employment,
      welfareIndex: input.welfare,
      accessibilityIndex: input.accessibility,
      transitionGapIndex: input.transitionGap,
    },
    indicatorVersion: DEMO_INDICATOR_VERSION,
    calculatedAt: DEMO_CALCULATED_AT,
    baseYear: DEMO_BASE_YEAR,
    sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
    collectedAt: DEMO_COLLECTED_AT,
  };
}

export const transitionIndexes: TransitionIndex[] = [
  build({
    regionCode: "DEMO-SIGUNGU-01",
    demand: 42,
    schoolSupport: 72,
    trainingSupply: 68,
    employment: 78,
    welfare: 70,
    accessibility: 82,
    transitionGap: 30,
    patternLabel: "good-balance",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-02",
    demand: 55,
    schoolSupport: 60,
    trainingSupply: 58,
    employment: 62,
    welfare: 64,
    accessibility: 66,
    transitionGap: 50,
    patternLabel: "moderate",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-03",
    demand: 88,
    schoolSupport: 55,
    trainingSupply: 48,
    employment: 60,
    welfare: 42,
    accessibility: 58,
    transitionGap: 78,
    patternLabel: "demand-surge",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-04",
    demand: 58,
    schoolSupport: 62,
    trainingSupply: 60,
    employment: 66,
    welfare: 38,
    accessibility: 64,
    transitionGap: 52,
    patternLabel: "welfare-weak",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-05",
    demand: 44,
    schoolSupport: 55,
    trainingSupply: 42,
    employment: 46,
    welfare: 58,
    accessibility: 28,
    transitionGap: 71,
    patternLabel: "accessibility-weak",
  }),
  build({
    regionCode: "DEMO-SIGUNGU-06",
    demand: 52,
    schoolSupport: 60,
    trainingSupply: 30,
    employment: 50,
    welfare: 54,
    accessibility: 48,
    transitionGap: 63,
    patternLabel: "training-supply-weak",
  }),
  // 11-2 1차-11 신규 — 시연용 partial/skeletal region.
  // 모든 도메인 지수 0 + transitionGap 60 = ETL Policy A 시뮬레이션 결과와 동일:
  //   0*0.40 + (100-0)*0.15*3 + (100-0)*0.10*3 = 0 + 45 + 30 = 60.
  // 60은 실제 전환교육 공백이 아니라 데이터 부재 상태에서 산식이 산출한 기본값.
  // Dashboard는 partialRegionFlag=true를 보고 별도 badge로 시각 구분 표시 (11-2 1차-11).
  build({
    regionCode: "DEMO-SIGUNGU-07-PARTIAL",
    demand: 0,
    schoolSupport: 0,
    trainingSupply: 0,
    employment: 0,
    welfare: 0,
    accessibility: 0,
    transitionGap: 60,
    patternLabel: "skeletal-partial-demo",
  }),
];

/** mock 데이터 검증·디버깅용 라벨 */
export const TRANSITION_INDEX_NOTE = NOTE;
