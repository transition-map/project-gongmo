import { describe, expect, it } from "vitest";
import { toRegionData, toRegionDataList } from "../regionAdapter";
import type { RegionData, RegionSummary, TransitionIndex } from "../../../types";

const baseRegion: RegionSummary = {
  regionCode: "TEST-01",
  regionName: "테스트시",
  regionCodeType: "sigungu",
};

const legacyFallback: RegionData = {
  regionCode: "LEGACY-01",
  region: "테스트시",
  regionName: "테스트시",
  currentGapIndex: 55,
  trendRiskScore: 42,
  supportChange: -10,
  gapType: "기관 부족형",
  mainIssue: "legacy mainIssue",
  policyUse: "legacy policyUse",
  teacherUse: "legacy teacherUse",
  yearlySupport: [
    { year: 2022, programCount: 10 },
    { year: 2026, programCount: 8 },
  ],
  currentYear: 2026,
};

const mvp1Index: TransitionIndex = {
  regionCode: "TEST-01",
  indicators: {
    transitionGapIndex: 78,
    demandIndex: 80,
    schoolSupportIndex: 60,
    trainingSupplyIndex: 50,
    employmentIndex: 50,
    welfareIndex: 50,
    accessibilityIndex: 50,
  },
  indicatorVersion: "mvp-v1",
  calculatedAt: "2026-05-11T00:00:00+09:00",
};

const demoV0Index: TransitionIndex = {
  regionCode: "TEST-01",
  indicators: { transitionGapIndex: 33 },
  indicatorVersion: "demo-v0",
  calculatedAt: "2026-05-11T00:00:00+09:00",
};

describe("toRegionData", () => {
  it("RegionSummary를 legacy RegionData로 변환", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.regionCode).toBe("TEST-01");
    expect(out.region).toBe("테스트시"); // display name
    expect(out.regionName).toBe("테스트시");
    expect(out.regionCodeType).toBe("sigungu");
  });

  it("calculatedTransitionIndex 주입 시 currentGapIndex가 mvp-v1 값으로 override", () => {
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(78); // mvp-v1
  });

  it("calculatedTransitionIndex 부재 시 region.indicators(demo-v0) 우선", () => {
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(33); // demo-v0
  });

  it("region.indicators도 부재 시 legacy fallback의 currentGapIndex 사용", () => {
    const out = toRegionData({
      region: baseRegion,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(55);
  });

  it("모든 fallback 부재 시 currentGapIndex = 0", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.currentGapIndex).toBe(0);
  });

  it("trendRiskScore / supportChange는 legacy fallback에서 옴", () => {
    const out = toRegionData({
      region: baseRegion,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.trendRiskScore).toBe(42);
    expect(out.supportChange).toBe(-10);
  });

  it("yearlySupport는 region에 있으면 우선, 없으면 legacy fallback", () => {
    const withRegion = toRegionData({
      region: { ...baseRegion, yearlySupport: [{ year: 2025, programCount: 99 }] },
      legacyFallbackRegion: legacyFallback,
    });
    expect(withRegion.yearlySupport).toEqual([{ year: 2025, programCount: 99 }]);

    const fallbackOnly = toRegionData({
      region: baseRegion,
      legacyFallbackRegion: legacyFallback,
    });
    expect(fallbackOnly.yearlySupport).toEqual(legacyFallback.yearlySupport);

    const noFallback = toRegionData({ region: baseRegion });
    expect(noFallback.yearlySupport).toEqual([]);
  });

  it("gapType 부재 시 default '프로그램 부족형'", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.gapType).toBe("프로그램 부족형");
  });

  it("입력 객체가 변형되지 않음 (pure)", () => {
    const region = { ...baseRegion };
    const fallback = { ...legacyFallback };
    const regionSnapshot = JSON.stringify(region);
    const fallbackSnapshot = JSON.stringify(fallback);

    toRegionData({
      region,
      calculatedTransitionIndex: mvp1Index,
      legacyFallbackRegion: fallback,
    });

    expect(JSON.stringify(region)).toBe(regionSnapshot);
    expect(JSON.stringify(fallback)).toBe(fallbackSnapshot);
  });

  // ─── 11-2 1차-11 — partialRegionFlag 보존 ──────────────────────────────
  it("partialRegionFlag=true가 RegionSummary → RegionData로 보존됨 (11-2 1차-11)", () => {
    const out = toRegionData({
      region: { ...baseRegion, partialRegionFlag: true },
    });
    expect(out.partialRegionFlag).toBe(true);
  });

  it("partialRegionFlag 미지정 시 undefined 또는 false (11-2 1차-11)", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.partialRegionFlag ?? false).toBe(false);
  });
});

