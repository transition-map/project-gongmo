/**
 * mockAdapter — 4단계 mock 데이터를 DataAdapter로 노출하는 **유일한** 모듈.
 *
 * - 다른 service / adapter는 `src/data/mocks`를 직접 import하지 않는다.
 * - 배열 응답은 항상 shallow copy를 반환한다 (호출자의 sort·splice·push로
 *   원본 mock이 오염되는 것을 방지).
 *   - `[...arr]` 또는 `arr.filter(...)` 결과를 그대로 사용 (filter는 이미 새 배열).
 * - 단일 객체 응답은 그대로 반환한다 (사용자 §3 — shallow copy는 배열 한정).
 * - 모든 함수는 `Promise<T>`로 반환해 httpAdapter와 시그니처를 일치시킨다.
 *   인공 지연(setTimeout 등)은 넣지 않는다.
 */

import type { DataAdapter } from "../_adapter";
import {
  careerExperiencePrograms,
  employmentOutcomes,
  institutions,
  jobPostings,
  mobilityAccess,
  recommendations,
  regions,
  schools,
  trainingPrograms,
  transitionIndexes,
  welfareFacilities,
} from "../../data/mocks";

export const mockAdapter: DataAdapter = {
  async fetchRegions() {
    return [...regions];
  },

  async fetchRegionByCode(regionCode) {
    return regions.find((r) => r.regionCode === regionCode);
  },

  async fetchSchoolsByRegion(regionCode) {
    // filter는 새 배열을 반환하므로 추가 shallow copy 불필요.
    return schools.filter((s) => s.region?.regionCode === regionCode);
  },

  async fetchInstitutionsByRegion(regionCode) {
    return institutions.filter((i) => i.region?.regionCode === regionCode);
  },

  async fetchInstitutionsByType(institutionType) {
    return institutions.filter((i) => i.institutionType === institutionType);
  },

  async fetchTrainingProgramsByRegion(regionCode) {
    return trainingPrograms.filter(
      (t) => t.region?.regionCode === regionCode,
    );
  },

  async fetchCareerExperienceProgramsByRegion(regionCode) {
    return careerExperiencePrograms.filter(
      (c) => c.region?.regionCode === regionCode,
    );
  },

  async fetchJobPostingsByRegion(regionCode) {
    return jobPostings.filter((j) => j.region?.regionCode === regionCode);
  },

  async fetchEmploymentOutcomeByRegion(regionCode) {
    return employmentOutcomes.find((e) => e.regionCode === regionCode);
  },

  async fetchWelfareFacilitiesByRegion(regionCode) {
    return welfareFacilities.filter(
      (w) => w.region?.regionCode === regionCode,
    );
  },

  async fetchMobilityAccessByRegion(regionCode, baseYear) {
    return mobilityAccess.filter(
      (m) =>
        m.regionCode === regionCode &&
        (baseYear === undefined || m.meta?.baseYear === baseYear),
    );
  },

  async fetchTransitionIndexByRegion(regionCode) {
    return transitionIndexes.find((t) => t.regionCode === regionCode);
  },

  async fetchRecommendationsByRegion(regionCode) {
    return recommendations.find(
      (r) => r.context?.regionCode === regionCode,
    );
  },
};
