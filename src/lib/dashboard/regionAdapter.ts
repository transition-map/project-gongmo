/**
 * Region 데이터 adapter.
 *
 * RegionSummary(새 6시군구 mock)를 legacy 컴포넌트가 기대하는 RegionData로
 * 변환한다. 기존 컴포넌트(Dashboard, RegionalAnalysis 등) prop 시그니처를
 * 바꾸지 않고 점진 전환할 수 있게 한다.
 *
 * **순수 함수 원칙:**
 * - mock 데이터·service·legacy JSON을 직접 import하지 않는다.
 * - fallback 데이터는 호출자가 파라미터로 주입한다.
 * - 9단계 단위 테스트에서 데이터 의존 없이 입력만으로 검증 가능.
 *
 * **시연용 legacy fallback 주의:**
 * - RegionSummary에 없는 legacy 시각화 필드(yearlySupport, trendRiskScore,
 *   supportChange)는 호출자가 주입한 `legacyFallbackRegion`에서 가져온다.
 * - 이름 매칭이 안 되면 index 기반 fallback을 사용 — 시연용 화면 보조 목적.
 *   실데이터 시점에는 RegionSummary에서 직접 시계열·추세 데이터를 채워야 한다.
 */

import type {
  GapType,
  RegionData,
  RegionSummary,
  TransitionIndex,
} from "../../types";

// ─── 단일 region 변환 ─────────────────────────────────────────────────────
export interface ToRegionDataInput {
  /** 새 도메인 데이터 */
  region: RegionSummary;
  /**
   * mvp-v1 계산 결과. **선택 지역에만 주입**.
   * 주입 시 currentGapIndex가 mvp-v1 transitionGapIndex로 override된다.
   */
  calculatedTransitionIndex?: TransitionIndex;
  /**
   * 비교/디버그용 demo-v0 (현재는 미사용 — region.indicators가 demo-v0를 이미 보유).
   * 향후 화면에서 demo-v0 vs mvp-v1 동시 표시가 필요할 때 사용.
   */
  demoTransitionIndex?: TransitionIndex;
  /**
   * 11-3 1차-42 신규 — pre-computed indicator.real `TransitionIndex` (1차-38 산출,
   * 1차-40 etlAdapter cascade fetch). **선택 지역에만 주입**.
   *
   * 주입 시 `RegionData.precomputedTransitionGapIndex`에 `indicators.transitionGapIndex` 값을
   * 복사해 노출한다. **`currentGapIndex` 우선순위는 변경하지 않음** — 본 단계는 표시 정책
   * 합의(1차-44+)를 위한 안전한 인프라 단계.
   */
  precomputedTransitionIndex?: TransitionIndex;
  /**
   * 11-3 1차-46 신규 — precomputed indicator.real이 partial 산출물임을 안내하는 flag.
   * App.tsx의 `isEtlMode && dashboardData.demoTransitionIndex !== undefined` 조건으로 true 주입.
   * RegionData의 `precomputedIndicatorPartial`로 그대로 전파 (Dashboard partial badge 분기용).
   * **`currentGapIndex` 우선순위에 영향 0** — 시각적 안내 전용.
   */
  precomputedIndicatorPartial?: boolean;
  /**
   * RegionSummary에 없는 legacy 시각화 필드(yearlySupport, trendRiskScore, supportChange)
   * 의 fallback 출처. 호출자가 주입.
   */
  legacyFallbackRegion?: RegionData;
}

const DEFAULT_GAP_TYPE: GapType = "프로그램 부족형";