describe("toRegionDataList", () => {
  const regions: RegionSummary[] = [
    { ...baseRegion, regionCode: "R-01", regionName: "지역1", indicators: { regionCode: "R-01", indicators: { transitionGapIndex: 10 }, indicatorVersion: "demo-v0", calculatedAt: "x" } },
    { ...baseRegion, regionCode: "R-02", regionName: "지역2", indicators: { regionCode: "R-02", indicators: { transitionGapIndex: 20 }, indicatorVersion: "demo-v0", calculatedAt: "x" } },
    { ...baseRegion, regionCode: "R-03", regionName: "지역3", indicators: { regionCode: "R-03", indicators: { transitionGapIndex: 30 }, indicatorVersion: "demo-v0", calculatedAt: "x" } },
  ];

  it("선택 지역 1개만 mvp-v1 override", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionCalculated: mvp1Index,
    });
    expect(out[0].currentGapIndex).toBe(10); // demo-v0
    expect(out[1].currentGapIndex).toBe(78); // mvp-v1
    expect(out[2].currentGapIndex).toBe(30); // demo-v0
  });

  it("selectedRegionCode 미지정 시 모두 demo-v0 유지", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCalculated: mvp1Index,
    });
    expect(out.map((r) => r.currentGapIndex)).toEqual([10, 20, 30]);
  });

  it("legacyFallbackRegions 부재 시 trendRiskScore/supportChange 모두 0", () => {
    const out = toRegionDataList({ regions });
    for (const r of out) {
      expect(r.trendRiskScore).toBe(0);
      expect(r.supportChange).toBe(0);
    }
  });
});

// ─── 11-3 1차-42 신규 — pre-computed indicator.real 병행 노출 ─────────────
//
// 정책 (사용자 합의값 §1-3):
// - regionAdapter에 precomputedTransitionIndex optional input 추가.
// - RegionData에 precomputedTransitionGapIndex?: number 신규 optional field 노출.
// - precomputedTransitionIndex?.indicators?.transitionGapIndex 있으면 복사, 없으면 undefined.
// - **currentGapIndex 우선순위 변경 0** — calculatedTransitionIndex 1순위 그대로.
// - toRegionDataList에 selectedRegionPrecomputed?: TransitionIndex 추가 — 선택 region만 적용.

const precomputedIndex: TransitionIndex = {
  regionCode: "TEST-01",
  indicators: {
    transitionGapIndex: 68,
    demandIndex: 42,
    schoolSupportIndex: 30,
    trainingSupplyIndex: 0,
    employmentIndex: 0,
    welfareIndex: 0,
    accessibilityIndex: 0,
  },
  indicatorVersion: "mvp-v1",
  calculatedAt: "2026-05-11T00:00:00+09:00",
};

