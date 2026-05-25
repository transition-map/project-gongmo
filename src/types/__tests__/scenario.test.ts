/**
 * 11-3 1차-89 — StudentScenario / GapTrendSignal / RouteCandidate / ScenarioReport
 * schema-only 회귀 보호.
 *
 * 본 테스트는 type-level + module-export-level 회귀 검증.
 * UI 통합 (StudentProfile / RecommendationResult / GeneratedOutputs) 무수정 단계.
 *
 * 핵심 회귀 보호:
 * - PII 필드 (name / studentName / schoolName / addressDetail / phone / email /
 *   birthday / disabilityType / disabilityGrade) 누락
 * - GapTrendSignal `"unknown"` 상태 허용
 * - RouteCandidate가 requiredTeacherCheck / familyDiscussionPoint / limitations 보유
 * - ScenarioReport가 teacherSummary / familyGuide / educationOfficeNote /
 *   dataEvidence / reviewChecklist / limitations 보유
 * - generatedBy: "template" | "ai-assisted" | "human-curated" 외 값 금지
 * - 자동 확정성 helper (autoRecommendFinal / policyDecision / mustImplement) 0건
 */

import { describe, expect, it } from "vitest";
import type {
  GapTrendSignal,
  RouteCandidate,
  ScenarioReport,
  StudentScenario,
} from "../scenario";
import * as scenarioModule from "../scenario";
// Vite ?raw import — 소스 파일을 문자열로 로드. node:fs / __dirname 미사용
// (tsconfig.app.json의 vite/client 환경 일관).
import SCENARIO_SOURCE from "../scenario.ts?raw";

