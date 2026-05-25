import type {
  DataSourceMeta,
  DisabilityCategoryBreakdown,
  RegionCodeType,
} from "./common";
import type { TransitionIndex } from "./indicator";

/**
 * 지역 식별자. RegionSummary 외 SchoolSummary·InstitutionSummary 등에도
 * embed 형태로 사용한다.
 */
export interface RegionRef {
  /** 기본 키. MVP에서는 sigunguCode와 동일. */
  regionCode: string;
  /** 행정동/법정동 혼재 시 명시 */
  regionCodeType?: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  legalDongCode?: string;
  /** 화면 표시용 한국어 명칭 */
  regionName?: string;
}

/**
 * 묶음 A(전환교육 수요), B(학교·교육 여건), D(고용)의 일부를 시군구 단위로
 * 집계한 지역 요약. 시각화의 1차 단위.
 */
export interface RegionSummary extends RegionRef {
  // === 인구·수요 (묶음 A) ===
  population?: number;
  registeredDisabledCount?: number;
  /** 추정 학생 수요 (집계, 개인 단위 아님) */
  studentDemandCount?: number;
  /**
   * 장애유형별 집계 (시군구 단위). 통계·접근성 분석 전용.
   * 추천 후보 제한에 사용 금지. 자세한 사용 규칙은 `DisabilityCategoryBreakdown` JSDoc 참고.
   */
  disabilityCategoryBreakdown?: DisabilityCategoryBreakdown[];

  // === 자원 카운트 (묶음 B/C/E/D) ===
  schoolCount?: number;
  specialEducationStudentCount?: number;
  specialEducationTeacherCount?: number;
  trainingInstitutionCount?: number;
  careerExperienceCenterCount?: number;
  welfareFacilityCount?: number;
  jobPostingCount?: number;

  // === 통합 지표 ===
  indicators?: TransitionIndex;

  // === 시계열 (선택, 정책 판단용. 학생 추천에는 사용 금지) ===
  yearlySupport?: YearlySupportEntry[];
  currentYear?: number;

  // === 화면 노출용 텍스트 ===
  gapType?: GapType;
  mainIssue?: string;
  policyUse?: string;
  teacherUse?: string;

  /**
   * 데이터 부족·skeletal 지역 표시 플래그 (11-2 1차-11 신규).
   *
   * - `true`: ETL `MartRegionSummaryRecord.partialRegionFlag=true`에 대응하는
   *   skeletal region (admin-union 출신 또는 시연용 demo skeletal). demand/school/
   *   supportCenter 등 주요 카운트가 0 또는 매우 적고, `transitionGapIndex`(예: 60)는
   *   실제 공백이 아닌 **데이터 부재 상태의 산식 기본값**.
   * - `false` 또는 undefined: 정상 데이터 보유 region.
   *
   * 화면에서는 partial badge로 시각적 구분 표시 권장 (Dashboard region 카드 단위).
   * indicator 산식은 partial region에도 동일하게 적용된다 (산식 수정 없음).
   * 자세한 정책은 [CLAUDE.md §15](../../CLAUDE.md) 참조.
   */
  partialRegionFlag?: boolean;

  /**
   * 11-3 1차-42 신규 — pre-computed indicator.real `transitionGapIndex` 병행 노출.
   *
   * 1차-38에서 ETL `runRealIndicatorStage`가 산출한 `data/indicator.real/B/transition_index.real.json`의
   * `indicators.transitionGapIndex` 값. 1차-40 etlAdapter cascade로 `transitionIndexService.getTransitionIndexByRegion`이
   * indicator.real을 fetch 가능해진 후, 1차-42에서 `useRegionDashboardData.demoTransitionIndex` →
   * `App.tsx` → `toRegionDataList({ selectedRegionPrecomputed })` → `regionAdapter.toRegionData`
   * 경로로 RegionSummary/RegionData까지 도달.
   *
   * **`currentGapIndex` 우선순위 변경 0건** — 본 필드는 별도 optional 노출만 (1차-11
   * partialRegionFlag 패턴 동형). 화면 표시 정책(currentGapIndex가 indicator.real을 사용할지
   * 여부)은 1차-44+ 별도 합의로 보류.
   *
   * mock 모드(default): mockAdapter의 demo-v0 TransitionIndex 결과가 전달될 수 있으나
   * partial fixture(C/D/E/F 부재)의 의미와 다른 값이라 본 단계에서는 의미적 활용 없음.
   * etl 모드 + indicator.real 산출 + KOSTAT regionCode 매칭 시 ETL pre-computed 값 노출.
   * 선택 region에만 주입됨 (`toRegionDataList`의 `selectedRegionPrecomputed`).
   */
  precomputedTransitionGapIndex?: number;

  /**
   * 11-3 1차-46 신규 — precomputed indicator.real이 partial 산출물임을 안내하는 flag.
   *
   * indicator.real (1차-38 산출)은 현재 A demand(1차-36) / B school(1차-23) / B-4 supportCenter(1차-34)만
   * 반영하고 C(훈련공급) / D(고용) / E(복지) / F(이동권) 도메인은 부재 — `buildIndicatorOutput`이
   * empty 배열로 전달해 산식상 `(100-도메인점수)*가중치` 항목들이 모두 100 곱하기 가중치(15+15+10+10+10=60)로
   * 페널티 반영됨. 따라서 indicator.real `transitionGapIndex`는 **항상 ~60 이상** 산출되는
   * partial 결과.
   *
   * App.tsx에서 `import.meta.env.VITE_DATA_SOURCE === "etl" && dashboardData.demoTransitionIndex !== undefined`
   * 조건으로 true 주입 (1차-44 `isEtlMode` 분기와 동일 정책). mock 모드는 undefined.
   * **`currentGapIndex` 우선순위에 영향 0** — 시각적 안내 전용. Dashboard.tsx의 partial badge로
   * 사용자에게 부분 산출 지표임을 명시 (1차-11 `partialRegionFlag` badge와 통합 또는 별도 표시).
   *
   * 1차-46 단독으로 mock 모드(default) 화면 표시 변화 0 — 시연 회귀 0건. C/D/E/F 도메인 점진
   * 도입 시점에 false 처리 또는 점진 제거 가능 (별도 시리즈).
   */
  precomputedIndicatorPartial?: boolean;

  // === 데이터 메타 ===
  meta?: DataSourceMeta;
}

/** 연도별 자원 변화. 정책 판단(추세) 목적. */
export interface YearlySupportEntry {
  year: number;
  programCount?: number;
  agencyCount?: number;
  accessibilityScore?: number;
  careerLinkageScore?: number;
  counselingSupportScore?: number;
}

/**
 * 현재 기준 데이터에서 도출되는 공백 유형 (legacy 5종).
 * 새 산식 도입 시 indicator.ts의 IndicatorValues로 점진 이관한다.
 */
export type GapType =
  | "프로그램 부족형"
  | "기관 부족형"
  | "접근성 취약형"
  | "진로연계 약화형"
  | "상담지원 부족형";
