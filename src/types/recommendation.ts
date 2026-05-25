import type { DataSourceMeta } from "./common";
import type { SchoolType } from "./school";

/** 추천 후보가 가리키는 엔티티 종류 */
export type RecommendationCandidateType =
  | "school"
  | "institution"
  | "trainingProgram"
  | "careerProgram"
  | "jobPosting";

/** 추천 근거 항목 */
export interface RecommendationEvidence {
  label: string;
  value: string;
  source?: string;
}

/**
 * 단일 추천 후보. AI/규칙 기반으로 점수화된 결과 1건.
 *
 * - reason: 사용자에게 보이는 한 줄 설명 (왜 추천되었는가)
 * - caution: 동행/사전 협의 등 주의사항. 추천이 최종 결정이 아님을 환기.
 * - evidence: 근거 데이터 항목 (공백 유형, 학생 입력값, 지표 등)
 */
export interface RecommendationCandidate {
  candidateId: string;
  candidateType: RecommendationCandidateType;
  candidateName: string;

  /** 후보가 속한 시군구 (지도 표시·필터용) */
  regionCode?: string;

  /** 매칭 점수 0~100 (높을수록 더 적합한 후보) */
  matchScore?: number;
  /** 매칭에 기여한 항목 라벨 (예: "관심 분야 일치", "이동 범위 일치") */
  matchReasons?: string[];

  reason: string;
  caution?: string;
  evidence?: RecommendationEvidence[];

  meta?: DataSourceMeta;
}

/**
 * **비식별 추천 컨텍스트.**
 *
 * 추천 후보 산출 시 화면 입력 단계로부터 받은 선호·환경 정보를 표현한다.
 *
 * **금지 항목 (PII):** 이름, 주민등록번호, 생년월일, 연락처, 이메일, 주소(읍면동 이하),
 * 보호자 정보, 사진, 상세 진단정보(장애 등급/판정일/세부 진단명 등). 이 필드들은
 * 본 타입에 절대 추가하지 않는다.
 *
 * **장애유형 필드 금지:** 장애유형만으로 직업 가능성을 제한하는 형태의 필드는
 * 만들지 않는다. 장애유형별 통계는 `DisabilityCategoryBreakdown`(집계 전용)에서만
 * 다룬다.
 */
export interface RecommendationContext {
  /** 시군구 단위 분석 컨텍스트 */
  regionCode?: string;
  /** 학교 단위 분석 컨텍스트 */
  schoolId?: string;
  /** 학교 유형 (필터링·우선순위에 사용. 진단정보 아님) */
  schoolType?: SchoolType;

  /** 선호 직업 코드(KECO 등) */
  preferredJobCodes?: string[];
  /** 선호 NCS 능력단위 코드 */
  preferredNcsCodes?: string[];

  /** 이동 가능 최대 거리(km) */
  maxDistanceKm?: number;
  /**
   * 이동·접근 보조 필요 항목 라벨 (예: "휠체어 동선", "수어통역", "보호자 동행").
   * 개인 진단정보가 아닌, 환경 보조 필요 라벨만 허용한다.
   */
  mobilityNeeds?: string[];

  /**
   * 위 항목으로 표현되지 않는 추가 선호값.
   * **PII 금지.** 화면 입력 단계의 비식별 boolean/number/string 선호값만 허용한다.
   */
  additionalPreferences?: Record<string, string | number | boolean>;
}

/**
 * 추천 결과 묶음. 컴포넌트 RecommendationResult.tsx와 식별자가 동일하나,
 * import 시 `import type { RecommendationResult as RecommendationResultData }`
 * 형태의 alias 사용을 권장한다.
 *
 * 추천은 항상 "최종 판단이 아닌 후보 제안"이라는 전제를 globalCaution으로 표현한다.
 */
export interface RecommendationResult {
  recommendationId?: string;
  /** 결과 생성 시각 (ISO 8601) */
  generatedAt: string;

  /**
   * 추천 컨텍스트(비식별).
   * 자세한 허용·금지 규칙은 `RecommendationContext` JSDoc 참고.
   */
  context?: RecommendationContext;

  candidates: RecommendationCandidate[];

  // === 메타 ===
  summary?: string;
  /** "교사 검토 후 활용" 등 전체 결과에 대한 주의사항 */
  globalCaution?: string;
  indicatorVersion?: string;
}