describe("toRegionData — precomputedTransitionIndex 병행 노출 (11-3 1차-42)", () => {
  it("precomputedTransitionIndex 입력 시 precomputedTransitionGapIndex 노출", () => {
    const out = toRegionData({
      region: baseRegion,
      precomputedTransitionIndex: precomputedIndex,
    });
    expect(out.precomputedTransitionGapIndex).toBe(68);
  });

  it("precomputedTransitionIndex 미지정 시 precomputedTransitionGapIndex undefined", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.precomputedTransitionGapIndex).toBeUndefined();
  });

  it("precomputedTransitionIndex 입력 시 currentGapIndex 1순위로 사용 (11-3 1차-44 정책 변경)", () => {
    // 11-3 1차-44: precomputed가 calculatedTransitionIndex보다 우선.
    // mvp1Index.transitionGapIndex=78, precomputedIndex.transitionGapIndex=68 →
    // precomputed가 1순위라 currentGapIndex=68.
    // (App.tsx가 etl 모드일 때만 precomputedTransitionIndex 주입하는 정책으로
    //  mock 모드 회귀는 별도 보장 — 본 adapter 단위 테스트는 입력 contract만 검증.)
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      precomputedTransitionIndex: precomputedIndex,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(68); // precomputed가 1순위 (1차-44)
    expect(out.precomputedTransitionGapIndex).toBe(68); // 별도 필드 노출도 그대로 (1차-42 contract)
  });

  it("precomputedTransitionIndex만 있고 calculatedTransitionIndex 없으면 precomputed 1순위 사용 (11-3 1차-44 정책 변경)", () => {
    // 11-3 1차-44: precomputed가 region.indicators / legacy fallback보다도 우선.
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      precomputedTransitionIndex: precomputedIndex,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(68); // precomputed 1순위 (1차-44)
    expect(out.precomputedTransitionGapIndex).toBe(68);
  });

  it("precomputedTransitionIndex.indicators 없으면 precomputedTransitionGapIndex undefined", () => {
    const indexNoIndicators: TransitionIndex = {
      regionCode: "TEST-01",
      indicatorVersion: "mvp-v1",
      calculatedAt: "x",
    };
    const out = toRegionData({
      region: baseRegion,
      precomputedTransitionIndex: indexNoIndicators,
    });
    expect(out.precomputedTransitionGapIndex).toBeUndefined();
  });

  it("기존 4단계 currentGapIndex 우선순위 회귀 (precomputed 미지정 시)", () => {
    // 1) calculatedTransitionIndex 1순위
    const out1 = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out1.currentGapIndex).toBe(78);
    // 2) region.indicators 2순위
    const out2 = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      legacyFallbackRegion: legacyFallback,
    });
    expect(out2.currentGapIndex).toBe(33);
    // 3) legacy fallback 3순위
    const out3 = toRegionData({
      region: baseRegion,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out3.currentGapIndex).toBe(55);
    // 4) 모두 부재 → 0
    const out4 = toRegionData({ region: baseRegion });
    expect(out4.currentGapIndex).toBe(0);
  });
});

