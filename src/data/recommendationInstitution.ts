/**
 * 11-3 1차-175 — recommendation institution fixture + read-only helper.
 *
 * 추천 카드 "기관 후보" 영역 표시용 사람 검수 fixture. 1차-173/174에서 합의된
 * C안 — 1차-158 RecommendationEvidence + 1차-136 region_hierarchy_subset +
 * 1차-67 curatedRegionText 패턴 동형 (사람 검수 fixture + read-only helper).
 *
 * 본 단계는 schema-only + helper 단계 — RouteCandidate.institutionHints schema
 * 추가(1차-177) / buildRouteCandidates.ts 연결(1차-177) / RecommendationResult.tsx
 * "기관 후보" 섹션 표시(1차-179)는 별도 후속 단계로 분리되어 본 helper는 아직
 * 어디서도 호출되지 않는다 (1차-158 RecommendationEvidence와 동형 schema-only
 * 패턴).
 *
 * **출처**: `data/fixtures/recommendation_institution_sample.json` — 사용자
 * 사람 검수 결과만 등록 (Claude Code는 fixture record 작성 0건 — 본 파일은
 * reader/helper only).
 *
 * **fixture 정책 (1차-158 / 1차-136 / 1차-67 동형)**:
 * - 자동 확정 추천이 아님 — `_meta.policy.aiGeneratedAllowed: false` literal /
 *   모든 record `aiGenerated: false` literal 강제.
 * - 실제 기관 매칭 완료가 아님 — `_meta.note`에 명시.
 * - 사람 검수 결과만 등록 — `_meta.policy.humanReviewRequired: true` /
 *   `_meta.policy.minimumReviewFields: ["curator", "reviewedAt"]`.
 * - 본문 전문 복제 금지 — `_meta.policy.fullTextCopyAllowed: false`.
 * - PII 회피 — `_meta.curator`는 가공명·역할명만 (이메일·실명·연락처 금지).
 * - `institutionName`에 "시연용" 또는 "(시연용)" 라벨 강제 (회귀 테스트로 보호).
 * - fake numeric 슬롯 부재 — `schoolCount` / `currentGapIndex` /
 *   `trendRiskScore` / `yearlySupport` / `supportCenterCount` /
 *   `welfareFacilityCount` / `jobPostingCount` 7종 모두 슬롯 없음 (회귀 테스트로 강제).
 *
 * **pure function 정책 (1차-93 / 1차-137 / 1차-158 동형)**:
 * - fetch / process.env / localStorage / sessionStorage 접근 0건.
 * - UI 컴포넌트 import 0건.
 * - `data/mart.real` / `data/master.real` / `data/indicator.real` / `data/raw.api`
 *   직접 import 0건.
 * - `officialResources` 모듈 import 0건 (1차-167+ C안 별도 합의).
 * - 입력 mutate 0건 — 새 배열 반환.
 *
 * **자동 추천 helper 이름 export 금지 (회귀 테스트로 강제)**:
 *   `autoRecommend` / `decidePolicy` / `finalDecision` / `recommendForRegion` /
 *   `matchOfficialResource` / `autoMatch` / `generatePolicy` /
 *   `matchInstitutionComplete` / `realTimeInstitutionRecommend` 등 export 0건.
 *
 * **`selectInstitutionsForCandidate` 우선순위 (1차-175 §6)**:
 *   1. regionCode + evidenceId 모두 일치
 *   2. regionCode + routeType 일치
 *   3. evidenceId 일치
 *   4. routeType 일치
 *   5. 빈 배열
 *   limit 기본값 3 / 중복 institutionId 제거 / 반환 배열은 새 배열.
 *
 * UI 통합은 1차-179+ 별도 단계 (`RecommendationResult.tsx`에 "기관 후보 (시연용)"
 * 섹션 신규).
 */

import type { RouteCandidate } from "../types";
import fixture from "../../data/fixtures/recommendation_institution_sample.json";

/**
 * 추천 기관 후보 분류.
 *
 * - `trainingCenter`: 직업훈련기관 (KEAD / 발달장애인훈련센터 / 민간훈련기관 등)
 * - `supportCenter`: 특수교육지원센터 / 진로교육지원센터 / 평생교육지원센터
 * - `school`: 학교 (전공과 / 특수학교)
 * - `employer`: 사업장 / 현장체험 사업장 / 채용 사업장
 * - `publicAgency`: 공공 고용·복지 기관 (고용지원기관 / 지역 지원기관 등)
 */
export type RecommendationInstitutionType =
  | "trainingCenter"
  | "supportCenter"
  | "school"
  | "employer"
  | "publicAgency";

/**
 * 추천 카드 기관 후보 1건.
 *
 * `aiGenerated: false` literal type 강제 — fixture에 `true` record 등록 시
 * 컴파일 오류.
 */
export interface RecommendationInstitution {
  institutionId: string;
  institutionName: string;
  institutionType: RecommendationInstitutionType;
  sidoName: string;
  sigunguName: string;
  /** KOSTAT 5자리 시군구 코드 (1차-136 region_hierarchy_subset / 1차-34 support_center 정합). */
  regionCode: string;
  /** RouteCandidate.routeType 5-union 부분 집합 — 본 기관이 적합한 경로 유형. */
  supportedRouteTypes: RouteCandidate["routeType"][];
  /** recommendationEvidence.evidenceId 4종 매칭. */
  supportedEvidenceIds: string[];
  /** 화면 표시용 짧은 역할 라벨 (예: "직업훈련기관" / "현장체험 사업장"). */
  role: string;
  /** Badge 또는 본문 표시용 출처 라벨. */
  sourceLabel: string;
  /** 사용자 안내문 — 실제 참여 가능 여부 직접 확인 필요. */
  caution: string;
  /** 모든 record `false` literal 강제. AI 생성 0건 정책. */
  aiGenerated: false;
}

