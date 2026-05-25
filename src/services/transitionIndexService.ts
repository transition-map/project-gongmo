/**
 * Transition index service. 통합 지표(`TransitionIndex`) 조회.
 *
 * datasetCategory는 통합 도메인이라 undefined.
 * 산식 함수 자체는 6단계 `src/lib/indicators/`에서 구현된다.
 * 본 service는 mock 단계에서는 사전 계산된 demo 지표를 그대로 반환하기만 한다.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const transitionIndexService = {
  /** 시군구의 TransitionIndex. 미존재 시 success: true, data: undefined. */
  getTransitionIndexByRegion(regionCode: string) {
    return callAdapter("index", () =>
      getDataAdapter().fetchTransitionIndexByRegion(regionCode),
    );
  },
};
