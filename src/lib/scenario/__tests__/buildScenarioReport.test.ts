/**
 * 11-3 1차-93 — buildScenarioReport pure assembler 회귀 보호.
 *
 * StudentScenario + GapTrendSignal[] + RouteCandidate[]을 ScenarioReport로 묶음.
 * generatedBy는 "template" 고정. UI 통합은 1차-95+ 별도 단계.
 *
 * mainIssue / policyUse / teacherUse 데이터 필드 참조·수정 0건 — 회귀 보호.
 */

import { describe, expect, it } from "vitest";
import { buildScenarioReport } from "../buildScenarioReport";
import * as moduleApi from "../buildScenarioReport";
import buildScenarioReportSource from "../buildScenarioReport.ts?raw";
import type {
  GapTrendSignal,
  RouteCandidate,
  StudentScenario,
} from "../../../types";

const SAMPLE_SCENARIO: StudentScenario = {
  regionCode: "DEMO-SIGUNGU-01",
  sidoCode: "11",
  schoolStage: "demo",
  interests: ["vocationalExperience"],
  commuteLimitMinutes: 30,
  onlineAllowed: false,
  guardianConsultNeeded: false,
};

const SAMPLE_TRENDS: GapTrendSignal[] = [
  {
    regionCode: "DEMO-SIGUNGU-01",
    domain: "training",
    baselineYear: 2022,
    currentYear: 2026,
    trendDirection: "worsening",
    gapLevel: "medium",
    evidenceLabel: "시연용 fixture 기반 연도별 자원 변화 (programCount)",
    dataMode: "mock",
    limitations: ["실 다년도 raw 미수집 — 시연용 추세입니다."],
  },
];

const SAMPLE_ROUTES: RouteCandidate[] = [
  {
    candidateId: "route-1",
    title: "지역 진로체험 후보",
    routeType: "agency-based",
    whyThisFits: "선택 지역 + 학생 관심 분야 매칭",
    requiredTeacherCheck: ["참여 가능 시간 확인"],
    familyDiscussionPoint: ["보호자 동행 가능 여부"],
    officialResourceIds: [],
    limitations: ["실 신청 요건은 원문 확인 필요"],
    regionCode: "DEMO-SIGUNGU-01",
  },
];

describe("buildScenarioReport — 기본 구조", () => {
  it("teacherSummary / familyGuide / educationOfficeNote 모두 비어있지 않음", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    expect(out.teacherSummary.length).toBeGreaterThan(0);
    expect(out.familyGuide.length).toBeGreaterThan(0);
    expect(out.educationOfficeNote.length).toBeGreaterThan(0);
  });

  it("dataEvidence / reviewChecklist / limitations 모두 비어있지 않음", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    expect(out.dataEvidence.length).toBeGreaterThan(0);
    expect(out.reviewChecklist.length).toBeGreaterThan(0);
    expect(out.limitations.length).toBeGreaterThan(0);
  });

  it("scenarioSummary / trendSignals / routeCandidates 입력 그대로 전파", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    expect(out.scenarioSummary).toEqual(SAMPLE_SCENARIO);
    expect(out.trendSignals).toEqual(SAMPLE_TRENDS);
    expect(out.routeCandidates).toEqual(SAMPLE_ROUTES);
  });

  it("generatedAt은 ISO 8601 형식", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    expect(out.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})/,
    );
  });
});

describe("buildScenarioReport — generatedBy 'template' 고정", () => {
  it("기본은 'template'", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    expect(out.generatedBy).toBe("template");
  });
});

describe("buildScenarioReport — 통일 안전 문구 / 검토 필요 표현", () => {
  it("reviewChecklist 또는 limitations에 통일 안전 문구 또는 '교사 검토 필요' 표현 포함", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    const joined = [...out.reviewChecklist, ...out.limitations].join("\n");
    const hasUnifiedDisclaimer = joined.includes(
      "공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.",
    );
    const hasTeacherReviewMention = /교사.*(검토|확인)/.test(joined);
    expect(hasUnifiedDisclaimer || hasTeacherReviewMention).toBe(true);
  });
});

describe("buildScenarioReport — dataEvidence license 5종 union", () => {
  it("dataEvidence license는 5종 union 내", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    const allowed = [
      "demo-only",
      "unknown",
      "공공누리 1유형",
      "link-only",
      "human-curated",
    ];
    for (const ev of out.dataEvidence) {
      expect(allowed).toContain(ev.license);
    }
  });
});

describe("buildScenarioReport — mainIssue / policyUse / teacherUse 데이터 필드 미참조 회귀", () => {
  it("소스에 region.mainIssue / region.policyUse / region.teacherUse 접근 0건", () => {
    expect(buildScenarioReportSource).not.toMatch(/region\??\.mainIssue/);
    expect(buildScenarioReportSource).not.toMatch(/region\??\.policyUse/);
    expect(buildScenarioReportSource).not.toMatch(/region\??\.teacherUse/);
  });
});

describe("buildScenarioReport — 금지 표현 회귀", () => {
  it("'AI 정책 추천' / '자동 추천 확정' / 'NEIS API 연결 완료' 표현 0건", () => {
    const out = buildScenarioReport({
      scenario: SAMPLE_SCENARIO,
      trendSignals: SAMPLE_TRENDS,
      routeCandidates: SAMPLE_ROUTES,
    });
    const allText = JSON.stringify(out);
    expect(allText).not.toMatch(/AI\s*정책\s*추천/);
    expect(allText).not.toMatch(/자동\s*추천\s*확정/);
    expect(allText).not.toMatch(/NEIS\s*API\s*연결\s*완료/);
    expect(allText).not.toMatch(/실제\s*API\s*호출\s*완료/);
    expect(allText).not.toMatch(/전국\s*실데이터\s*분석\s*완료/);
    expect(allText).not.toMatch(/완전\s*실데이터\s*대시보드\s*전환/);
    expect(buildScenarioReportSource).not.toMatch(/AI\s*정책\s*추천/);
    expect(buildScenarioReportSource).not.toMatch(/자동\s*추천\s*확정/);
  });

  it("자동 확정성 helper export 0건", () => {
    const exported = Object.keys(moduleApi);
    const forbidden = [
      "autoFinalizeReport",
      "decidePolicy",
      "confirmReport",
      "finalizeRecommendation",
    ];
    for (const f of forbidden) {
      expect(exported).not.toContain(f);
    }
  });
});
