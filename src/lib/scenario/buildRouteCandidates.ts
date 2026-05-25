/**
 * 11-3 1차-93 — buildRouteCandidates pure builder.
 *
 * `StudentScenario` + legacy `Recommendation[]`을 1차-89 `RouteCandidate[]`로 변환한다.
 * 자동 확정 추천이 아닌 **검토 후보**로 표현. `requiredTeacherCheck` /
 * `familyDiscussionPoint` / `limitations` 필수.
 *
 * **순수 함수 원칙**:
 * - fetch / process.env / localStorage 접근 0건
 * - UI 컴포넌트 import 0건
 * - 입력 배열 mutate 0건 (새 배열 / 새 객체 반환)
 *
 * UI 통합은 1차-95+ 별도 단계.
 */

import type {
  Recommendation,
  RouteCandidate,
  StudentScenario,
  StudentScenarioInterest,
} from "../../types";
import {
  selectRecommendationEvidence,
  type RecommendationEvidence,
} from "../../data/recommendationEvidence";
import { selectInstitutionsForCandidate } from "../../data/recommendationInstitution";

export interface BuildRouteCandidatesInput {
  scenario: StudentScenario;
  recommendations: Recommendation[];
  /** 최대 후보 수 (기본 3). */
  limit?: number;
}

const DEFAULT_LIMIT = 3;

/**
 * 한국어 careerInterest → StudentScenarioInterest union 매핑 (입력 점수 비교용).
 * buildScenarioFromProfile.ts 매핑과 일관.
 */
const KO_CAREER_TO_INTEREST: Record<string, StudentScenarioInterest> = {
  직업체험: "vocationalExperience",
  "디지털 기초역량": "careerExploration",
  사회서비스: "careerExploration",
  문화예술: "careerExploration",
  사무보조: "employmentPreparation",
};

/**
 * scenario.commuteLimitMinutes ↔ 한국어 mobilityRange 매칭 라벨 (점수 가중치용).
 */
function commuteMatchesMobility(
  commuteLimitMinutes: StudentScenario["commuteLimitMinutes"],
  mobilityRange: string,
): boolean {
  if (commuteLimitMinutes === "online")
    return mobilityRange === "온라인 참여 가능";
  if (commuteLimitMinutes === 30)
    return (
      mobilityRange === "거주지 인근" || mobilityRange === "대중교통 30분 이내"
    );
  if (commuteLimitMinutes === 60) return mobilityRange === "대중교통 1시간 이내";
  return false;
}

/**
 * `Recommendation`의 keyword를 기반으로 `RouteCandidate.routeType` 5-union 추론.
 */
function deriveRouteType(
  rec: Recommendation,
  scenario: StudentScenario,
): RouteCandidate["routeType"] {
  const haystack = `${rec.programName} ${rec.relatedAgency} ${rec.alternativePath ?? ""}`;
  if (scenario.onlineAllowed && /온라인|원격|화상/.test(haystack)) {
    return "online";
  }
  if (/학교|특수학교|고등학교|중학교|초등학교/.test(haystack)) {
    return "school-based";
  }
  if (/공식|매뉴얼|안내서|커리어넷|NISE|KEAD/.test(haystack)) {
    return "official-resource";
  }
  if (/병행|연계|복합|혼합/.test(haystack)) {
    return "mixed";
  }
  return "agency-based";
}

/**
 * 점수 함수 — scenario와 legacy recommendation의 일치도 평가 (검토 후보 순서 결정용).
 *
 * - regionCode 매칭이 아닌 region.region 한국어 표시명 매칭 (1차-93 시점 legacy 호환).
 * - careerInterest 매칭 시 가중치 부여.
 * - commuteLimitMinutes 매칭 시 가중치 부여.
 */