describe("scenario schema — StudentScenario PII 회귀", () => {
  it("StudentScenario sample 객체에 PII 키가 없다", () => {
    const sample: StudentScenario = {
      regionCode: "11680",
      schoolStage: "high",
      interests: ["vocationalExperience"],
      onlineAllowed: true,
      guardianConsultNeeded: false,
    };
    const keys = Object.keys(sample);
    const forbiddenKeys = [
      "name",
      "studentName",
      "schoolName",
      "addressDetail",
      "phone",
      "email",
      "birthday",
      "disabilityType",
      "disabilityGrade",
    ];
    for (const forbidden of forbiddenKeys) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("scenario.ts 소스에 PII 키 식별자가 등장하지 않는다", () => {
    // 금지 키가 type field 이름으로 등장 시 즉시 실패.
    // 단어 경계 매칭으로 다른 단어의 일부 (예: "address"가 "addressDetail"에)에 포함될 가능성 차단.
    const forbiddenPatterns = [
      /\bstudentName\s*[?:]/,
      /\bschoolName\s*[?:]/,
      /\baddressDetail\s*[?:]/,
      /\bphone\s*[?:]/,
      /\bemail\s*[?:]/,
      /\bbirthday\s*[?:]/,
      /\bdisabilityType\s*[?:]/,
      /\bdisabilityGrade\s*[?:]/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(SCENARIO_SOURCE).not.toMatch(pattern);
    }
  });
});

describe("scenario schema — GapTrendSignal unknown 허용", () => {
  it("trendDirection / gapLevel 모두 'unknown'으로 둘 수 있다", () => {
    const sample: GapTrendSignal = {
      regionCode: "11680",
      domain: "demand",
      trendDirection: "unknown",
      gapLevel: "unknown",
      evidenceLabel: "trend baseline 부재 — 단일 연도만 보유",
      dataMode: "mock",
      limitations: ["연도별 raw 미수집"],
    };
    expect(sample.trendDirection).toBe("unknown");
    expect(sample.gapLevel).toBe("unknown");
  });

  it("trendDirection / gapLevel 4종 값이 모두 허용된다", () => {
    const trendValues: GapTrendSignal["trendDirection"][] = [
      "improving",
      "stable",
      "worsening",
      "unknown",
    ];
    const gapValues: GapTrendSignal["gapLevel"][] = [
      "low",
      "medium",
      "high",
      "unknown",
    ];
    expect(trendValues).toHaveLength(4);
    expect(gapValues).toHaveLength(4);
  });
});

describe("scenario schema — RouteCandidate 필수 검토 필드", () => {
  it("requiredTeacherCheck / familyDiscussionPoint / limitations 모두 보유", () => {
    const sample: RouteCandidate = {
      candidateId: "route-demo-1",
      title: "지역 진로체험기관 안내 (시연용)",
      routeType: "agency-based",
      whyThisFits: "선택 지역 + 학생 관심 기반 시연용 매칭",
      requiredTeacherCheck: ["참여 가능 시간 확인", "보호자 동행 가능 여부"],
      familyDiscussionPoint: ["참여 의지 확인", "이동 동선 검토"],
      officialResourceIds: ["kead-online-occupational-test-guidance"],
      limitations: ["실 신청 요건은 원문 확인 필요"],
    };
    expect(sample.requiredTeacherCheck.length).toBeGreaterThan(0);
    expect(sample.familyDiscussionPoint.length).toBeGreaterThan(0);
    expect(sample.limitations.length).toBeGreaterThan(0);
  });

  it("routeType 5종 union", () => {
    const types: RouteCandidate["routeType"][] = [
      "school-based",
      "agency-based",
      "online",
      "official-resource",
      "mixed",
    ];
    expect(types).toHaveLength(5);
  });
});

describe("scenario schema — ScenarioReport 구조", () => {
  it("teacherSummary / familyGuide / educationOfficeNote / dataEvidence / reviewChecklist / limitations 보유", () => {
    const sample: ScenarioReport = {
      generatedAt: "2026-05-23T00:00:00+09:00",
      scenarioSummary: {
        regionCode: "11680",
        schoolStage: "high",
        interests: ["careerExploration"],
        onlineAllowed: true,
        guardianConsultNeeded: false,
      },
      trendSignals: [],
      routeCandidates: [],
      teacherSummary: "교사 상담 요약 초안 (시연용)",
      familyGuide: "학생·학부모 안내 초안 (시연용)",
      educationOfficeNote: "교육청 정책 참고문 초안 (시연용)",
      dataEvidence: [
        {
          source: "fixture:demo",
          license: "demo-only",
          referenceYear: 2026,
        },
      ],
      reviewChecklist: ["교사 검토 필수", "원문 확인 권장"],
      limitations: ["시연용 초안 — 실제 결정 자료 아님"],
      generatedBy: "template",
    };
    expect(sample.teacherSummary).toBeTruthy();
    expect(sample.familyGuide).toBeTruthy();
    expect(sample.educationOfficeNote).toBeTruthy();
    expect(Array.isArray(sample.dataEvidence)).toBe(true);
    expect(Array.isArray(sample.reviewChecklist)).toBe(true);
    expect(Array.isArray(sample.limitations)).toBe(true);
  });

  it("generatedBy는 template / ai-assisted / human-curated 3종 union", () => {
    const values: ScenarioReport["generatedBy"][] = [
      "template",
      "ai-assisted",
      "human-curated",
    ];
    expect(values).toHaveLength(3);
  });

  it("dataEvidence license는 안전한 union으로 제한", () => {
    const licenses: ScenarioReport["dataEvidence"][number]["license"][] = [
      "demo-only",
      "unknown",
      "공공누리 1유형",
      "link-only",
      "human-curated",
    ];
    expect(licenses).toHaveLength(5);
  });
});

describe("scenario schema — 자동 확정성 helper 미등장 회귀", () => {
  it("자동 확정성 helper export 0건", () => {
    const forbiddenExports = [
      "autoRecommendFinal",
      "policyDecision",
      "mustImplement",
      "confirmRoute",
      "finalizeRecommendation",
      "decidePolicy",
    ];
    const exported = Object.keys(scenarioModule);
    for (const forbidden of forbiddenExports) {
      expect(exported).not.toContain(forbidden);
    }
  });

  it("scenario.ts 소스에 자동 확정성 helper 패턴이 등장하지 않는다", () => {
    expect(SCENARIO_SOURCE).not.toMatch(/autoRecommendFinal/);
    expect(SCENARIO_SOURCE).not.toMatch(/policyDecision/);
    expect(SCENARIO_SOURCE).not.toMatch(/mustImplement/);
    expect(SCENARIO_SOURCE).not.toMatch(/finalizeRecommendation/);
  });

  it("scenario.ts JSDoc에 'AI 정책 추천' 또는 '자동 추천 확정' 표현이 없다", () => {
    expect(SCENARIO_SOURCE).not.toMatch(/AI\s*정책\s*추천/);
    expect(SCENARIO_SOURCE).not.toMatch(/자동\s*추천\s*확정/);
  });
});
