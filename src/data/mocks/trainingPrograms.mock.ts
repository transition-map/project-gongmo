/**
 * 묶음 C — TrainingProgram mock (16개).
 * 4개 trainingCenter × 4과정.
 *
 * jobCode·ncsCode는 시연용 형식(XX-X-XXX-X)으로만 표기한다. 실제 NCS·KECO 코드와
 * 정확히 일치시키지 않는다.
 */

import type { TrainingProgram } from "../../types";
import { institutions } from "./institutions.mock";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_SOURCE_UPDATED_AT,
  makeTrainingProgramId,
} from "./_shared";

const trainingCenters = institutions.filter(
  (i) => i.institutionType === "trainingCenter",
);

interface TrainingEntry {
  shortName: string;
  jobCode?: string;
  ncsCode?: string;
  worknetJobCode?: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  capacity: number;
  status: "open" | "closed" | "ongoing" | "scheduled";
  targetGroup: string[];
  fee: number;
}

const FOUR_PROGRAMS: TrainingEntry[] = [
  { shortName: "사무보조기초과정", jobCode: "DEMO-S-101", ncsCode: "20-1-001-1", worknetJobCode: "WK-DEMO-001", startDate: "2025-09-01", endDate: "2025-12-19", totalHours: 320, capacity: 16, status: "ongoing", targetGroup: ["만 18세 이상"], fee: 0 },
  { shortName: "디지털 기초역량과정", jobCode: "DEMO-S-102", ncsCode: "20-2-002-1", startDate: "2026-01-05", endDate: "2026-04-24", totalHours: 280, capacity: 14, status: "scheduled", targetGroup: ["만 18세 이상"], fee: 0 },
  { shortName: "바리스타 보조과정", jobCode: "DEMO-S-103", ncsCode: "13-1-005-2", worknetJobCode: "WK-DEMO-002", startDate: "2025-10-12", endDate: "2026-02-27", totalHours: 360, capacity: 12, status: "ongoing", targetGroup: ["만 18세 이상"], fee: 0 },
  { shortName: "재택형 데이터입력 과정", jobCode: "DEMO-S-104", ncsCode: "20-3-003-1", startDate: "2025-11-03", endDate: "2026-02-13", totalHours: 240, capacity: 18, status: "ongoing", targetGroup: ["만 18세 이상"], fee: 0 },
];

export const trainingPrograms: TrainingProgram[] = trainingCenters.flatMap(
  (center) =>
    FOUR_PROGRAMS.map<TrainingProgram>((p) => ({
      trainingProgramId: makeTrainingProgramId(
        `${center.region?.regionCode}-${center.institutionName}-${p.shortName}`,
      ),
      programName: `${p.shortName} (시연용)`,

      institutionId: center.institutionId,
      institutionName: center.institutionName,

      region: center.region,

      jobCode: p.jobCode,
      ncsCode: p.ncsCode,
      worknetJobCode: p.worknetJobCode,

      startDate: p.startDate,
      endDate: p.endDate,
      totalHours: p.totalHours,

      capacity: p.capacity,
      applicationStatus: p.status,
      targetGroup: p.targetGroup,
      fee: p.fee,

      source: "demo:HRD-Net",
      meta: {
        source: "demo:HRD-Net",
        datasetCategory: "C",
        sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
        collectedAt: DEMO_COLLECTED_AT,
        license: DEMO_LICENSE,
      },
    })),
);
