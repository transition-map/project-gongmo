/**
 * 11-3 1차-93 — buildScenarioReport pure assembler.
 *
 * `StudentScenario` + `GapTrendSignal[]` + `RouteCandidate[]`을 1차-89 `ScenarioReport`로
 * 묶음. `generatedBy: "template"` 고정 — AI 도입은 별도 합의.
 *
 * **순수 함수 원칙**:
 * - fetch / process.env / localStorage 접근 0건
 * - UI 컴포넌트 import 0건
 * - 입력 mutate 0건
 * - **region 단위 free-text 데이터 필드(mainIssue · policyUse · teacherUse) 참조 0건**
 *   (회귀 테스트로 강제 — 별도 layer)
 *
 * UI 통합은 1차-95+ 별도 단계.
 */

import type {
  GapTrendSignal,
  RouteCandidate,
  ScenarioReport,
  ScenarioReportLicense,
  StudentScenario,
} from "../../types";

export interface BuildScenarioReportInput {
  scenario: StudentScenario;
  trendSignals: GapTrendSignal[];
  routeCandidates: RouteCandidate[];
  /** ISO 8601 timestamp override (테스트용). 기본은 호출 시점 new Date(). */
  generatedAt?: string;
}

/**
 * 통일 안전 문구 — 1차-57 follow-up 정책. reviewChecklist 1번 자리에 포함.
 */
const UNIFIED_DISCLAIMER =
  "공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.";

function buildTeacherSummary(scenario: StudentScenario): string {
  const interestLabel = scenario.interests.join(", ") || "careerExploration";
  return `해당 학생은 ${interestLabel} 방향에 관심이 있다고 가정한 시연용 시나리오입니다. 상담 시에는 거주 지역(${scenario.regionCode}) 내 프로그램 선택지와 대중교통 접근성을 먼저 검토하고, 필요한 경우 인접 권역의 온라인 진로탐색 프로그램을 대체 경로로 안내할 수 있습니다. 실제 상담 전에는 학생의 흥미와 참여 의사, 이동 가능 시간과 보호자 동행 가능 여부, 학교 내 지원 인력·예산 상황을 교사가 함께 점검한 뒤 최종 안내 경로를 정리해 두면 도움이 될 수 있습니다.`;
}

function buildFamilyGuide(scenario: StudentScenario): string {
  const onlineNote = scenario.onlineAllowed
    ? "온라인 참여가 가능한 시나리오로 설정되어 있어 원격 진로탐색 프로그램도 함께 검토할 수 있습니다."
    : "이동 가능 범위를 고려한 인근 기관 우선으로 검토할 수 있습니다.";
  return `이 화면에 보이는 추천 경로는 시연용 예시이며, 실제 결정 자료가 아닙니다. 학생이 평소에 관심 있는 진로체험 방향을 함께 적어 보고, 어디까지 이동할 수 있는지, 참여 가능한 요일과 시간이 어떻게 되는지, 보호자 동행이 필요한 경우인지 미리 살펴 두면 좋습니다. ${onlineNote} 학교 담당 선생님과 상담을 통해 최종 참여 경로와 준비 사항을 함께 정하면, 학생의 상황에 맞게 보다 안전하게 진행할 수 있습니다.`;
}

function buildEducationOfficeNote(
  scenario: StudentScenario,
  trendSignals: GapTrendSignal[],
): string {
  const trendCount = trendSignals.length;
  return `본 화면은 특정 지역에 대한 정책 결정 자료가 아니라, 시연용 데이터 기준으로 전환교육 프로그램 선택지와 접근성 정보를 함께 살펴볼 수 있도록 구성한 참고 문구입니다. 시연용 시나리오는 ${scenario.regionCode} 기준이며, 연도별 추세 신호 ${trendCount}건을 함께 참고할 수 있습니다. 실제 정책 검토 시에는 NEIS 학교기본정보 등 공공데이터의 수집·검증 준비 단계 산출물, KEAD·NISE·CareerNet 등 공식자료 링크, 그리고 현장 교사·담당자 의견을 함께 종합적으로 검토할 수 있습니다. 자원 배분이나 기관 지정 등의 결정은 별도의 정책 절차와 사람 검수를 거쳐 진행하는 것이 좋습니다.`;
}

function buildDataEvidence(
  scenario: StudentScenario,
  trendSignals: GapTrendSignal[],
  routeCandidates: RouteCandidate[],
): ScenarioReport["dataEvidence"] {
  const evidence: ScenarioReport["dataEvidence"] = [
    {
      source: `mock:region:${scenario.regionCode}`,
      license: "demo-only" as ScenarioReportLicense,
      referenceYear: 2026,
      note: "시연용 mock 지역 데이터",
    },
  ];
  if (trendSignals.length > 0) {
    evidence.push({
      source: "mock:trend:yearlySupport",
      license: "demo-only" as ScenarioReportLicense,
      referenceYear: 2026,
      note: "시연용 fixture 기반 연도별 자원 변화 — 실 다년도 raw 미수집",
    });
  }
  if (routeCandidates.length > 0) {
    evidence.push({
      source: "mock:recommendations",
      license: "demo-only" as ScenarioReportLicense,
      referenceYear: 2026,
      note: "시연용 mock 추천 후보 — 자동 확정 아닌 검토 후보",
    });
  }
  return evidence;
}

const REVIEW_CHECKLIST = [
  UNIFIED_DISCLAIMER,
  "학생 흥미·참여 의사 / 이동 가능 시간 / 보호자 동행 여부 / 학교 내 지원 인력·예산을 종합 점검",
  "추천 후보는 검토 후보 — 교사·담당자 검토 후 학생·보호자 상담에 활용",
  "공식 자료(KEAD / NISE / CareerNet 등) 원문 링크를 함께 확인",
];

const LIMITATIONS = [
  "본 보고서는 template 기반 시연용 초안입니다 (generatedBy: template).",
  "실 다년도 raw 미수집 — 연도별 추세는 시연용 또는 unknown으로 표시됩니다.",
  "공모 제출 전 사람 검수가 필요합니다.",
];

/**
 * 1차-89 `ScenarioReport` 조립.
 *
 * - generatedBy 기본은 "template" 고정.
 * - teacherSummary / familyGuide / educationOfficeNote는 scenario / trendSignals를
 *   가볍게 참조해 구성 — region 단위 mainIssue / policyUse / teacherUse 데이터 필드는
 *   참조하지 않는다 (회귀 테스트로 강제).
 * - dataEvidence는 입력 array 보유 여부에 따라 동적 구성, license는 `"demo-only"` 고정.
 */
export function buildScenarioReport(
  input: BuildScenarioReportInput,
): ScenarioReport {
  const {
    scenario,
    trendSignals,
    routeCandidates,
    generatedAt = new Date().toISOString(),
  } = input;

  return {
    generatedAt,
    scenarioSummary: scenario,
    trendSignals,
    routeCandidates,
    teacherSummary: buildTeacherSummary(scenario),
    familyGuide: buildFamilyGuide(scenario),
    educationOfficeNote: buildEducationOfficeNote(scenario, trendSignals),
    dataEvidence: buildDataEvidence(scenario, trendSignals, routeCandidates),
    reviewChecklist: [...REVIEW_CHECKLIST],
    limitations: [...LIMITATIONS],
    generatedBy: "template",
  };
}
