/**
 * 묶음 D — EmploymentOutcomeSummary mock (6개, 시군구당 1).
 * 장애인경제활동실태조사·의무고용 현황의 시군구 단위 집계 가정.
 */

import type { EmploymentOutcomeSummary } from "../../types";
import {
  DEMO_BASE_YEAR,
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_SOURCE_UPDATED_AT,
} from "./_shared";

interface OutcomeEntry {
  regionCode: string;
  totalDisabledPopulation: number;
  economicallyActiveCount: number;
  employedCount: number;
  unemploymentRate: number;
  obligatoryEmploymentTargetCount: number;
  obligatoryEmploymentActualCount: number;
  activeJobPostingCount: number;
}

const ENTRIES: OutcomeEntry[] = [
  { regionCode: "DEMO-SIGUNGU-01", totalDisabledPopulation: 18_400, economicallyActiveCount: 7_120, employedCount: 6_580, unemploymentRate: 7.6, obligatoryEmploymentTargetCount: 980, obligatoryEmploymentActualCount: 870, activeJobPostingCount: 26 },
  { regionCode: "DEMO-SIGUNGU-02", totalDisabledPopulation: 16_700, economicallyActiveCount: 6_180, employedCount: 5_640, unemploymentRate: 8.7, obligatoryEmploymentTargetCount: 740, obligatoryEmploymentActualCount: 610, activeJobPostingCount: 22 },
  { regionCode: "DEMO-SIGUNGU-03", totalDisabledPopulation: 12_900, economicallyActiveCount: 4_980, employedCount: 4_420, unemploymentRate: 11.2, obligatoryEmploymentTargetCount: 820, obligatoryEmploymentActualCount: 670, activeJobPostingCount: 28 },
  { regionCode: "DEMO-SIGUNGU-04", totalDisabledPopulation: 13_500, economicallyActiveCount: 5_120, employedCount: 4_700, unemploymentRate: 8.2, obligatoryEmploymentTargetCount: 540, obligatoryEmploymentActualCount: 470, activeJobPostingCount: 18 },
  { regionCode: "DEMO-SIGUNGU-05", totalDisabledPopulation: 11_800, economicallyActiveCount: 4_240, employedCount: 3_780, unemploymentRate: 10.8, obligatoryEmploymentTargetCount: 420, obligatoryEmploymentActualCount: 320, activeJobPostingCount: 12 },
  { regionCode: "DEMO-SIGUNGU-06", totalDisabledPopulation: 12_200, economicallyActiveCount: 4_560, employedCount: 4_080, unemploymentRate: 10.5, obligatoryEmploymentTargetCount: 480, obligatoryEmploymentActualCount: 380, activeJobPostingCount: 16 },
];

export const employmentOutcomes: EmploymentOutcomeSummary[] = ENTRIES.map(
  (e) => {
    const employmentRate =
      Math.round(
        (e.employedCount / e.economicallyActiveCount) * 1000,
      ) / 10;
    const obligatoryRate =
      Math.round(
        (e.obligatoryEmploymentActualCount /
          e.obligatoryEmploymentTargetCount) *
          1000,
      ) / 10;
    return {
      regionCode: e.regionCode,
      baseYear: DEMO_BASE_YEAR,

      totalDisabledPopulation: e.totalDisabledPopulation,
      economicallyActiveCount: e.economicallyActiveCount,
      employedCount: e.employedCount,
      employmentRate,
      unemploymentRate: e.unemploymentRate,

      obligatoryEmploymentTargetCount: e.obligatoryEmploymentTargetCount,
      obligatoryEmploymentActualCount: e.obligatoryEmploymentActualCount,
      obligatoryEmploymentRate: obligatoryRate,

      activeJobPostingCount: e.activeJobPostingCount,

      meta: {
        source: "demo:장애인경제활동실태조사+의무고용현황",
        datasetCategory: "D",
        baseYear: DEMO_BASE_YEAR,
        sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
        collectedAt: DEMO_COLLECTED_AT,
        license: DEMO_LICENSE,
      },
    };
  },
);