function scoreRecommendation(
  rec: Recommendation,
  scenario: StudentScenario,
): number {
  let score = 0;
  const interest = KO_CAREER_TO_INTEREST[rec.targetProfile.careerInterest];
  if (interest && scenario.interests.includes(interest)) {
    score += 20;
  }
  if (commuteMatchesMobility(scenario.commuteLimitMinutes, rec.targetProfile.mobilityRange)) {
    score += 10;
  }
  return score;
}

function buildWhyThisFits(
  rec: Recommendation,
  scenario: StudentScenario,
): string {
  const interestLabel = scenario.interests[0] ?? "careerExploration";
  return `시연용 검토 후보: 학생 시나리오 관심 분야 ${interestLabel} 및 선택 지역(${scenario.regionCode}) 기준 ${rec.programName} 후보입니다. ${rec.reason}`;
}

const DEFAULT_TEACHER_CHECK = [
  "프로그램 참여 가능 시간 확인",
  "보호자 동행 필요 여부 확인",
  "학교 내 지원 인력·예산 사전 점검",
];

const DEFAULT_FAMILY_DISCUSSION = [
  "학생 참여 의지·흥미 확인",
  "이동 동선 사전 점검",
];

const DEFAULT_LIMITATIONS = [
  "본 후보는 시연용 검토 후보입니다. 실제 활용 전 교사의 종합적인 검토가 필요합니다.",
  "실 신청 가능 시기·요건은 원문 또는 담당 기관에서 확인이 필요합니다.",
];

/**
 * 11-3 1차-163 — RouteCandidate.displayHints 4 필드(접근성 / 관련 기관 / 교사 상담 메모 /
 * 대체 경로)를 evidenceId 기준으로 매핑한 hint base.
 *
 * 화면 표시용 보조 정보. **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** —
 * 시연용 검토 정보. evidenceId가 fixture에 없거나 매칭 실패 시 undefined로 fallback.
 *
 * scenario.commuteLimitMinutes / onlineAllowed에 따라 accessibility 끝에 commute hint 한
 * 문장이 append 될 수 있다 (getCommuteHint).
 */
type DisplayHints = NonNullable<RouteCandidate["displayHints"]>;

const DISPLAY_HINTS_BY_EVIDENCE_ID: Record<string, DisplayHints> = {
  "office-basic-training": {
    accessibility:
      "정기 출석이 필요한 훈련 경로입니다. 선택한 이동 가능 범위 안에서 훈련기관까지의 이동 시간과 동행 필요 여부를 확인하세요.",
    relatedAgency: "직업훈련기관 / 특수교육지원센터 확인 필요",
    teacherMemo:
      "사무기기 사용, 문서 정리, 출석 기준을 학생의 현재 수행 수준과 함께 점검하세요.",
    alternativePath:
      "바로 훈련 참여가 어렵다면 교내 직무체험 또는 짧은 현장체험부터 검토하세요.",
  },
  "workplace-experience": {
    accessibility:
      "실제 사업장 방문이 필요한 경로입니다. 출입구, 화장실, 이동 동선, 현장 소음 등 접근성을 사전에 확인하세요.",
    relatedAgency: "사업장 담당자 / 현장실습 담당교사 확인 필요",
    teacherMemo:
      "현장 담당자와 지원 방식, 체험 시간, 이동 동선을 사전에 조율하세요.",
    alternativePath:
      "현장 부담이 크면 교내 직무체험이나 짧은 사업장 견학부터 시작하세요.",
  },
  "office-employment-exploration": {
    accessibility:
      "출퇴근이 전제되는 경로입니다. 근무지까지의 이동 시간, 출근 시간대, 휴식 공간 접근성을 확인하세요.",
    relatedAgency: "고용지원기관 / 사업장 채용 담당자 확인 필요",
    teacherMemo:
      "직무 난이도, 근무 시간, 지원 인력 필요 여부를 채용 담당자와 확인하세요.",
    alternativePath:
      "바로 취업이 어렵다면 기초 직무훈련 또는 현장체험을 먼저 검토하세요.",
  },
  "review-candidate-fallback": {
    accessibility:
      "학생의 이동 가능 범위와 보호자 동행 필요 여부를 먼저 확인하세요.",
    relatedAgency: "담당 교사 / 지역 지원기관 확인 필요",
    teacherMemo:
      "학생 흥미, 이동 가능 범위, 지원 필요 수준을 다시 확인하세요.",
    alternativePath:
      "훈련, 체험, 상담 중 부담이 낮은 단계부터 검토하세요.",
  },
};

