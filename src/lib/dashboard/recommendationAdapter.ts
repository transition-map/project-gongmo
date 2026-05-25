/**
 * Recommendation 데이터 adapter.
 *
 * service의 RecommendationResultData(`RecommendationResult` 타입)를 legacy
 * `Recommendation[]` 형태로 변환해, 기존 RecommendationResult.tsx 컴포넌트가
 * 그대로 동작할 수 있게 한다.
 *
 * **이름 충돌 주의:** 컴포넌트 RecommendationResult.tsx와 타입
 * RecommendationResult가 동명. 타입은 항상 alias로 import한다.
 *
 * **순수 함수 원칙:**
 * - mock·service·legacy JSON을 직접 import하지 않는다.
 * - fallback은 호출자가 파라미터로 주입한다.
 */

import type {
  Recommendation,
  RecommendationCandidate,
  RecommendationResult as RecommendationResultData,
} from "../../types";

export interface ToLegacyRecommendationsInput {
  /** service에서 받은 추천 결과(있을 때만). */
  recommendation?: RecommendationResultData;
  /**
   * 기존 컴포넌트의 region 필터(`r.region === selectedRegion.region`)와
   * 매칭되도록 변환된 Recommendation.region에 채울 표시명.
   */
  selectedRegionName: string;
  /**
   * Reserved for future use. 현재 adapter는 selectedRegionName만 사용해
   * region 필드를 채우므로 selectedRegionCode는 활용하지 않는다.
   */
  selectedRegionCode?: string;
  /** service 추천 부재 또는 candidates 빈 경우 사용할 legacy fallback. */
  legacyFallback?: Recommendation[];
}

function firstOrUndefined<T>(arr: T[] | undefined): T | undefined {
  return arr && arr.length > 0 ? arr[0] : undefined;
}

function candidateToLegacy(
  candidate: RecommendationCandidate,
  selectedRegionName: string,
  context: RecommendationResultData["context"],
): Recommendation {
  // 후보가 기관(institution)이면 candidateName이 곧 관련 기관명
  const relatedAgency =
    candidate.candidateType === "institution"
      ? candidate.candidateName
      : "(시연용 기관 미지정)";

  // 매칭 사유 첫 항목으로 접근성 라벨
  const accessibility =
    firstOrUndefined(candidate.matchReasons) ?? "(시연용)";

  // evidence를 legacy evidenceData 문자열 배열로 평면화
  const evidenceData =
    candidate.evidence?.map((e) => `${e.label}: ${e.value}`) ?? [];

  return {
    id: candidate.candidateId,
    // 기존 컴포넌트의 region 필터(legacy.region === selectedRegion.region)에
    // 맞춰 selectedRegionName으로 채운다.
    region: selectedRegionName,
    programName: candidate.candidateName,
    targetProfile: {
      careerInterest:
        firstOrUndefined(context?.preferredJobCodes) ?? "(시연용)",
      mobilityRange:
        firstOrUndefined(context?.mobilityNeeds) ?? "(시연용)",
      supportLevel: "(시연용)",
    },
    reason: candidate.reason,
    accessibility,
    relatedAgency,
    teacherMemo: candidate.caution ?? "교사 검토 후 학생·보호자 상담에 활용",
    alternativePath: "",
    evidenceData,
  };
}

/**
 * RecommendationResultData → legacy Recommendation[] 변환.
 *
 * - service 추천이 없거나 candidates가 비어 있으면 `legacyFallback`을 그대로 반환한다.
 * - 변환된 Recommendation.region은 항상 selectedRegionName으로 채운다 →
 *   기존 컴포넌트의 region 필터가 정상 동작한다.
 */
export function toLegacyRecommendations(
  input: ToLegacyRecommendationsInput,
): Recommendation[] {
  // selectedRegionCode는 향후 매칭 확장을 위해 시그니처에 두지만 현재 미사용
  void input.selectedRegionCode;

  const { recommendation, selectedRegionName, legacyFallback } = input;

  if (
    !recommendation ||
    !recommendation.candidates ||
    recommendation.candidates.length === 0
  ) {
    return legacyFallback ?? [];
  }

  return recommendation.candidates.map((c) =>
    candidateToLegacy(c, selectedRegionName, recommendation.context),
  );
}
