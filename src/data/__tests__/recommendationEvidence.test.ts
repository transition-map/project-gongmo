/**
 * 11-3 1차-158 — recommendationEvidence registry + helper 검증 (TDD RED → GREEN).
 *
 * 1차-157 계획 결과의 B 단계: data/fixtures/recommendation_evidence_sample.json
 * (사람 검수 fixture, 4 records) + src/data/recommendationEvidence.ts (read-only
 * helper) + 본 테스트 파일.
 *
 * **정책 (1차-67 / 1차-89 / 1차-136 / 1차-137 동형)**:
 * - AI 정책 문구 생성 금지 — `_meta.policy.aiGeneratedAllowed: false` 강제
 * - 사람 검수 결과만 등록 (`_meta.policy.humanReviewRequired: true`)
 * - 본문 전문 복제 금지 (`_meta.policy.fullTextCopyAllowed: false`)
 * - 모든 record `aiGenerated: false` literal type 강제
 * - fake numeric 필드 금지 — schoolCount / currentGapIndex / trendRiskScore /
 *   yearlySupport / supportCenterCount / welfareFacilityCount / jobPostingCount
 *   슬롯 부재 (회귀 테스트로 강제)
 * - 자동 확정 추천 helper 이름(autoRecommend / decidePolicy / finalDecision /
 *   recommendForRegion / matchOfficialResource / autoMatch / generatePolicy)
 *   export 0건
 * - 금지 단정 표현 0건 — 화면 사용자에게 "API 연결 완료" / "데이터 기반 분석 결과" /
 *   "공식자료 매칭 완료" 등 오인 표현 노출 회피
 *
 * **선택 우선순위 (selectRecommendationEvidence)**:
 *   1) getEvidenceByKeyword(programName) — programName.toLowerCase() includes 매칭
 *   2) getEvidenceByRouteType(routeType)[0]
 *   3) review-candidate-fallback record
 *   4) undefined
 */

import { describe, expect, test } from "vitest";
import {
  getEvidenceByKeyword,
  getEvidenceByRouteType,
  recommendationEvidenceMeta,
  recommendationEvidenceRecords,
  selectRecommendationEvidence,
} from "../recommendationEvidence";
import * as recommendationEvidenceModule from "../recommendationEvidence";

describe("recommendationEvidence — _meta 정책 (1차-67 / 1차-89 / 1차-136 동형)", () => {
  test("_meta.policy.aiGeneratedAllowed === false", () => {
    expect(recommendationEvidenceMeta?.policy.aiGeneratedAllowed).toBe(false);
  });

  test("_meta.policy.humanReviewRequired === true", () => {
    expect(recommendationEvidenceMeta?.policy.humanReviewRequired).toBe(true);
  });

  test("_meta.policy.fullTextCopyAllowed === false", () => {
    expect(recommendationEvidenceMeta?.policy.fullTextCopyAllowed).toBe(false);
  });

  test("_meta.curator 비식별 가공명 보유 (PII 회피)", () => {
    expect(recommendationEvidenceMeta?.curator).toBeDefined();
    expect(typeof recommendationEvidenceMeta?.curator).toBe("string");
    expect(recommendationEvidenceMeta?.curator).not.toMatch(/@/); // 이메일 패턴 차단
  });

  test("_meta.note에 'AI 정책 추천' / '자동 확정 추천' 부정 취지 포함", () => {
    const note = recommendationEvidenceMeta?.note ?? "";
    expect(note).toMatch(/AI 정책 추천|자동 확정 추천/);
  });
});