/**
 * scenario.commuteLimitMinutes / onlineAllowed → accessibility 끝에 append 가능한 1문장.
 * 일치하는 케이스가 없으면 undefined.
 */
function getCommuteHint(scenario: StudentScenario): string | undefined {
  if (scenario.onlineAllowed || scenario.commuteLimitMinutes === "online") {
    return "온라인 참여 가능성이 있는 경로입니다. 원격 참여 환경과 지원 인력 필요 여부를 확인하세요.";
  }
  if (scenario.commuteLimitMinutes === 30) {
    return "대중교통 30분 이내 이동 가능성을 기준으로 동선과 동행 필요 여부를 확인하세요.";
  }
  if (scenario.commuteLimitMinutes === 60) {
    return "대중교통 1시간 이내 이동 가능성을 기준으로 피로도와 귀가 동선을 함께 확인하세요.";
  }
  return undefined;
}

/**
 * evidence + scenario → displayHints 4 필드. evidence 없거나 evidenceId 미등록 시 undefined.
 *
 * pure function — fetch / env / storage / data.real / officialResources 접근 0건.
 * 입력 mutate 0건.
 */
function buildDisplayHintsFromEvidence(
  evidence: RecommendationEvidence | undefined,
  scenario: StudentScenario,
): DisplayHints | undefined {
  if (!evidence) return undefined;
  const base = DISPLAY_HINTS_BY_EVIDENCE_ID[evidence.evidenceId];
  if (!base) return undefined;
  const commuteHint = getCommuteHint(scenario);
  if (!commuteHint) return { ...base };
  return {
    ...base,
    accessibility: `${base.accessibility} ${commuteHint}`,
  };
}

/**
 * legacy `Recommendation[]`을 `RouteCandidate[]`로 변환.
 *
 * - 점수 함수로 정렬 후 `limit` (기본 3) 만큼 반환.
 * - 각 후보에 `requiredTeacherCheck` / `familyDiscussionPoint` / `limitations` 필수 필드 채움.
 * - `officialResourceIds`는 빈 배열로 시작 (1차-161+ C안 진입 시점에 1차-64 registry 매칭 합의).
 * - 자동 확정 추천 표현 0건 — 모든 후보는 검토 후보.
 *
 * **11-3 1차-159 — recommendation evidence 우선 매칭**:
 * - 각 후보의 `routeType`을 먼저 계산.
 * - `selectRecommendationEvidence({ routeType, programName })`로 1차-158 검수 evidence
 *   매칭 시도 (우선순위: keyword → routeType → review-candidate-fallback).
 * - evidence가 있으면 `whyThisFits` / `requiredTeacherCheck` / `familyDiscussionPoint` /
 *   `limitations` 4종을 evidence 기반 사람 검수 문장으로 채움.
 * - evidence가 없으면 기존 `buildWhyThisFits` + `DEFAULT_*` fallback 유지 (legacy 호출자
 *   호환). 1차-158 fixture에는 fallback record가 항상 포함되어 있어 실질 매칭 0건은
 *   fixture 비정상 케이스 한정.
 * - `RouteCandidate` schema는 무수정 — `evidenceId` / `sourceLabel` / `sourceType` 등
 *   evidence 메타는 RouteCandidate에 흘려보내지 않음 (단방향 — 사용자가 본 4 필드만 view 도달).
 *
 * **11-3 1차-178 — recommendationInstitution 후보 매칭 (institutionHints)**:
 * - 1차-175 fixture + helper(`selectInstitutionsForCandidate`)를 사용해 후보별 기관
 *   목록을 최대 3건 매칭. 우선순위 cascade는 `selectInstitutionsForCandidate` 그대로
 *   (regionCode+evidenceId → regionCode+routeType → evidenceId → routeType).
 * - 매칭 결과를 `RouteCandidate.institutionHints`(1차-178 신규 optional field) 7 키
 *   only로 매핑(`institutionId` / `name` / `role` / `sidoName` / `sigunguName` /
 *   `sourceLabel` / `caution`). `supportedRouteTypes` / `supportedEvidenceIds` /
 *   `institutionType` / `regionCode` 등 raw 매칭 메타는 흘려보내지 않음 (1차-159 단방향
 *   정합 정책 일관).
 * - `institutionHints.length > 0`일 때만 conditional spread로 추가 — 매칭 0건이면
 *   RouteCandidate에 키 자체 미포함 (legacy 호출자 호환 / view 섹션 미렌더 안전).
 * - **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** — 시연용 검토
 *   후보. 실제 참여 가능 여부는 기관 확인 필요.
 * - view 통합(RecommendationResult.tsx "기관 후보 (시연용)" 섹션)은 1차-180+ 별도 단계.
 */
