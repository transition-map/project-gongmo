/**
 * 묶음 C — CareerExperienceProgram mock (12개).
 * 4개 careerExperienceCenter × 3프로그램.
 * experienceType은 다양하게 분포한다(field/lecture/online/mentoring/other).
 */

import type {
  CareerExperienceProgram,
  CareerExperienceType,
} from "../../types";
import { institutions } from "./institutions.mock";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_SOURCE_UPDATED_AT,
  makeCareerProgramId,
} from "./_shared";

const careerCenters = institutions.filter(
  (i) => i.institutionType === "careerExperienceCenter",
);

interface CareerEntry {
  shortName: string;
  experienceType: CareerExperienceType;
  jobCode?: string;
  ncsCode?: string;
  startDate: string;
  endDate: string;
  durationHours: number;
  targetGrade: string;
  capacity: number;
  accessibility: string[];
}

const THREE_PROGRAMS: CareerEntry[] = [
  { shortName: "지역사업장 직업체험", experienceType: "field", jobCode: "DEMO-S-201", ncsCode: "13-1-005-2", startDate: "2025-10-15", endDate: "2025-10-15", durationHours: 6, targetGrade: "고2~고3", capacity: 12, accessibility: ["휠체어 동선"] },
  { shortName: "전문가 멘토링 진로탐색", experienceType: "mentoring", jobCode: "DEMO-S-202", startDate: "2025-11-20", endDate: "2025-11-20", durationHours: 3, targetGrade: "고1~고3", capacity: 16, accessibility: [] },
  { shortName: "온라인 진로탐색 모듈", experienceType: "online", ncsCode: "20-1-001-1", startDate: "2025-09-01", endDate: "2026-02-28", durationHours: 12, targetGrade: "중3~고3", capacity: 30, accessibility: ["수어통역", "자막"] },
];

export const careerExperiencePrograms: CareerExperienceProgram[] =
  careerCenters.flatMap((center) =>
    THREE_PROGRAMS.map<CareerExperienceProgram>((p) => ({
      programId: makeCareerProgramId(
        `${center.region?.regionCode}-${center.institutionName}-${p.shortName}`,
      ),
      programName: `${p.shortName} (시연용)`,

      institutionId: center.institutionId,
      institutionName: center.institutionName,

      region: center.region,

      experienceType: p.experienceType,
      jobCode: p.jobCode,
      ncsCode: p.ncsCode,

      startDate: p.startDate,
      endDate: p.endDate,
      durationHours: p.durationHours,

      targetGrade: p.targetGrade,
      capacity: p.capacity,

      accessibilityFeatures: p.accessibility,

      source: "demo:꿈길",
      meta: {
        source: "demo:꿈길",
        datasetCategory: "C",
        sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
        collectedAt: DEMO_COLLECTED_AT,
        license: DEMO_LICENSE,
      },
    })),
  );