export function toRegionData(input: ToRegionDataInput): RegionData {
  // 비교/디버그용 demoTransitionIndex는 현재 화면 변환에 직접 사용하지 않음
  // (region.indicators가 demo-v0이므로 중복). 향후 활용 대비 시그니처 유지.
  void input.demoTransitionIndex;

  const {
    region,
    calculatedTransitionIndex,
    precomputedTransitionIndex,
    precomputedIndicatorPartial,
    legacyFallbackRegion,
  } = input;

  // === currentGapIndex 우선순위 (11-3 1차-44 정책 변경) ===
  // 1) precomputedTransitionIndex.indicators.transitionGapIndex — 1차-44 신규 1순위
  //    (App.tsx가 VITE_DATA_SOURCE === "etl"일 때만 selectedRegionPrecomputed 전달하는
  //     정책으로 mock 모드 회귀는 boundary 분리)
  // 2) mvp-v1 (calculatedTransitionIndex) — 선택 지역에만 주입됨
  // 3) demo-v0 (region.indicators.indicators.transitionGapIndex)
  // 4) legacy fallback
  // 5) 0
  // precomputedTransitionIndex.indicators.transitionGapIndex가 부재(또는 indicators 전체 부재)
  // 하면 기존 4단계 fallback(calculated → region.indicators → legacy → 0) 그대로 적용.
  // `precomputedTransitionGapIndex` 별도 optional field 노출은 1차-42 contract 그대로 유지.
  const currentGapIndex =
    precomputedTransitionIndex?.indicators?.transitionGapIndex ??
    calculatedTransitionIndex?.indicators?.transitionGapIndex ??
    region.indicators?.indicators?.transitionGapIndex ??
    legacyFallbackRegion?.currentGapIndex ??
    0;

  // === precomputedTransitionGapIndex (11-3 1차-42 신규) ===
  // pre-computed indicator.real(1차-38 산출, 1차-40 etlAdapter cascade fetch)의
  // transitionGapIndex 값을 별도 optional 필드로 노출. currentGapIndex와 분리.
  const precomputedTransitionGapIndex =
    precomputedTransitionIndex?.indicators?.transitionGapIndex;

  // === RegionSummary에 없는 legacy 시각화 필드 ===
  const trendRiskScore = legacyFallbackRegion?.trendRiskScore ?? 0;
  const supportChange = legacyFallbackRegion?.supportChange ?? 0;
  const yearlySupport =
    region.yearlySupport ?? legacyFallbackRegion?.yearlySupport ?? [];
  const currentYear =
    region.currentYear ?? legacyFallbackRegion?.currentYear ?? 2026;

  // === RegionSummary에 있을 수 있는 텍스트 필드 (없으면 legacy fallback) ===
  const gapType =
    region.gapType ?? legacyFallbackRegion?.gapType ?? DEFAULT_GAP_TYPE;
  const mainIssue = region.mainIssue ?? legacyFallbackRegion?.mainIssue ?? "";
  const policyUse = region.policyUse ?? legacyFallbackRegion?.policyUse ?? "";
  const teacherUse =
    region.teacherUse ?? legacyFallbackRegion?.teacherUse ?? "";

  // === display name (legacy region 필드) ===
  const regionDisplay = region.regionName ?? region.regionCode;

  return {
    // RegionSummary 그대로 유지되는 필드
    regionCode: region.regionCode,
    regionCodeType: region.regionCodeType,
    sidoCode: region.sidoCode,
    sigunguCode: region.sigunguCode,
    legalDongCode: region.legalDongCode,
    regionName: region.regionName,
    population: region.population,
    registeredDisabledCount: region.registeredDisabledCount,
    studentDemandCount: region.studentDemandCount,
    disabilityCategoryBreakdown: region.disabilityCategoryBreakdown,
    schoolCount: region.schoolCount,
    specialEducationStudentCount: region.specialEducationStudentCount,
    specialEducationTeacherCount: region.specialEducationTeacherCount,
    trainingInstitutionCount: region.trainingInstitutionCount,
    careerExperienceCenterCount: region.careerExperienceCenterCount,
    welfareFacilityCount: region.welfareFacilityCount,
    jobPostingCount: region.jobPostingCount,
    indicators: region.indicators,
    // 11-2 1차-11: partialRegionFlag도 legacy RegionData로 보존하여 Dashboard 등이 사용할 수 있게 한다.
    partialRegionFlag: region.partialRegionFlag,
    // 11-3 1차-42: pre-computed indicator.real transitionGapIndex 병행 노출
    // (currentGapIndex 우선순위 무변경, 표시 정책 합의는 1차-44+ 별도).
    precomputedTransitionGapIndex,
    // 11-3 1차-46: precomputed indicator.real이 partial 산출물임을 안내하는 flag.
    // App.tsx에서 etl 모드 + precomputed 있음 시 true 주입. Dashboard.tsx partial badge 분기용.
    // currentGapIndex 우선순위에 영향 0 — 시각적 안내 전용.
    precomputedIndicatorPartial,
    meta: region.meta,

    // RegionData 전용 (legacy alias) 필드 — adapter가 채움
    region: regionDisplay,
    currentGapIndex,
    trendRiskScore,
    supportChange,
    gapType,
    mainIssue,
    policyUse,
    teacherUse,
    yearlySupport,
    currentYear,
  };
}

