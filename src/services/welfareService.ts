/**
 * Welfare service. 묶음 E — 장애인복지관·주간이용시설·직업재활시설.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const welfareService = {
  /** 시군구의 WelfareFacility 목록 */
  getWelfareFacilitiesByRegion(regionCode: string) {
    return callAdapter("welfare", () =>
      getDataAdapter().fetchWelfareFacilitiesByRegion(regionCode),
    );
  },
};
