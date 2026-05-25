/**
 * Mobility service. 묶음 F — 이동권·접근성 시군구 집계.
 *
 * MobilityAccess는 시군구 × baseYear(2025, 2026) = 12개의 mock이 있으므로
 * baseYear 파라미터로 필터링한다. 미지정 시 시군구의 모든 baseYear 항목 반환.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const mobilityService = {
  /**
   * 시군구의 MobilityAccess 목록.
   * @param regionCode 시군구 코드
   * @param baseYear   특정 기준연도만 필터링하고자 할 때 (예: 2026). 생략 시 전체.
   */
  getMobilityAccessByRegion(regionCode: string, baseYear?: number) {
    return callAdapter(
      "mobility",
      () => getDataAdapter().fetchMobilityAccessByRegion(regionCode, baseYear),
      baseYear === undefined ? undefined : { baseYear },
    );
  },
};