describe("toRegionDataList — selectedRegionPrecomputed (11-3 1차-42)", () => {
  const regions: RegionSummary[] = [
    {
      ...baseRegion,
      regionCode: "R-01",
      regionName: "지역1",
      indicators: {
        regionCode: "R-01",
        indicators: { transitionGapIndex: 10 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
    {
      ...baseRegion,
      regionCode: "R-02",
      regionName: "지역2",
      indicators: {
        regionCode: "R-02",
        indicators: { transitionGapIndex: 20 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
    {
      ...baseRegion,
      regionCode: "R-03",
      regionName: "지역3",
      indicators: {
        regionCode: "R-03",
        indicators: { transitionGapIndex: 30 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
  ];

  it("selectedRegionPrecomputed는 선택 region에만 precomputedTransitionGapIndex로 노출", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionPrecomputed: precomputedIndex,
    });
    expect(out[0].precomputedTransitionGapIndex).toBeUndefined();
    expect(out[1].precomputedTransitionGapIndex).toBe(68);
    expect(out[2].precomputedTransitionGapIndex).toBeUndefined();
  });

  it("selectedRegionPrecomputed 입력 시 선택 region currentGapIndex가 precomputed 1순위로 사용 (11-3 1차-44 정책 변경)", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionCalculated: mvp1Index,
      selectedRegionPrecomputed: precomputedIndex,
    });
    // 11-3 1차-44: precomputed (transitionGapIndex=68)가 calculated (78)보다 우선.
    // App.tsx가 etl 모드일 때만 selectedRegionPrecomputed 전달하는 정책으로
    // mock 모드 회귀는 별도 보장. 본 list adapter 테스트는 contract만 검증.
    expect(out[1].currentGapIndex).toBe(68); // precomputed 1순위
    expect(out[1].precomputedTransitionGapIndex).toBe(68); // 별도 필드 노출도 그대로
    // 다른 region(R-01, R-03)은 selectedRegionPrecomputed 미주입 → 기존 region.indicators(demo-v0) 그대로
    expect(out[0].currentGapIndex).toBe(10);
    expect(out[2].currentGapIndex).toBe(30);
  });

  it("selectedRegionPrecomputed 미지정 시 모두 precomputedTransitionGapIndex undefined", () => {
    const out = toRegionDataList({ regions, selectedRegionCode: "R-02" });
    for (const r of out) {
      expect(r.precomputedTransitionGapIndex).toBeUndefined();
    }
  });
});

// ─── 11-3 1차-44 신규 — precomputed indicator.real currentGapIndex 1순위 정책 ──
//
// 정책 (사용자 합의값 §1-4):
// - regionAdapter perspective: precomputedTransitionIndex가 입력되면 currentGapIndex
//   1순위로 사용 (calculatedTransitionIndex / region.indicators / legacy fallback보다 우선).
// - App.tsx가 VITE_DATA_SOURCE === "etl"일 때만 selectedRegionPrecomputed를 전달하는
//   정책으로 mock 모드 회귀는 boundary 분리 (regionAdapter 단위 테스트는 contract만 검증).
// - precomputedTransitionIndex 미지정 / indicators.transitionGapIndex 없음 → 기존 4단계
//   fallback (calculated → region.indicators → legacy → 0) 그대로.
// - precomputedTransitionGapIndex 별도 field 노출은 1차-42 계약대로 유지.
// - trendRiskScore 산식 추가 0건 (legacy fallback 그대로).

describe("toRegionData — precomputedTransitionIndex currentGapIndex 1순위 (11-3 1차-44)", () => {
  it("precomputed > calculated > region.indicators > legacy > 0 — precomputed가 1순위 (현재 모두 보유 시 precomputed 우선)", () => {
    // precomputed=68, calculated=78, region.indicators(demo-v0)=33, legacy=55
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      precomputedTransitionIndex: precomputedIndex,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(68); // precomputed
  });

  it("precomputed.indicators.transitionGapIndex 없으면 기존 4단계 fallback으로 내려감 (calculatedTransitionIndex 1순위)", () => {
    const precomputedNoGap: TransitionIndex = {
      regionCode: "TEST-01",
      indicators: {
        // transitionGapIndex 부재 — 다른 도메인 index만 있다고 가정
        demandIndex: 50,
      },
      indicatorVersion: "mvp-v1",
      calculatedAt: "x",
    };
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      precomputedTransitionIndex: precomputedNoGap,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(78); // calculated (기존 4단계 1순위)
  });

  it("precomputed undefined + calculated 있음 → calculated 1순위 (기존 4단계 회귀)", () => {
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(78);
  });

  it("precomputed undefined + calculated undefined → region.indicators 2순위 (기존 4단계 회귀)", () => {
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(33);
  });

  it("precomputed undefined + calculated undefined + region.indicators 없음 → legacy 3순위 (기존 4단계 회귀)", () => {
    const out = toRegionData({
      region: baseRegion,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(55);
  });

  it("precomputed undefined + 모든 fallback 부재 → 0 (기존 4단계 회귀)", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.currentGapIndex).toBe(0);
  });

  it("1차-42 contract 유지 — precomputedTransitionGapIndex 별도 field 노출은 그대로", () => {
    const out = toRegionData({
      region: baseRegion,
      precomputedTransitionIndex: precomputedIndex,
    });
    expect(out.precomputedTransitionGapIndex).toBe(68);
    // currentGapIndex도 동일 값 (1차-44 — precomputed 1순위)
    expect(out.currentGapIndex).toBe(68);
  });

  it("trendRiskScore는 기존 legacy fallback 정책 그대로 (1차-44에서 산식 추가 0)", () => {
    const out = toRegionData({
      region: baseRegion,
      precomputedTransitionIndex: precomputedIndex,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.trendRiskScore).toBe(42); // legacy fallback 그대로
  });
});

describe("toRegionDataList — selectedRegionPrecomputed currentGapIndex 1순위 (11-3 1차-44)", () => {
  const regions: RegionSummary[] = [
    {
      ...baseRegion,
      regionCode: "R-01",
      regionName: "지역1",
      indicators: {
        regionCode: "R-01",
        indicators: { transitionGapIndex: 10 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
    {
      ...baseRegion,
      regionCode: "R-02",
      regionName: "지역2",
      indicators: {
        regionCode: "R-02",
        indicators: { transitionGapIndex: 20 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
    {
      ...baseRegion,
      regionCode: "R-03",
      regionName: "지역3",
      indicators: {
        regionCode: "R-03",
        indicators: { transitionGapIndex: 30 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
  ];

  it("selectedRegionPrecomputed 주입 시 선택 region currentGapIndex가 precomputed 1순위", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionCalculated: mvp1Index,
      selectedRegionPrecomputed: precomputedIndex,
    });
    expect(out[1].currentGapIndex).toBe(68); // precomputed 1순위 (선택 region)
    // 다른 region은 그대로 region.indicators
    expect(out[0].currentGapIndex).toBe(10);
    expect(out[2].currentGapIndex).toBe(30);
  });

  it("selectedRegionPrecomputed 미지정 시 모든 region이 기존 4단계 우선순위 — mock 모드 회귀 contract", () => {
    // App.tsx가 mock 모드일 때 selectedRegionPrecomputed를 undefined로 전달.
    // 본 케이스가 mock 모드 회귀를 contract 수준에서 보장.
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionCalculated: mvp1Index,
      // selectedRegionPrecomputed undefined
    });
    expect(out[1].currentGapIndex).toBe(78); // calculated (선택 region)
    expect(out[0].currentGapIndex).toBe(10); // region.indicators (demo-v0)
    expect(out[2].currentGapIndex).toBe(30);
  });

  it("selectedRegionPrecomputed가 선택 region의 precomputedTransitionGapIndex만 채움 — 다른 region은 undefined (1차-42 contract 유지)", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionPrecomputed: precomputedIndex,
    });
    expect(out[0].precomputedTransitionGapIndex).toBeUndefined();
    expect(out[1].precomputedTransitionGapIndex).toBe(68);
    expect(out[2].precomputedTransitionGapIndex).toBeUndefined();
  });
});

// ─── 11-3 1차-46 신규 — precomputedIndicatorPartial 안내 flag ────────────────
//
// 정책 (사용자 합의값 §1-4):
// - `RegionSummary`에 `precomputedIndicatorPartial?: boolean` optional field 추가
//   (1차-11 partialRegionFlag / 1차-42 precomputedTransitionGapIndex 패턴 동형, RegionData
//    intersection으로 자동 상속).
// - `regionAdapter.ToRegionDataInput`에 `precomputedIndicatorPartial?: boolean` 추가 —
//   입력 시 RegionData에 그대로 expose.
// - `ToRegionDataListInput`에 `selectedRegionPrecomputedPartial?: boolean` 추가 — 선택
//   region에만 적용 (1차-7 / 1차-42 패턴 동형).
// - App.tsx가 `isEtlMode && dashboardData.demoTransitionIndex !== undefined` 조건으로 true 주입.
// - **`currentGapIndex` 우선순위 변경 0건** (1차-44 정책 그대로) — partial flag는 시각적
//   안내 전용, currentGapIndex 값에 영향 없음.

describe("toRegionData — precomputedIndicatorPartial flag (11-3 1차-46)", () => {
  it("precomputedIndicatorPartial=true 입력 시 RegionData에 노출", () => {
    const out = toRegionData({
      region: baseRegion,
      precomputedIndicatorPartial: true,
    });
    expect(out.precomputedIndicatorPartial).toBe(true);
  });

  it("precomputedIndicatorPartial 미지정 시 RegionData에 undefined", () => {
    const out = toRegionData({ region: baseRegion });
    expect(out.precomputedIndicatorPartial).toBeUndefined();
  });

  it("precomputedIndicatorPartial=false 입력 시 RegionData에 false 노출", () => {
    const out = toRegionData({
      region: baseRegion,
      precomputedIndicatorPartial: false,
    });
    expect(out.precomputedIndicatorPartial).toBe(false);
  });

  it("precomputedIndicatorPartial은 currentGapIndex 우선순위에 영향 0 (1차-44 contract 회귀)", () => {
    // precomputed=68 + partial flag → currentGapIndex는 여전히 precomputed 1순위(68).
    // 만약 partial flag가 우선순위에 영향이 있다면 (예: partial 시 skip) 다른 값이 나옴.
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      precomputedTransitionIndex: precomputedIndex,
      precomputedIndicatorPartial: true,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(68); // precomputed 1순위 (1차-44 그대로)
    expect(out.precomputedTransitionGapIndex).toBe(68);
    expect(out.precomputedIndicatorPartial).toBe(true);
  });

  it("precomputedIndicatorPartial=false 시 currentGapIndex 우선순위 무변경 회귀", () => {
    const out = toRegionData({
      region: { ...baseRegion, indicators: demoV0Index },
      calculatedTransitionIndex: mvp1Index,
      precomputedTransitionIndex: precomputedIndex,
      precomputedIndicatorPartial: false,
      legacyFallbackRegion: legacyFallback,
    });
    expect(out.currentGapIndex).toBe(68);
    expect(out.precomputedIndicatorPartial).toBe(false);
  });
});

describe("toRegionDataList — selectedRegionPrecomputedPartial (11-3 1차-46)", () => {
  const regions: RegionSummary[] = [
    {
      ...baseRegion,
      regionCode: "R-01",
      regionName: "지역1",
      indicators: {
        regionCode: "R-01",
        indicators: { transitionGapIndex: 10 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
    {
      ...baseRegion,
      regionCode: "R-02",
      regionName: "지역2",
      indicators: {
        regionCode: "R-02",
        indicators: { transitionGapIndex: 20 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
    {
      ...baseRegion,
      regionCode: "R-03",
      regionName: "지역3",
      indicators: {
        regionCode: "R-03",
        indicators: { transitionGapIndex: 30 },
        indicatorVersion: "demo-v0",
        calculatedAt: "x",
      },
    },
  ];

  it("selectedRegionPrecomputedPartial=true 입력 시 선택 region에만 적용", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionPrecomputedPartial: true,
    });
    expect(out[0].precomputedIndicatorPartial).toBeUndefined();
    expect(out[1].precomputedIndicatorPartial).toBe(true);
    expect(out[2].precomputedIndicatorPartial).toBeUndefined();
  });

  it("selectedRegionPrecomputedPartial 미지정 시 모든 region에서 undefined (mock 모드 contract)", () => {
    // App.tsx가 mock 모드일 때 selectedRegionPrecomputedPartial을 undefined로 전달.
    // 본 케이스가 mock 모드 회귀를 contract 수준에서 보장.
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
    });
    for (const r of out) {
      expect(r.precomputedIndicatorPartial).toBeUndefined();
    }
  });

  it("selectedRegionPrecomputedPartial=false 시 선택 region에 false 적용 (badge 미표시)", () => {
    const out = toRegionDataList({
      regions,
      selectedRegionCode: "R-02",
      selectedRegionPrecomputedPartial: false,
    });
    expect(out[1].precomputedIndicatorPartial).toBe(false);
    expect(out[0].precomputedIndicatorPartial).toBeUndefined();
    expect(out[2].precomputedIndicatorPartial).toBeUndefined();
  });
});
