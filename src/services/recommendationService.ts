/**
 * Recommendation service. 추천 후보(RecommendationResult) 조회.
 *
 * datasetCategory는 통합 도메인이라 undefined.
 * 본 service는 mock recommendations.mock.ts를 그대로 반환한다.
 * 실제 추천 알고리즘은 6~7단계에서 별도 모듈로 구현 예정.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const recommendationService = {
  /** 시군구의 RecommendationResult. 미존재 시 success: true, data: undefined. */
  getRecommendationsByRegion(regionCode: string) {
    return callAdapter("recommend", () =>
      getDataAdapter().fetchRecommendationsByRegion(regionCode),
    );
  },
};
