/**
 * httpAdapter — stub.
 *
 * 5단계에서는 실제 fetch 구현을 하지 않는다. 모든 함수는 호출 즉시 throw하며,
 * service layer의 `callAdapter()`가 이를 catch하여 `ApiResponse.success: false` /
 * `error.code: "FETCH_FAILED"`로 변환한다.
 *
 * 실구현은 8단계(데이터 수집 파이프라인) 또는 별도 백엔드 도입 시점에 진행한다.
 */

import type { DataAdapter } from "../_adapter";

const NOT_IMPL =
  "httpAdapter is not implemented in stage 5; use mockAdapter (set VITE_DATA_SOURCE=mock or unset).";

function notImplemented(): never {
  throw new Error(NOT_IMPL);
}

export const httpAdapter: DataAdapter = {
  async fetchRegions() {
    notImplemented();
  },
  async fetchRegionByCode(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchSchoolsByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchInstitutionsByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchInstitutionsByType(_institutionType) {
    void _institutionType;
    notImplemented();
  },
  async fetchTrainingProgramsByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchCareerExperienceProgramsByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchJobPostingsByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchEmploymentOutcomeByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchWelfareFacilitiesByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchMobilityAccessByRegion(_regionCode, _baseYear) {
    void _regionCode;
    void _baseYear;
    notImplemented();
  },
  async fetchTransitionIndexByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
  async fetchRecommendationsByRegion(_regionCode) {
    void _regionCode;
    notImplemented();
  },
};
