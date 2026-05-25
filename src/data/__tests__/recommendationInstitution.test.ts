/**
 * 11-3 1차-175 — recommendationInstitution fixture + helper 회귀 보호.
 *
 * 1차-173/174에서 합의된 C안 fixture/helper layer. 추천 카드 "기관 후보" 영역
 * 표시용 사람 검수 fixture (1차-158 RecommendationEvidence + 1차-136 region
 * hierarchy + 1차-67 curatedRegionText 패턴 동형).
 *
 * **fixture 정책**:
 * - `_meta.policy.aiGeneratedAllowed: false` literal type 강제
 * - `_meta.policy.humanReviewRequired: true` literal type 강제
 * - `_meta.policy.fullTextCopyAllowed: false` literal type 강제
 * - 모든 record `aiGenerated: false` literal 강제
 * - 모든 `institutionName`에 "시연용" 또는 "(시연용)" 포함
 * - `institutionType` 5-union strict (trainingCenter / supportCenter / school /
 *   employer / publicAgency)
 * - `supportedRouteTypes` 5-union strict (school-based / agency-based / online /
 *   official-resource / mixed)
 * - fake numeric 슬롯 부재 (schoolCount / currentGapIndex / trendRiskScore /
 *   yearlySupport / supportCenterCount / welfareFacilityCount / jobPostingCount)
 *
 * **helper 정책**:
 * - pure function (fetch / env / storage 접근 0건)
 * - `data/mart.real` / `data/master.real` / `data/indicator.real` / `data/raw.api`
 *   직접 import 0건
 * - `officialResources` 모듈 import 0건
 * - 입력 mutate 0건 (새 배열 반환)
 * - 자동 추천 helper 이름 export 0건 (autoRecommend / decidePolicy / finalDecision /
 *   recommendForRegion / matchOfficialResource / autoMatch / generatePolicy /
 *   matchInstitutionComplete / realTimeInstitutionRecommend 등)
 *
 * **selectInstitutionsForCandidate 우선순위 contract**:
 *   1. regionCode + evidenceId 모두 일치
 *   2. regionCode + routeType 일치
 *   3. evidenceId 일치
 *   4. routeType 일치
 *   5. 빈 배열
 *   limit 기본값 3, 중복 institutionId 제거
 */

import { describe, expect, it } from "vitest";
import * as moduleApi from "../recommendationInstitution";
import {
  getInstitutionsByEvidenceId,
  getInstitutionsByRegion,
  getInstitutionsByRouteType,
  recommendationInstitutionMeta,
  recommendationInstitutionRecords,
  selectInstitutionsForCandidate,
} from "../recommendationInstitution";
import recommendationInstitutionSource from "../recommendationInstitution.ts?raw";

const ALLOWED_INSTITUTION_TYPES = new Set([
  "trainingCenter",
  "supportCenter",
  "school",
  "employer",
  "publicAgency",
]);

const ALLOWED_ROUTE_TYPES = new Set([
  "school-based",
  "agency-based",
  "online",
  "official-resource",
  "mixed",
]);

const FAKE_NUMERIC_FIELDS = [
  "schoolCount",
  "currentGapIndex",
  "trendRiskScore",
  "yearlySupport",
  "supportCenterCount",
  "welfareFacilityCount",
  "jobPostingCount",
];

const FORBIDDEN_EXPRESSIONS = [
  "기관 매칭 완료",
  "공식자료 매칭 완료",
  "한국장애인고용공단 API 연결 완료",
  "복지시설 데이터 연결 완료",
  "교통약자 이동지원 데이터 연결 완료",
  "실시간 기관 추천",
  "최종 추천",
  "자동 추천 확정",
  "데이터 기반 분석 결과",
];

const FORBIDDEN_HELPER_EXPORTS = [
  "autoRecommend",
  "decidePolicy",
  "finalDecision",
  "recommendForRegion",
  "matchOfficialResource",
  "autoMatch",
  "generatePolicy",
  "matchInstitutionComplete",
  "realTimeInstitutionRecommend",
];

