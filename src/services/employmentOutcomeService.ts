/**
 * Employment outcome service. 묶음 D — 장애인경제활동실태조사·의무고용 시군구 집계.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const employmentOutcomeService = {
  /** 시군구의 EmploymentOutcomeSummary. 미존재 시 success: true, data: undefined. */
  getEmploymentOutcomeByRegion(regionCode: string) {
    return callAdapter("employment", () =>
      getDataAdapter().fetchEmploymentOutcomeByRegion(regionCode),
    );
  },
};
