/**
 * 11-3 1차-93 — buildGapTrendSignal pure builder 회귀 보호.
 *
 * region (RegionData) yearlySupport 시계열을 GapTrendSignal[]로 변환.
 * 실제 없는 추세를 사실처럼 표현하지 않도록 unknown 상태 + limitations[] 필수.
 * UI 통합은 1차-95+ 별도 단계.
 */

import { describe, expect, it } from "vitest";
import { buildGapTrendSignal } from "../buildGapTrendSignal";
import * as moduleApi from "../buildGapTrendSignal";
import buildGapTrendSignalSource from "../buildGapTrendSignal.ts?raw";
import type { RegionData, YearlySupportEntry } from "../../../types";

const BASE_YEARLY_DECREASING: YearlySupportEntry[] = [
  { year: 2022, programCount: 22, agencyCount: 11 },
  { year: 2023, programCount: 21, agencyCount: 10 },
  { year: 2024, programCount: 19, agencyCount: 10 },
  { year: 2025, programCount: 17, agencyCount: 9 },
  { year: 2026, programCount: 15, agencyCount: 9 },
];

const BASE_REGION: RegionData = {
  region: "서울 A권역",
  regionCode: "DEMO-SIGUNGU-01",
  regionName: "서울 A권역",
  yearlySupport: BASE_YEARLY_DECREASING,
  currentYear: 2026,
  currentGapIndex: 76,
  trendRiskScore: 50,
  supportChange: -10,
  gapType: "프로그램 부족형",
  mainIssue: "",
  policyUse: "",
  teacherUse: "",
};

describe("buildGapTrendSignal — yearlySupport 보유 시", () => {
  it("배열 1개 이상 반환", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    expect(out.length).toBeGreaterThan(0);
  });

  it("dataMode는 'mock'", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    for (const s of out) {
      expect(s.dataMode).toBe("mock");
    }
  });

  it("trendDirection은 4종 union 내", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    const allowed = ["improving", "stable", "worsening", "unknown"];
    for (const s of out) {
      expect(allowed).toContain(s.trendDirection);
    }
  });

  it("gapLevel은 4종 union 내", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    const allowed = ["low", "medium", "high", "unknown"];
    for (const s of out) {
      expect(allowed).toContain(s.gapLevel);
    }
  });

  it("decreasing programCount → trendDirection 'worsening'", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    // 적어도 1건은 worsening
    const hasWorsening = out.some((s) => s.trendDirection === "worsening");
    expect(hasWorsening).toBe(true);
  });

  it("increasing programCount → trendDirection 'improving'", () => {
    const increasing: RegionData = {
      ...BASE_REGION,
      yearlySupport: [
        { year: 2024, programCount: 10 },
        { year: 2025, programCount: 15 },
        { year: 2026, programCount: 22 },
      ],
    };
    const out = buildGapTrendSignal(increasing);
    const hasImproving = out.some((s) => s.trendDirection === "improving");
    expect(hasImproving).toBe(true);
  });

  it("limitations 비어있지 않음 (시연용 fixture 안내 포함)", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    for (const s of out) {
      expect(s.limitations.length).toBeGreaterThan(0);
    }
  });

  it("evidenceLabel 비어있지 않음", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    for (const s of out) {
      expect(s.evidenceLabel.length).toBeGreaterThan(0);
    }
  });

  it("regionCode가 입력 region.regionCode와 일치", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    for (const s of out) {
      expect(s.regionCode).toBe(BASE_REGION.regionCode);
    }
  });
});

describe("buildGapTrendSignal — yearlySupport 부재 시", () => {
  it("yearlySupport 부재 → 'unknown' trendDirection + limitations", () => {
    const noTrend: RegionData = {
      ...BASE_REGION,
      yearlySupport: [],
    };
    const out = buildGapTrendSignal(noTrend);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].trendDirection).toBe("unknown");
    expect(out[0].gapLevel).toBe("unknown");
    expect(out[0].limitations.length).toBeGreaterThan(0);
  });

  it("yearlySupport 단일 entry → 'unknown' (단일 연도로 추세 단정 금지)", () => {
    const singleEntry: RegionData = {
      ...BASE_REGION,
      yearlySupport: [{ year: 2026, programCount: 15 }],
    };
    const out = buildGapTrendSignal(singleEntry);
    expect(out[0].trendDirection).toBe("unknown");
  });
});

describe("buildGapTrendSignal — 정직성 회귀", () => {
  it("'연도별 추세 분석 완료' 표현이 소스/출력에 없다", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    const allText = JSON.stringify(out);
    expect(allText).not.toMatch(/연도별\s*추세\s*분석\s*완료/);
    expect(buildGapTrendSignalSource).not.toMatch(/연도별\s*추세\s*분석\s*완료/);
  });

  it("'완전 실데이터 대시보드 전환' / '전국 실데이터 분석 완료' 표현 0건", () => {
    expect(buildGapTrendSignalSource).not.toMatch(
      /완전\s*실데이터\s*대시보드\s*전환/,
    );
    expect(buildGapTrendSignalSource).not.toMatch(
      /전국\s*실데이터\s*분석\s*완료/,
    );
  });

  it("자동 확정성 helper export 0건", () => {
    const exported = Object.keys(moduleApi);
    const forbidden = [
      "autoConfirmTrend",
      "decideTrend",
      "forecastTrend",
    ];
    for (const f of forbidden) {
      expect(exported).not.toContain(f);
    }
  });

  it("domain은 6종 union 내", () => {
    const out = buildGapTrendSignal(BASE_REGION);
    const allowed = [
      "demand",
      "school",
      "training",
      "employment",
      "welfare",
      "accessibility",
    ];
    for (const s of out) {
      expect(allowed).toContain(s.domain);
    }
  });
});