describe("recommendationEvidence — records 기본 contract", () => {
  test("recommendationEvidenceRecords.length === 4", () => {
    expect(recommendationEvidenceRecords.length).toBe(4);
  });

  test("모든 record aiGenerated === false (AI 생성 0건 회귀)", () => {
    const allFalse = recommendationEvidenceRecords.every(
      (r) => r.aiGenerated === false,
    );
    expect(allFalse).toBe(true);
  });

  test("sourceType union strict (allowed: curated-demo / official-link / etl-derived / research-paper)", () => {
    const allowed = new Set([
      "curated-demo",
      "official-link",
      "etl-derived",
      "research-paper",
    ]);
    const invalid = recommendationEvidenceRecords.filter(
      (r) => !allowed.has(r.sourceType),
    );
    expect(invalid).toEqual([]);
  });

  test("routeType union strict (allowed: school-based / agency-based / online / official-resource / mixed)", () => {
    const allowed = new Set([
      "school-based",
      "agency-based",
      "online",
      "official-resource",
      "mixed",
    ]);
    const invalid = recommendationEvidenceRecords.filter(
      (r) => !allowed.has(r.routeType),
    );
    expect(invalid).toEqual([]);
  });

  test("fake numeric field 0건 회귀 (schoolCount / currentGapIndex / trendRiskScore / yearlySupport / supportCenterCount / welfareFacilityCount / jobPostingCount)", () => {
    const forbidden = [
      "schoolCount",
      "currentGapIndex",
      "trendRiskScore",
      "yearlySupport",
      "supportCenterCount",
      "welfareFacilityCount",
      "jobPostingCount",
    ];
    const violators = recommendationEvidenceRecords.filter((r) =>
      forbidden.some((k) => k in (r as unknown as Record<string, unknown>)),
    );
    expect(violators).toEqual([]);
  });
});

