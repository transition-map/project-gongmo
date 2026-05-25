import type { DataSourceMeta } from "./common";
import type { RegionRef } from "./region";

/** 훈련과정 모집 상태 */
export type TrainingApplicationStatus =
  | "open"
  | "closed"
  | "ongoing"
  | "scheduled";

/** 진로체험 형태 */
export type CareerExperienceType =
  | "field"      // 현장 체험
  | "lecture"    // 강의·세미나
  | "online"     // 온라인 체험
  | "mentoring"  // 멘토링
  | "other";

/**
 * 묶음 C — HRD-Net, 발달장애인훈련센터, 민간훈련기관 등의 훈련과정.
 *
 * trainingProgramId 형식: `training:{source}:{sourceId|hash}`
 */
export interface TrainingProgram {
  trainingProgramId: string;
  programName: string;

  // === 운영 기관 ===
  institutionId?: string;
  institutionName?: string;

  // === 위치 ===
  region?: RegionRef;

  // === 직업·역량 코드 (CLAUDE.md §6.5) ===
  jobCode?: string;          // KECO 우선
  ncsCode?: string;          // NCS 능력단위 (XX-X-XXX-X)
  worknetJobCode?: string;   // 워크넷 원천 코드 (있을 때만)

  // === 일정 ===
  startDate?: string;        // ISO 8601 (YYYY-MM-DD 또는 datetime)
  endDate?: string;
  totalHours?: number;

  // === 모집 ===
  capacity?: number;
  applicationStatus?: TrainingApplicationStatus;

  /** 대상 그룹(예: "지적장애 18세 이상") — 통계 라벨링용. 개인 진단정보 금지. */
  targetGroup?: string[];

  fee?: number;
  source?: string;
  meta?: DataSourceMeta;
}

/**
 * 묶음 C — 꿈길 등 진로체험 프로그램.
 *
 * programId 형식: `training:{source}:{sourceId|hash}` 와 동일 네임스페이스를 사용해도 무방.
 */
export interface CareerExperienceProgram {
  programId: string;
  programName: string;

  institutionId?: string;
  institutionName?: string;

  region?: RegionRef;

  experienceType?: CareerExperienceType;
  jobCode?: string;
  ncsCode?: string;

  startDate?: string;
  endDate?: string;
  durationHours?: number;

  /** 학년·학교급 라벨 (집계 단위) */
  targetGrade?: string;
  capacity?: number;

  /** 휠체어 동선·수어통역·자료 점자화 등 가용 보조 항목 */
  accessibilityFeatures?: string[];

  source?: string;
  meta?: DataSourceMeta;
}

/**
 * 직업 코드 ↔ NCS 코드 ↔ 워크넷 코드 매핑.
 * 서로 다른 코드 체계를 결합할 때 본 타입을 통해 연결한다.
 */
export interface JobNcsMapping {
  jobCode?: string;
  ncsCode?: string;
  worknetJobCode?: string;
  /** 매핑 출처 (예: "manual", "kemco-table-2024") */
  mappingSource?: string;
  /** 매핑 신뢰도 0~100 */
  confidence?: number;
}
