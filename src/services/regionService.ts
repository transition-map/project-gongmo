/**
 * Region service. 묶음 A·B·D·G가 통합된 시군구 단위 요약을 제공.
 * datasetCategory는 통합 도메인이라 undefined.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const regionService = {
  /** 전체 시군구 RegionSummary 목록 */
  getRegions() {
    return callAdapter("region", () => getDataAdapter().fetchRegions());
  },

  /** regionCode로 단일 시군구 조회. 미존재 시 success: true, data: undefined. */
  getRegionByCode(regionCode: string) {
    return callAdapter("region", () =>
      getDataAdapter().fetchRegionByCode(regionCode),
    );
  },
};
