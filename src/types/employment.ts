import type { Coordinate, DataSourceMeta } from "./common";
import type { RegionRef } from "./region";

/** 고용 형태 */
export type EmploymentType =
  | "fullTime"
  | "partTime"
  | "internship"
  | "temporary"
  | "other";

/**
 * 묶음 D — 장애인 구인 정보 (워크넷 등).
 *
 * jobPostingId 형식: `job:{source}:{sourceId|hash}`
 */
export interface JobPosting {
  jobPostingId: string;
  jobTitle: string;

  // === 사업장 ===
  /** 사업장 = institutionType "employer"의 institutionId 또는 자체 ID */
  employerId?: string;
  employerName?: string;

  // === 위치 ===
  region?: RegionRef;
  address?: string;
  coordinate?: Coordinate;

  // === 직업·역량 코드 ===
  jobCode?: string;
  ncsCode?: string;
  worknetJobCode?: string;

  // === 고용 조건 ===
  employmentType?: EmploymentType;
  vacancyCount?: number;

  // === 일정 ===
  postedAt?: string;        // ISO 8601
  closingAt?: string;

  // === 장애인 친화 ===
  isDisabilityFriendly?: boolean;
  /** 가용 편의(예: "엘리베이터", "수어통역", "재택근무") — 통계 라벨링 */
  accessibilityNotes?: string[];

  source?: string;
  meta?: DataSourceMeta;
}

/**
 * 묶음 D — 장애인경제활동실태조사·의무고용 등 시군구 단위 집계.
 * 개인 단위 데이터 아님.
 */
export interface EmploymentOutcomeSummary {
  regionCode: string;
  baseYear?: number;

  // === 장애인경제활동 ===
  totalDisabledPopulation?: number;
  economicallyActiveCount?: number;
  employedCount?: number;
  /** 고용률 (%) */
  employmentRate?: number;
  /** 실업률 (%) */
  unemploymentRate?: number;

  // === 의무고용 ===
  obligatoryEmploymentTargetCount?: number;
  obligatoryEmploymentActualCount?: number;
  /** 의무고용 이행률 (%) */
  obligatoryEmploymentRate?: number;

  // === 활성 구인 ===
  activeJobPostingCount?: number;

  meta?: DataSourceMeta;
}