/**
 * `_meta` shape (1차-67 / 1차-136 / 1차-55 / 1차-158 패턴 동형).
 */
export interface RecommendationInstitutionMeta {
  source: "demo:recommendation-institution-sample-curated";
  license: "human-curated";
  datasetCategory: "recommendation-institution";
  generatedAt: string;
  note: string;
  policy: {
    aiGeneratedAllowed: false;
    humanReviewRequired: true;
    minimumReviewFields: string[];
    fullTextCopyAllowed: false;
  };
  curator: string;
  reviewedAt: string;
  reviewVersion: string;
}

interface RecommendationInstitutionFixtureFile {
  _meta?: RecommendationInstitutionMeta;
  records: RecommendationInstitution[];
}

const fixtureFile = fixture as unknown as RecommendationInstitutionFixtureFile;

/** 전체 institution records (Readonly — mutate 차단). */
export const recommendationInstitutionRecords: ReadonlyArray<RecommendationInstitution> =
  fixtureFile.records;

/** fixture `_meta` re-export (1차-67 / 1차-136 / 1차-55 / 1차-158 패턴). */
export const recommendationInstitutionMeta:
  | RecommendationInstitutionMeta
  | undefined = fixtureFile._meta;

/**
 * regionCode 매칭 records 반환 (Readonly mutate 방지 — 새 배열). 매칭 0건이면 빈 배열.
 */
export function getInstitutionsByRegion(
  regionCode: string,
): RecommendationInstitution[] {
  return recommendationInstitutionRecords.filter(
    (r) => r.regionCode === regionCode,
  );
}

/**
 * routeType 매칭 records 반환 — 본 기관의 `supportedRouteTypes`에 routeType이
 * 포함된 records만. 매칭 0건이면 빈 배열.
 */
export function getInstitutionsByRouteType(
  routeType: RouteCandidate["routeType"],
): RecommendationInstitution[] {
  return recommendationInstitutionRecords.filter((r) =>
    r.supportedRouteTypes.includes(routeType),
  );
}

/**
 * evidenceId 매칭 records 반환 — 본 기관의 `supportedEvidenceIds`에 evidenceId가
 * 포함된 records만. 매칭 0건이면 빈 배열.
 */
export function getInstitutionsByEvidenceId(
  evidenceId: string,
): RecommendationInstitution[] {
  return recommendationInstitutionRecords.filter((r) =>
    r.supportedEvidenceIds.includes(evidenceId),
  );
}

/**
 * 카드별 기관 후보 선택 — 우선순위 cascade 4단계 + 빈 배열 fallback.
 *
 * 우선순위:
 *   1. regionCode + evidenceId 모두 일치
 *   2. regionCode + routeType 일치
 *   3. evidenceId 일치
 *   4. routeType 일치
 *   5. 빈 배열
 *
 * - `limit` 기본값 3.
 * - 중복 institutionId 제거 (cascade에서 같은 record가 여러 단계에 hit해도 1회만).
 * - 반환 배열은 새 배열 (mutate 차단).
 * - 입력 객체 mutate 0건.
 */
export function selectInstitutionsForCandidate(input: {
  routeType: RouteCandidate["routeType"];
  regionCode?: string;
  evidenceId?: string;
  limit?: number;
}): RecommendationInstitution[] {
  const limit = input.limit ?? 3;
  if (limit <= 0) return [];

  const collected: RecommendationInstitution[] = [];
  const seen = new Set<string>();

  const push = (record: RecommendationInstitution) => {
    if (seen.has(record.institutionId)) return;
    seen.add(record.institutionId);
    collected.push(record);
  };

  // tier 1: regionCode + evidenceId
  if (input.regionCode && input.evidenceId) {
    for (const r of recommendationInstitutionRecords) {
      if (collected.length >= limit) break;
      if (
        r.regionCode === input.regionCode &&
        r.supportedEvidenceIds.includes(input.evidenceId)
      ) {
        push(r);
      }
    }
  }

  // tier 2: regionCode + routeType
  if (input.regionCode && collected.length < limit) {
    for (const r of recommendationInstitutionRecords) {
      if (collected.length >= limit) break;
      if (
        r.regionCode === input.regionCode &&
        r.supportedRouteTypes.includes(input.routeType)
      ) {
        push(r);
      }
    }
  }

  // tier 3: evidenceId
  if (input.evidenceId && collected.length < limit) {
    for (const r of recommendationInstitutionRecords) {
      if (collected.length >= limit) break;
      if (r.supportedEvidenceIds.includes(input.evidenceId)) {
        push(r);
      }
    }
  }

  // tier 4: routeType
  if (collected.length < limit) {
    for (const r of recommendationInstitutionRecords) {
      if (collected.length >= limit) break;
      if (r.supportedRouteTypes.includes(input.routeType)) {
        push(r);
      }
    }
  }

  return collected;
}
