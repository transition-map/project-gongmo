/**
 * Career experience service. 묶음 C — 꿈길 등 진로체험 프로그램.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const careerExperienceService = {
  /** 시군구의 CareerExperienceProgram 목록 */
  getCareerExperienceProgramsByRegion(regionCode: string) {
    return callAdapter("career", () =>
      getDataAdapter().fetchCareerExperienceProgramsByRegion(regionCode),
    );
  },
};
