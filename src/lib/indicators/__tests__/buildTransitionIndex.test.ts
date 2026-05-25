import { describe, expect, it } from "vitest";
import { buildTransitionIndex } from "../buildTransitionIndex";
import type { TransitionIndexInput } from "../buildTransitionIndex";

const FIXED_AT = "2026-05-11T00:00:00+09:00";

const minimalInput: TransitionIndexInput = {
  region: { regionCode: "TEST-01", regionName: "테스트시" },
  schools: [],
  institutions: [],
  trainingPrograms: [],
  careerExperiencePrograms: [],
  jobPostings: [],
  welfareFacilities: [],
  mobilityAccess: [],
  baseYear: 2026,
  calculatedAt: FIXED_AT,
};

describe("buildTransitionIndex", () => {
  it("calculatedAt 주입 시 결정적으로 동작", () => {
    const a = buildTransitionIndex(minimalInput);
    const b = buildTransitionIndex(minimalInput);
    expect(a.calculatedAt).toBe(FIXED_AT);
    expect(b.calculatedAt).toBe(FIXED_AT);
    expect(a.indicators).toEqual(b.indicators);
  });

  it("calculatedAt 미주입 시 ISO 8601 형식 자동 채움", () => {
    const result = buildTransitionIndex({
      ...minimalInput,
      calculatedAt: undefined,
    });
    expect(typeof result.calculatedAt).toBe("string");
    // ISO 8601 형식 정규식 (간단)
    expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  });

  it("indicatorVersion === 'mvp-v1'", () => {
    const result = buildTransitionIndex(minimalInput);
    expect(result.indicatorVersion).toBe("mvp-v1");
  });

  it("baseYear 반영", () => {
    const result = buildTransitionIndex({ ...minimalInput, baseYear: 2026 });
    expect(result.baseYear).toBe(2026);
  });

  it("rawMetrics, normalizedScores, indicators 모두 생성", () => {
    const result = buildTransitionIndex(minimalInput);
    expect(result.rawMetrics).toBeDefined();
    expect(result.normalizedScores).toBeDefined();
    expect(result.indicators).toBeDefined();
  });

  it("indicators의 6개 도메인 + transitionGapIndex 모두 0~100 정수", () => {
    const result = buildTransitionIndex(minimalInput);
    const i = result.indicators!;
    const all = [
      i.demandIndex,
      i.schoolSupportIndex,
      i.trainingSupplyIndex,
      i.employmentIndex,
      i.welfareIndex,
      i.accessibilityIndex,
      i.transitionGapIndex,
    ];
    for (const v of all) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("region.regionCode가 결과에 그대로 반영", () => {
    const result = buildTransitionIndex({
      ...minimalInput,
      region: { regionCode: "DEMO-XX-99", regionName: "테스트구" },
    });
    expect(result.regionCode).toBe("DEMO-XX-99");
  });

  it("metaOverrides.sourceUpdatedAt 주입 시 결과에 반영", () => {
    const sourceAt = "2025-11-01T00:00:00+09:00";
    const result = buildTransitionIndex({
      ...minimalInput,
      metaOverrides: { sourceUpdatedAt: sourceAt },
    });
    expect(result.sourceUpdatedAt).toBe(sourceAt);
  });
});
