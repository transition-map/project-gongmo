/**
 * Institution service. 묶음 B·C·E·F가 모두 InstitutionSummary로 표현되므로
 * datasetCategory는 통합 도메인이라 undefined.
 */

import type { InstitutionType } from "../types";
import { callAdapter, getDataAdapter } from "./_adapter";

export const institutionService = {
  /** 시군구의 InstitutionSummary 목록 (모든 institutionType 포함) */
  getInstitutionsByRegion(regionCode: string) {
    return callAdapter("institution", () =>
      getDataAdapter().fetchInstitutionsByRegion(regionCode),
    );
  },

  /** institutionType별 전국 InstitutionSummary 목록 */
  getInstitutionsByType(institutionType: InstitutionType) {
    return callAdapter("institution", () =>
      getDataAdapter().fetchInstitutionsByType(institutionType),
    );
  },
};
