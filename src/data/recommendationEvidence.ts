/**
 * 11-3 1차-158 — recommendation evidence registry + read-only helper.
 *
 * 추천 카드 "추천 검토 근거" 본문 차별화를 위한 사람 검수 evidence 자료.
 * 1차-157 계획의 A+B1 전략 중 **B (fixture + helper)** 구현. **A (buildRouteCandidates
 * 통합)는 1차-159 별도 단계**로 분리되어 본 helper는 아직 어디서도 호출되지 않는다
 * (1차-67 / 1차-89 / 1차-136 / 1차-137 schema-only 패턴 동형).
 *
 * **출처**: `data/fixtures/recommendation_evidence_sample.json` — 사용자 사람 검수
 * 결과만 등록 (Claude Code는 fixture record 작성 0건 — 본 파일은 reader/helper only).
 *
 * **정책 (1차-67 / 1차-136 / 1차-55 동형)**:
 * - **AI 정책 추천 / 자동 확정 추천 금지** — `_meta.policy.aiGeneratedAllowed: false` /
 *   모든 record `aiGenerated: false` literal type 강제.
 * - **사람 검수 결과만 등록** — `_meta.policy.humanReviewRequired: true` /
 *   `_meta.policy.minimumReviewFields: ["curator", "reviewedAt"]`.
 * - **본문 전문 복제 금지** — `_meta.policy.fullTextCopyAllowed: false`.
 * - **PII 회피** — `_meta.curator`는 가공명·역할명만 (이메일·실명·연락처 금지).
 * - **fake numeric 필드 금지** — `schoolCount` / `currentGapIndex` / `trendRiskScore` /
 *   `yearlySupport` / `supportCenterCount` / `welfareFacilityCount` / `jobPostingCount`
 *   슬롯 부재 (회귀 테스트로 강제).
 * - **금지 단정 표현 0건** — "데이터 기반 분석 결과" / "공식자료 매칭 완료" /
 *   "한국장애인고용공단 API 연결 완료" / "복지시설 데이터 연결 완료" /
 *   "교통약자 이동지원 데이터 연결 완료" / "NEIS 전국 지표 연결 완료" /
 *   "전국 실데이터 분석 완료" / "완전 실데이터 대시보드 전환" /
 *   "실시간 API 서비스" / "최종 추천" / "자동 추천 확정" / "AI 정책 추천" 모두 0건.
 *   `_meta.note`에는 "AI 정책 추천 또는 자동 확정 추천이 아니며 ..." 부정 취지로만 등장 허용.
 *
 * **pure function 정책 (1차-93 / 1차-137 동형)**:
 * - fetch / process.env / localStorage / sessionStorage 접근 0건.
 * - UI 컴포넌트 import 0건.
 * - `data/mart.real` / `data/master.real` / `data/indicator.real` / `data/raw.api`
 *   직접 import 0건.
 * - `officialResources` 모듈 import 0건 (1차-161+ C안 별도 합의).
 * - 입력 mutate 0건 — Readonly 반환 / 새 배열 / 새 객체.
 * - 키워드 매칭은 `programName.toLowerCase()` 기준 `includes` (대소문자·공백 변형 안전).
 *
 * **자동 확정 추천 helper 이름 금지 (회귀 테스트로 강제)**:
 *   `autoRecommend` / `decidePolicy` / `finalDecision` / `recommendForRegion` /
 *   `matchOfficialResource` / `autoMatch` / `generatePolicy` 등 export 0건.
 *
 * **`selectRecommendationEvidence` 우선순위**:
 *   1. `getEvidenceByKeyword(programName)` — 프로그램명 키워드 매칭 첫 hit
 *   2. `getEvidenceByRouteType(routeType)[0]` — routeType 매칭 첫 hit
 *   3. `review-candidate-fallback` record (fixture에 항상 포함)
 *   4. undefined (fixture가 비어 있는 비정상 케이스)
 *
 * UI 통합은 1차-159+ 별도 단계 (`buildRouteCandidates.ts`에서 evidence 우선 매칭 +
 * `DEFAULT_*` fallback 유지).
 */

import type { RouteCandidate } from "../types";
import fixture from "../../data/fixtures/recommendation_evidence_sample.json";

/**
 * recommendation evidence 출처 분류.
 *
 * - `curated-demo`: 1차-158 사람 검수 시연용 fixture (현재 4건 모두)
 * - `official-link`: 1차-161+ C안 — `officialResources` registry 매칭 결과
 * - `etl-derived`: 1차-163+ D안 — KEAD ETL pipeline 산출물 기반
 * - `research-paper`: 별도 시리즈 — 연구기관 보고서 인용
 */
