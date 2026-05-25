/**
 * Public type barrel.
 *
 * 모든 도메인 타입은 이 모듈에서 re-export 한다.
 * 컴포넌트는 `import type { X } from "../types"` 형태로 접근한다.
 *
 * 하단 `Legacy aliases` 섹션은 단일 도메인 프로토타입 시절의 타입을
 * 새 도메인 타입에 정합하도록 유지하기 위한 것이다.
 * 새 코드에서는 alias가 아닌 정식 타입을 사용한다.
 */

// === Domain types ===
export type {
  CoordinateSource,
  DataSourceMeta,
  DatasetCategory,
  DisabilityCategoryBreakdown,
  GeocodingStatus,
  PaginationMeta,
  RegionCodeType,
} from "./common";
export type { Coordinate } from "./common";

export type {
  GapType,
  RegionRef,
  RegionSummary,
  YearlySupportEntry,
} from "./region";

export type { SchoolSummary, SchoolType } from "./school";

export type { InstitutionSummary, InstitutionType } from "./institution";

export type {
  CareerExperienceProgram,
  CareerExperienceType,
  JobNcsMapping,
  TrainingApplicationStatus,
  TrainingProgram,
} from "./training";

export type {
  EmploymentOutcomeSummary,
  EmploymentType,
  JobPosting,
} from "./employment";

export type { WelfareFacility, WelfareFacilityType } from "./welfare";

export type { MobilityAccess } from "./mobility";

export type {
  IndicatorValues,
  NormalizedScores,
  RawMetrics,
  TransitionIndex,
} from "./indicator";

export type {
  RecommendationCandidate,
  RecommendationCandidateType,
  RecommendationContext,
  RecommendationEvidence,
  RecommendationResult,
} from "./recommendation";

export type { ApiError, ApiMeta, ApiResponse, PaginatedResponse } from "./api";

export type { DataQualityIssue, DataQualitySeverity } from "./dataQuality";

// 11-3 1차-89 — 비식별 학생 시나리오 + 자료 기반 맞춤 경로 보고서 (schema-only).
// UI 통합은 1차-91+ 별도 단계. mainIssue / policyUse / teacherUse 데이터 필드 무수정.
export type {
  GapTrendSignal,
  RouteCandidate,
  ScenarioReport,
  ScenarioReportLicense,
  StudentScenario,
  StudentScenarioInterest,
} from "./scenario";

// =====================================================================
// Legacy aliases (단일 도메인 프로토타입 시절 타입)
//
// 기존 mock 데이터(src/data/regions.json)와 컴포넌트 import 경로 호환을 위해
// 일정 기간 유지한다. 새 코드는 위쪽 정식 타입을 사용한다.
// =====================================================================
import type { RegionSummary, YearlySupportEntry } from "./region";
import type { RecommendationCandidate } from "./recommendation";

/**
 * @deprecated `RegionSummary` 사용. 기존 regions.json의 `region` 필드 호환을 위한 alias.
 *
 * 기존 컴포넌트는 `selectedRegion.region`을 참조한다. RegionSummary가 이제
 * `regionName`과 `regionCode`를 제공하지만, 기존 mock에서는 표시명을 그대로
 * `region` 필드에 갖고 있어 한동안 같이 둔다.
 */
export type RegionData = RegionSummary & {
  region: string;
  /** legacy: indicators.transitionGapIndex로 이관 예정 */
  currentGapIndex: number;
  /** legacy: 추세위험도 0~100 */
  trendRiskScore: number;
  /** legacy: 5년 자원량 변화율(%) */
  supportChange: number;
  /** legacy: 5종 분류 */
  gapType: import("./region").GapType;
  mainIssue: string;
  policyUse: string;
  teacherUse: string;
  yearlySupport: YearlySupportEntry[];
  currentYear: number;
};

/** @deprecated `YearlySupportEntry` 사용 */
export type YearlySupport = YearlySupportEntry;

/** @deprecated `RecommendationCandidate` 사용. 기존 recommendations.json 호환 alias. */
export interface Recommendation {
  id: string;
  region: string;
  programName: string;
  targetProfile: {
    careerInterest: string;
    mobilityRange: string;
    supportLevel: string;
  };
  reason: string;
  accessibility: string;
  relatedAgency: string;
  teacherMemo: string;
  alternativePath: string;
  evidenceData: string[];
  /** legacy mapping helper — 새 코드는 RecommendationCandidate를 사용 */
  toCandidate?: () => RecommendationCandidate;
}

/**
 * 학생 프로필 입력값 (legacy).
 * **개인식별정보가 아니다.** 화면 단계 비식별 선호값으로만 사용되며 저장되지 않는다.
 * 새 코드는 `RecommendationResult.contextProfile`로 흡수된다.
 */
export interface StudentProfile {
  region: string;
  supportNeed: string;
  careerInterest: string;
  mobilityRange: string;
  activityPreference: string;
  supportLevel: string;
}

/** legacy — 학생 프로필 화면의 select/radio 옵션. 새 코드에서도 그대로 사용 가능. */
export interface StudentProfileOptions {
  regions: string[];
  supportNeeds: string[];
  careerInterests: string[];
  mobilityRanges: string[];
  activityPreferences: string[];
  supportLevels: string[];
}

/** legacy — 현재 단일 컴포넌트 라우터의 섹션 식별자 */
export type SectionId =
  | "dashboard"
  | "regional"
  | "profile"
  | "recommendation"
  | "ai-outputs";
