/**
 * Job posting service. 묶음 D — 장애인 구인 정보.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const jobPostingService = {
  /** 시군구의 JobPosting 목록 */
  getJobPostingsByRegion(regionCode: string) {
    return callAdapter("job", () =>
      getDataAdapter().fetchJobPostingsByRegion(regionCode),
    );
  },
};