// ─── 지역 목록 변환 ───────────────────────────────────────────────────────
export interface ToRegionDataListInput {
  regions: RegionSummary[];
  /** 선택 지역 1개에만 mvp-v1 override 적용. */
  selectedRegionCode?: string;
  /** mvp-v1 계산 결과. selectedRegionCode와 짝을 이뤄야 한다. */
  selectedRegionCalculated?: TransitionIndex;
  /**
   * 11-3 1차-42 신규 — pre-computed indicator.real `TransitionIndex`. 선택 지역에만
   * `precomputedTransitionGapIndex`로 노출. `currentGapIndex` 우선순위는 변경하지 않음.
   * `selectedRegionCode`와 짝을 이뤄야 한다.
   */
  selectedRegionPrecomputed?: TransitionIndex;
  /**
   * 11-3 1차-46 신규 — precomputed indicator.real이 partial 산출물임을 안내하는 flag.
   * 선택 region에만 적용 (1차-42 selectedRegionPrecomputed 패턴 동형). App.tsx의
   * `isEtlMode && dashboardData.demoTransitionIndex !== undefined` 조건으로 true 전달.
   * Dashboard.tsx의 partial badge 분기에 사용 — `currentGapIndex` 우선순위에 영향 0.
   */
  selectedRegionPrecomputedPartial?: boolean;
  /** 시연용 legacy 시각화 fallback (yearlySupport·trendRiskScore 등). */
  legacyFallbackRegions?: RegionData[];
}

/**
 * 시연용 legacy fallback 매칭 정책:
 * 1) regionName 일치하는 legacy region 사용
 * 2) 매칭 실패 시 동일 index 사용 (시연용 보조)
 * 3) 그래도 없으면 undefined → adapter가 0/빈 배열로 fallback
 */
function pickLegacyFallback(
  region: RegionSummary,
  index: number,
  legacyList?: RegionData[],
): RegionData | undefined {
  if (!legacyList || legacyList.length === 0) return undefined;
  const byName = legacyList.find((l) => l.region === region.regionName);
  if (byName) return byName;
  return legacyList[index] ?? legacyList[0];
}

export function toRegionDataList(
  input: ToRegionDataListInput,
): RegionData[] {
  const {
    regions,
    selectedRegionCode,
    selectedRegionCalculated,
    selectedRegionPrecomputed,
    selectedRegionPrecomputedPartial,
    legacyFallbackRegions,
  } = input;

  return regions.map((region, index) => {
    const isSelected =
      selectedRegionCode !== undefined &&
      selectedRegionCode.length > 0 &&
      region.regionCode === selectedRegionCode;
    return toRegionData({
      region,
      calculatedTransitionIndex: isSelected
        ? selectedRegionCalculated
        : undefined,
      // 11-3 1차-42 — pre-computed indicator.real도 선택 region에만 주입.
      // currentGapIndex 우선순위 변경 0 (별도 precomputedTransitionGapIndex 필드로만 노출).
      precomputedTransitionIndex: isSelected
        ? selectedRegionPrecomputed
        : undefined,
      // 11-3 1차-46 — partial indicator 안내 flag도 선택 region에만 전파 (Dashboard badge 분기용).
      precomputedIndicatorPartial: isSelected
        ? selectedRegionPrecomputedPartial
        : undefined,
      legacyFallbackRegion: pickLegacyFallback(
        region,
        index,
        legacyFallbackRegions,
      ),
    });
  });
}
