/**
 * School service. 묶음 B (학교·교육 여건).
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const schoolService = {
  /** 시군구의 SchoolSummary 목록 */
  getSchoolsByRegion(regionCode: string) {
    return callAdapter("school", () =>
      getDataAdapter().fetchSchoolsByRegion(regionCode),
    );
  },
};