export type RecommendationEvidenceSourceType =
  | "curated-demo"
  | "official-link"
  | "etl-derived"
  | "research-paper";

/**
 * 추천 카드 검토 근거 1건.
 *
 * `aiGenerated: false` literal type 강제 — fixture에 `true` record 등록 시 컴파일 오류.
 */
export interface RecommendationEvidence {
  evidenceId: string;
  routeType: RouteCandidate["routeType"];
  /** 프로그램명 키워드 (한국어 / 영어, 대소문자 무관 매칭). 빈 배열 허용 (fallback record). */
  programKeywords: string[];
  /** 1차-152 path summary panel 제목과 정합 (선택). */
  summaryTitle?: string;
  /** "왜 이 경로가 맞는지" 본문 (1~3문장). */
  whyThisFits: string;
  /** "교사 확인 필요" 항목 (2~3건). */
  teacherCheck: string[];
  /** "학생·학부모 상담 포인트" (2건). */
  familyDiscussion: string[];
  /** "한계 및 주의" (2건). 자동 확정 추천이 아님을 명시. */
  limitations: string[];
  /** Badge 또는 본문 표시용 출처 라벨. */
  sourceLabel: string;
  /** 출처 분류 — 1차-158은 `curated-demo`만 사용. */
  sourceType: RecommendationEvidenceSourceType;
  /** 모든 record `false` literal 강제. AI 생성 0건 정책. */
  aiGenerated: false;
}

/**
 * `_meta` shape (1차-67 / 1차-136 / 1차-55 패턴 동형).
 */
export interface RecommendationEvidenceMeta {
  source: "demo:recommendation-evidence-sample-curated";
  license: "human-curated";
  datasetCategory: "recommendation-evidence";
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

interface RecommendationEvidenceFixtureFile {
  _meta?: RecommendationEvidenceMeta;
  records: RecommendationEvidence[];
}

const fixtureFile = fixture as unknown as RecommendationEvidenceFixtureFile;

/** 전체 evidence records (Readonly — mutate 차단). */
export const recommendationEvidenceRecords: ReadonlyArray<RecommendationEvidence> =
  fixtureFile.records;

/** fixture `_meta` re-export (1차-67 / 1차-136 / 1차-55 패턴). */
export const recommendationEvidenceMeta: RecommendationEvidenceMeta | undefined =
  fixtureFile._meta;

/**
 * routeType 매칭 records 반환 (Readonly — mutate 차단). 매칭 0건이면 빈 배열.
 */
export function getEvidenceByRouteType(
  routeType: RouteCandidate["routeType"],
): RecommendationEvidence[] {
  return recommendationEvidenceRecords.filter((r) => r.routeType === routeType);
}

/**
 * programName 키워드 매칭 첫 record 반환 (`programName.toLowerCase()` 기준 `includes`).
 *
 * - 모든 record의 `programKeywords` 각 키워드를 `lowercase`로 normalize한 후 매칭.
 * - 빈 `programKeywords` 배열을 가진 fallback record는 매칭 0건 (의도된 동작).
 * - 매칭 0건이면 `undefined`.
 */
export function getEvidenceByKeyword(
  programName: string,
): RecommendationEvidence | undefined {
  if (!programName) return undefined;
  const haystack = programName.toLowerCase();
  for (const rec of recommendationEvidenceRecords) {
    for (const keyword of rec.programKeywords) {
      if (keyword.length === 0) continue;
      if (haystack.includes(keyword.toLowerCase())) {
        return rec;
      }
    }
  }
  return undefined;
}

/**
 * 카드별 evidence 선택 — keyword 우선, routeType 보조, fallback record 최후.
 *
 * 우선순위:
 *   1. `getEvidenceByKeyword(programName)` (keyword hit)
 *   2. `getEvidenceByRouteType(routeType)[0]` (routeType 첫 hit)
 *   3. `recommendationEvidenceRecords.find(r => r.evidenceId === "review-candidate-fallback")`
 *   4. `undefined` (fixture 비정상 케이스)
 */
export function selectRecommendationEvidence(input: {
  routeType: RouteCandidate["routeType"];
  programName: string;
}): RecommendationEvidence | undefined {
  const byKeyword = getEvidenceByKeyword(input.programName);
  if (byKeyword) return byKeyword;

  const byRouteType = getEvidenceByRouteType(input.routeType);
  if (byRouteType.length > 0) return byRouteType[0];

  const fallback = recommendationEvidenceRecords.find(
    (r) => r.evidenceId === "review-candidate-fallback",
  );
  return fallback;
}