describe("recommendationEvidence — 금지 단정 표현 0건 회귀", () => {
  const FORBIDDEN_EXPRESSIONS = [
    "데이터 기반 분석 결과",
    "공식자료 매칭 완료",
    "한국장애인고용공단 API 연결 완료",
    "복지시설 데이터 연결 완료",
    "교통약자 이동지원 데이터 연결 완료",
    "전국 실데이터 분석 완료",
    "NEIS 전국 지표 연결 완료",
    "완전 실데이터 대시보드 전환",
    "실시간 API 서비스",
    "최종 추천",
    "자동 추천 확정",
    "AI 정책 추천",
  ];

  test("record 본문 (whyThisFits / teacherCheck / familyDiscussion / limitations / sourceLabel)에 금지 표현 0건", () => {
    const hits: Array<{ evidenceId: string; expression: string; field: string }> =
      [];
    for (const rec of recommendationEvidenceRecords) {
      const fields: Array<{ name: string; texts: string[] }> = [
        { name: "whyThisFits", texts: [rec.whyThisFits] },
        { name: "teacherCheck", texts: rec.teacherCheck },
        { name: "familyDiscussion", texts: rec.familyDiscussion },
        { name: "limitations", texts: rec.limitations },
        { name: "sourceLabel", texts: [rec.sourceLabel] },
      ];
      for (const { name, texts } of fields) {
        for (const text of texts) {
          for (const expr of FORBIDDEN_EXPRESSIONS) {
            if (text.includes(expr)) {
              hits.push({
                evidenceId: rec.evidenceId,
                expression: expr,
                field: name,
              });
            }
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });

  test("_meta.note에도 금지 단정 표현 0건 (단, AI 정책 추천 / 자동 확정 추천은 부정 취지로 등장 허용)", () => {
    const note = recommendationEvidenceMeta?.note ?? "";
    // note는 "AI 정책 추천 또는 자동 확정 추천이 아니며 ..." 형태로 부정 의미로만 등장
    const hits = FORBIDDEN_EXPRESSIONS.filter((expr) => {
      if (expr === "AI 정책 추천" || expr === "자동 추천 확정") {
        return false; // 부정 의미로 허용
      }
      return note.includes(expr);
    });
    expect(hits).toEqual([]);
  });
});

describe("recommendationEvidence — getEvidenceByKeyword exact match", () => {
  test("getEvidenceByKeyword('사무보조기초과정 (시연용)') → office-basic-training", () => {
    const evidence = getEvidenceByKeyword("사무보조기초과정 (시연용)");
    expect(evidence).toBeDefined();
    expect(evidence?.evidenceId).toBe("office-basic-training");
  });

  test("getEvidenceByKeyword('지역사업장 직업체험 (시연용)') → workplace-experience", () => {
    const evidence = getEvidenceByKeyword("지역사업장 직업체험 (시연용)");
    expect(evidence).toBeDefined();
    expect(evidence?.evidenceId).toBe("workplace-experience");
  });

  test("getEvidenceByKeyword('사무 보조원 (시연용)') → office-employment-exploration", () => {
    const evidence = getEvidenceByKeyword("사무 보조원 (시연용)");
    expect(evidence).toBeDefined();
    expect(evidence?.evidenceId).toBe("office-employment-exploration");
  });

  test("getEvidenceByKeyword(빈 키워드 입력) → undefined (fallback record는 programKeywords=[]이라 매칭 안 됨)", () => {
    const evidence = getEvidenceByKeyword("완전히 매칭되지 않는 가상 프로그램명 xyz123");
    expect(evidence).toBeUndefined();
  });
});

describe("recommendationEvidence — getEvidenceByRouteType", () => {
  test("getEvidenceByRouteType('mixed')에 review-candidate-fallback 포함", () => {
    const list = getEvidenceByRouteType("mixed");
    const ids = list.map((e) => e.evidenceId);
    expect(ids).toContain("review-candidate-fallback");
  });

  test("getEvidenceByRouteType('agency-based')에 office-basic-training + office-employment-exploration 포함", () => {
    const list = getEvidenceByRouteType("agency-based");
    const ids = list.map((e) => e.evidenceId);
    expect(ids).toContain("office-basic-training");
    expect(ids).toContain("office-employment-exploration");
  });

  test("getEvidenceByRouteType('school-based')에 workplace-experience 포함", () => {
    const list = getEvidenceByRouteType("school-based");
    const ids = list.map((e) => e.evidenceId);
    expect(ids).toContain("workplace-experience");
  });

  test("getEvidenceByRouteType('online') 매칭 0건 (1차-158 fixture 분포)", () => {
    const list = getEvidenceByRouteType("online");
    expect(list).toEqual([]);
  });
});

describe("recommendationEvidence — selectRecommendationEvidence 우선순위", () => {
  test("keyword 매칭이 routeType 매칭보다 우선 — '사무보조기초과정' + routeType='school-based' → office-basic-training", () => {
    const evidence = selectRecommendationEvidence({
      routeType: "school-based",
      programName: "사무보조기초과정 (시연용)",
    });
    expect(evidence?.evidenceId).toBe("office-basic-training");
  });

  test("keyword 매칭 실패 시 routeType 매칭 fallback — programName='unknown program' + routeType='school-based' → workplace-experience", () => {
    const evidence = selectRecommendationEvidence({
      routeType: "school-based",
      programName: "unknown program xyz",
    });
    expect(evidence?.evidenceId).toBe("workplace-experience");
  });

  test("keyword + routeType 모두 매칭 실패 시 fallback record (review-candidate-fallback)", () => {
    const evidence = selectRecommendationEvidence({
      routeType: "online", // 1차-158 fixture에 online routeType record 0건
      programName: "완전히 매칭되지 않는 가상 프로그램명 xyz123",
    });
    expect(evidence?.evidenceId).toBe("review-candidate-fallback");
  });
});

describe("recommendationEvidence — 자동 추천 helper 미등장 회귀 보호", () => {
  test("autoRecommend / decidePolicy / finalDecision / recommendForRegion / matchOfficialResource / autoMatch / generatePolicy export 0건", () => {
    const FORBIDDEN_HELPERS = [
      "autoRecommend",
      "decidePolicy",
      "finalDecision",
      "recommendForRegion",
      "matchOfficialResource",
      "autoMatch",
      "generatePolicy",
    ];
    const moduleKeys = Object.keys(recommendationEvidenceModule);
    const hits = FORBIDDEN_HELPERS.filter((name) => moduleKeys.includes(name));
    expect(hits).toEqual([]);
  });
});