export function buildRouteCandidates(
  input: BuildRouteCandidatesInput,
): RouteCandidate[] {
  const { scenario, recommendations, limit = DEFAULT_LIMIT } = input;
  if (recommendations.length === 0) return [];

  // 입력 배열 mutate 회피 — 복사 후 정렬
  const scored = recommendations.map((rec) => ({
    rec,
    score: scoreRecommendation(rec, scenario),
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ rec }) => {
    const routeType = deriveRouteType(rec, scenario);
    const evidence = selectRecommendationEvidence({
      routeType,
      programName: rec.programName,
    });
    // 1차-163 — displayHints는 evidence가 있고 evidenceId가 등록된 경우에만 생성.
    // undefined일 때 view(RecommendationResult)가 rec.accessibility / relatedAgency /
    // teacherMemo / alternativePath로 자동 fallback (legacy 호출자 호환).
    const displayHints = buildDisplayHintsFromEvidence(evidence, scenario);
    // 1차-178 — recommendationInstitution 후보 매칭. selectInstitutionsForCandidate
    // 우선순위 cascade(regionCode+evidenceId → regionCode+routeType → evidenceId →
    // routeType) 그대로 사용. 결과는 view 도달 7 키 only로 매핑 — supportedRouteTypes /
    // supportedEvidenceIds / institutionType / regionCode 등 raw 매칭 메타는 흘려보내지
    // 않음 (1차-159 단방향 정합 정책 일관). 매칭 0건 시 conditional spread로 키 자체 미포함.
    const institutionCandidates = selectInstitutionsForCandidate({
      routeType,
      regionCode: scenario.regionCode,
      evidenceId: evidence?.evidenceId,
      limit: 3,
    });
    const institutionHints = institutionCandidates.map((institution) => ({
      institutionId: institution.institutionId,
      name: institution.institutionName,
      role: institution.role,
      sidoName: institution.sidoName,
      sigunguName: institution.sigunguName,
      sourceLabel: institution.sourceLabel,
      caution: institution.caution,
    }));
    return {
      candidateId: rec.id,
      title: rec.programName,
      routeType,
      whyThisFits: evidence
        ? evidence.whyThisFits
        : buildWhyThisFits(rec, scenario),
      requiredTeacherCheck: evidence
        ? [...evidence.teacherCheck]
        : [...DEFAULT_TEACHER_CHECK],
      familyDiscussionPoint: evidence
        ? [...evidence.familyDiscussion]
        : [...DEFAULT_FAMILY_DISCUSSION],
      officialResourceIds: [],
      limitations: evidence
        ? [...evidence.limitations]
        : [...DEFAULT_LIMITATIONS],
      regionCode: scenario.regionCode,
      ...(displayHints ? { displayHints } : {}),
      ...(institutionHints.length > 0 ? { institutionHints } : {}),
    };
  });
}