describe("recommendationInstitution — _meta policy (1차-175)", () => {
  it("policy.aiGeneratedAllowed === false (literal)", () => {
    expect(recommendationInstitutionMeta).toBeDefined();
    expect(recommendationInstitutionMeta?.policy.aiGeneratedAllowed).toBe(false);
  });

  it("policy.humanReviewRequired === true (literal)", () => {
    expect(recommendationInstitutionMeta?.policy.humanReviewRequired).toBe(true);
  });

  it("policy.fullTextCopyAllowed === false (literal)", () => {
    expect(recommendationInstitutionMeta?.policy.fullTextCopyAllowed).toBe(false);
  });

  it("policy.minimumReviewFields에 curator와 reviewedAt이 포함", () => {
    expect(recommendationInstitutionMeta?.policy.minimumReviewFields).toContain(
      "curator",
    );
    expect(recommendationInstitutionMeta?.policy.minimumReviewFields).toContain(
      "reviewedAt",
    );
  });

  it("source / license / datasetCategory 정합", () => {
    expect(recommendationInstitutionMeta?.source).toBe(
      "demo:recommendation-institution-sample-curated",
    );
    expect(recommendationInstitutionMeta?.license).toBe("human-curated");
    expect(recommendationInstitutionMeta?.datasetCategory).toBe(
      "recommendation-institution",
    );
  });

  it("curator 가공명 (PII 회피)", () => {
    const c = recommendationInstitutionMeta?.curator ?? "";
    expect(c.length).toBeGreaterThan(0);
    expect(/@/.test(c)).toBe(false);
    expect(/\d{3}-\d{3,4}-\d{4}/.test(c)).toBe(false);
  });
});

