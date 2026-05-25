/**
 * 11-3 1차-67 — curated region text schema infrastructure.
 *
 * fixture(`data/fixtures/curated_region_text_sample.json`)는 사람 작성·검토
 * region 분석 문구(mainIssue / policyUse / teacherUse) link-only registry의
 * 자리표시 schema. 1차-67 시점 records는 빈 배열로 시작하며 실제 문구는
 * 사용자가 별도 단계에서 사람 검수 결과로만 채운다.
 *
 * **정책**:
 * - AI 정책 문구 생성 금지 — 모든 record `aiGenerated: false` 강제.
 * - 사람 검수 결과만 등록 (`_meta.policy.humanReviewRequired: true`).
 * - 1차-67은 schema only — regionAdapter fallback chain에 연결 0건.
 * - records=[]이므로 mainIssue / policyUse / teacherUse 텍스트 생성 0건.
 */

import { describe, expect, it } from "vitest";
import {
  getCuratedRegionText,
  getCuratedRegionTexts,
  curatedRegionTextMeta,
} from "../curatedRegionText";

describe("curatedRegionText — registry 구조 (1차-67 schema-only)", () => {
  const records = getCuratedRegionTexts();

  it("records가 정확히 0개 (schema-only, 텍스트 생성 0건)", () => {
    expect(records.length).toBe(0);
  });

  it("records는 배열 타입", () => {
    expect(Array.isArray(records)).toBe(true);
  });
});

describe("curatedRegionText — _meta 정책 (1차-67)", () => {
  it("_meta.source = 'demo:curated-region-text-registry'", () => {
    expect(curatedRegionTextMeta?.source).toBe(
      "demo:curated-region-text-registry",
    );
  });

  it("_meta.license = 'human-curated'", () => {
    expect(curatedRegionTextMeta?.license).toBe("human-curated");
  });

  it("_meta.datasetCategory = 'curated-region-text'", () => {
    expect(curatedRegionTextMeta?.datasetCategory).toBe("curated-region-text");
  });

  it("_meta.policy.aiGeneratedAllowed = false (AI 생성 금지 강제)", () => {
    expect(curatedRegionTextMeta?.policy?.aiGeneratedAllowed).toBe(false);
  });

  it("_meta.policy.humanReviewRequired = true (사람 검수 의무)", () => {
    expect(curatedRegionTextMeta?.policy?.humanReviewRequired).toBe(true);
  });

  it("_meta.note에 'AI 정책 생성' 부정 또는 '사람 검수' 명시", () => {
    expect(curatedRegionTextMeta?.note).toBeTruthy();
    const note = curatedRegionTextMeta?.note ?? "";
    const hasAiNegation = /AI(\s+정책)?\s*생성/.test(note);
    const hasHumanReview = /사람\s*검수/.test(note);
    expect(
      hasAiNegation || hasHumanReview,
      `_meta.note must explicitly mention 'AI 정책 생성' 부정 or '사람 검수' 취지`,
    ).toBe(true);
  });
});

describe("curatedRegionText — getCuratedRegionText helper (1차-67)", () => {
  it("getCuratedRegionText('DEMO-SIGUNGU-01') = undefined (records 빈 배열)", () => {
    expect(getCuratedRegionText("DEMO-SIGUNGU-01")).toBeUndefined();
  });

  it("getCuratedRegionText('11680') = undefined (records 빈 배열)", () => {
    expect(getCuratedRegionText("11680")).toBeUndefined();
  });

  it("getCuratedRegionText('') = undefined (edge case)", () => {
    expect(getCuratedRegionText("")).toBeUndefined();
  });

  it("getCuratedRegionText는 정확 매칭 lookup만 — 자동 추천/자동 매칭 아님", () => {
    // helper signature 회귀 보호: regionCode 단일 string 인자, 반환은 record 또는 undefined.
    // byRegion / forRegion / matchByPattern 등의 자동 추천 변형은 미도입.
    expect(typeof getCuratedRegionText).toBe("function");
    expect(getCuratedRegionText.length).toBe(1);
  });
});

describe("curatedRegionText — AI 생성 금지 회귀 보호 (1차-67)", () => {
  it("모든 record에서 aiGenerated가 false (records 빈 배열 vacuously true)", () => {
    const records = getCuratedRegionTexts();
    for (const r of records) {
      expect(r.aiGenerated, `aiGenerated must be false on ${r.regionCode}`).toBe(
        false,
      );
    }
  });

  it("모든 record가 mainIssue / policyUse / teacherUse 미생성 (records 빈 배열, 텍스트 생성 0건)", () => {
    const records = getCuratedRegionTexts();
    // 1차-67 시점 records.length === 0이라 본 검증은 vacuously true.
    // 후속 단계에서 사용자가 실제 사람 검수 텍스트를 등록할 때 본 테스트는
    // record가 있어도 작동하도록 유지 — 단지 records.length === 0 contract만
    // schema-only 단계 회귀 보호용으로 유지.
    expect(records.length).toBe(0);
  });
});

describe("curatedRegionText — automatic recommendation helper 미등장 회귀 보호 (1차-67)", () => {
  it("byRegion / forRegion / matchByPattern / recommendForRegion 등 자동 추천 helper export 0건", async () => {
    const mod = await import("../curatedRegionText");
    const exportNames = Object.keys(mod);
    const autoRecommendNames = exportNames.filter((name) =>
      /(byRegion|forRegion|matchByPattern|recommendForRegion|autoMatch|generateText)/i.test(
        name,
      ),
    );
    expect(autoRecommendNames).toEqual([]);
  });
});