describe("recommendationInstitution — records contract (1차-175)", () => {
  it("records.length === 6", () => {
    expect(recommendationInstitutionRecords.length).toBe(6);
  });

  it("모든 record aiGenerated === false (literal)", () => {
    for (const r of recommendationInstitutionRecords) {
      expect(r.aiGenerated).toBe(false);
    }
  });

  it("모든 institutionName에 '시연용' 또는 '(시연용)' 포함", () => {
    for (const r of recommendationInstitutionRecords) {
      expect(/시연용/.test(r.institutionName)).toBe(true);
    }
  });

  it("institutionType 5-union strict", () => {
    for (const r of recommendationInstitutionRecords) {
      expect(ALLOWED_INSTITUTION_TYPES.has(r.institutionType)).toBe(true);
    }
  });

  it("supportedRouteTypes 5-union strict (각 entry)", () => {
    for (const r of recommendationInstitutionRecords) {
      expect(r.supportedRouteTypes.length).toBeGreaterThan(0);
      for (const rt of r.supportedRouteTypes) {
        expect(ALLOWED_ROUTE_TYPES.has(rt)).toBe(true);
      }
    }
  });

  it("fake numeric 슬롯 0건 (7종 회귀 보호)", () => {
    for (const r of recommendationInstitutionRecords) {
      const keys = Object.keys(r);
      for (const forbidden of FAKE_NUMERIC_FIELDS) {
        expect(keys).not.toContain(forbidden);
      }
    }
  });

  it("필수 7키 모두 보유 (institutionId / institutionName / institutionType / sidoName / sigunguName / regionCode / role)", () => {
    for (const r of recommendationInstitutionRecords) {
      expect(typeof r.institutionId).toBe("string");
      expect(r.institutionId.length).toBeGreaterThan(0);
      expect(typeof r.institutionName).toBe("string");
      expect(r.institutionName.length).toBeGreaterThan(0);
      expect(typeof r.institutionType).toBe("string");
      expect(typeof r.sidoName).toBe("string");
      expect(r.sidoName.length).toBeGreaterThan(0);
      expect(typeof r.sigunguName).toBe("string");
      expect(r.sigunguName.length).toBeGreaterThan(0);
      expect(typeof r.regionCode).toBe("string");
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
      expect(typeof r.role).toBe("string");
      expect(r.role.length).toBeGreaterThan(0);
      expect(typeof r.sourceLabel).toBe("string");
      expect(typeof r.caution).toBe("string");
    }
  });

  it("institutionId 모두 unique", () => {
    const ids = recommendationInstitutionRecords.map((r) => r.institutionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("recommendationInstitution — 금지 표현 회귀 (1차-175)", () => {
  it("fixture source 본문에 금지 표현 0건", () => {
    for (const phrase of FORBIDDEN_EXPRESSIONS) {
      const hitInRecords = recommendationInstitutionRecords.some(
        (r) =>
          r.institutionName.includes(phrase) ||
          r.role.includes(phrase) ||
          r.sourceLabel.includes(phrase) ||
          r.caution.includes(phrase),
      );
      expect(hitInRecords).toBe(false);
    }
  });

  it("helper source 본문에 금지 표현 0건 (JSDoc 정책 contract enumeration 제외)", () => {
    // helper module source에서 JSDoc /** ... */ block을 strip 후 금지 표현 검사.
    // §17.51 / 1차-170 동형 — 정책 contract block에 negation enumeration은 허용,
    // runtime 코드 path / non-JSDoc 주석 / 본문에 forbidden phrase 등장 시 fail.
    const stripped = recommendationInstitutionSource.replace(
      /\/\*\*[\s\S]*?\*\//g,
      "",
    );
    for (const phrase of FORBIDDEN_EXPRESSIONS) {
      expect(stripped).not.toContain(phrase);
    }
  });
});

describe("recommendationInstitution — pure function 정책 (1차-175)", () => {
  it("helper module에 data.real / officialResources import 0건", () => {
    expect(recommendationInstitutionSource).not.toMatch(
      /from\s+["'][^"']*data\/mart\.real/,
    );
    expect(recommendationInstitutionSource).not.toMatch(
      /from\s+["'][^"']*data\/master\.real/,
    );
    expect(recommendationInstitutionSource).not.toMatch(
      /from\s+["'][^"']*data\/indicator\.real/,
    );
    expect(recommendationInstitutionSource).not.toMatch(
      /from\s+["'][^"']*data\/raw\.api/,
    );
    expect(recommendationInstitutionSource).not.toMatch(
      /from\s+["'][^"']*officialResources/,
    );
  });

  it("helper module에 fetch / process.env / localStorage 접근 0건 (JSDoc 정책 contract enumeration 제외)", () => {
    // §17.51 / 1차-170 패턴 동형 — JSDoc /** ... */ block strip 후 검사.
    // 정책 contract block에 negation enumeration(예: "fetch / process.env / localStorage
    // 접근 0건") 등장은 허용, runtime 코드 path에 등장 시 fail.
    const stripped = recommendationInstitutionSource.replace(
      /\/\*\*[\s\S]*?\*\//g,
      "",
    );
    expect(stripped).not.toMatch(/\bfetch\s*\(/);
    expect(stripped).not.toMatch(/process\.env/);
    expect(stripped).not.toMatch(/localStorage/);
    expect(stripped).not.toMatch(/sessionStorage/);
  });

  it("자동 추천 helper 이름 export 0건 (회귀 보호)", () => {
    for (const forbidden of FORBIDDEN_HELPER_EXPORTS) {
      expect(moduleApi).not.toHaveProperty(forbidden);
    }
  });
});

describe("recommendationInstitution — getInstitutionsByRegion (1차-175)", () => {
  it('regionCode "43110"이 청주시 시연용 직업훈련기관 반환', () => {
    const out = getInstitutionsByRegion("43110");
    expect(out.length).toBeGreaterThanOrEqual(1);
    const name = out[0]?.institutionName ?? "";
    expect(name).toContain("청주시");
    expect(name).toContain("훈련");
  });

  it("미존재 regionCode → 빈 배열", () => {
    expect(getInstitutionsByRegion("99999")).toEqual([]);
  });

  it("입력 mutate 0건 (배열 reference 분리)", () => {
    const a = getInstitutionsByRegion("11680");
    const b = getInstitutionsByRegion("11680");
    expect(a).not.toBe(b);
  });
});

describe("recommendationInstitution — getInstitutionsByRouteType (1차-175)", () => {
  it('routeType "school-based"이 해운대구 현장체험 사업장 반환', () => {
    const out = getInstitutionsByRouteType("school-based");
    expect(out.length).toBeGreaterThanOrEqual(1);
    const hit = out.find(
      (r) => r.sigunguName === "해운대구" && r.institutionType === "employer",
    );
    expect(hit).toBeDefined();
    expect(hit?.institutionName).toContain("해운대구");
    expect(hit?.institutionName).toContain("시연용");
  });

  it('routeType "official-resource" → 미존재이므로 빈 배열', () => {
    expect(getInstitutionsByRouteType("official-resource")).toEqual([]);
  });
});

describe("recommendationInstitution — getInstitutionsByEvidenceId (1차-175)", () => {
  it('evidenceId "office-basic-training" → 강남/청주 훈련 기관 모두 반환', () => {
    const out = getInstitutionsByEvidenceId("office-basic-training");
    const sigungus = out.map((r) => r.sigunguName);
    expect(sigungus).toContain("강남구");
    expect(sigungus).toContain("청주시");
  });

  it("미존재 evidenceId → 빈 배열", () => {
    expect(getInstitutionsByEvidenceId("nonexistent-evidence-id")).toEqual([]);
  });
});

describe("recommendationInstitution — selectInstitutionsForCandidate (1차-175)", () => {
  it("regionCode + evidenceId 모두 일치 시 청주 기관 우선", () => {
    const out = selectInstitutionsForCandidate({
      routeType: "agency-based",
      regionCode: "43110",
      evidenceId: "office-basic-training",
    });
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].sigunguName).toBe("청주시");
  });

  it("regionCode 미일치 시 evidenceId fallback — workplace-experience → 해운대 현장체험", () => {
    const out = selectInstitutionsForCandidate({
      routeType: "school-based",
      regionCode: "99999",
      evidenceId: "workplace-experience",
    });
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].sigunguName).toBe("해운대구");
    expect(out[0].institutionType).toBe("employer");
  });

  it("limit 동작 (default 3)", () => {
    const out = selectInstitutionsForCandidate({
      routeType: "agency-based",
    });
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("limit explicit 1", () => {
    const out = selectInstitutionsForCandidate({
      routeType: "agency-based",
      limit: 1,
    });
    expect(out.length).toBeLessThanOrEqual(1);
  });

  it("중복 institutionId 제거 (priority cascade가 동일 record 중복 누적 안 함)", () => {
    const out = selectInstitutionsForCandidate({
      routeType: "agency-based",
      regionCode: "11680",
      evidenceId: "office-basic-training",
      limit: 10,
    });
    const ids = out.map((r) => r.institutionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("routeType + regionCode + evidenceId 모두 미일치 → 빈 배열", () => {
    const out = selectInstitutionsForCandidate({
      routeType: "official-resource",
      regionCode: "99999",
      evidenceId: "nonexistent-evidence-id",
    });
    expect(out).toEqual([]);
  });

  it("입력 mutate 0건 (input object 그대로)", () => {
    const input = {
      routeType: "agency-based" as const,
      regionCode: "43110",
      evidenceId: "office-basic-training",
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    selectInstitutionsForCandidate(input);
    expect(input).toEqual(snapshot);
  });
});
