/**
 * 통합 지표 — 산식 함수는 7단계에서 src/lib/indicators/ 하위에 구현한다.
 * 본 타입은 산식 출력 형태와 메타데이터의 계약을 미리 정의한다.
 */

/**
 * 산식 입력에 쓰이는 원천 수치. 도메인별 컬럼명을 그대로 보존한다.
 * 키는 자유 형식이지만 변환 로직 내부에서만 다루고, 화면에 직접 노출하지 않는다.
 */
export interface RawMetrics {
  [key: string]: number | undefined;
}

/**
 * 0~100으로 정규화된 도메인별 점수.
 * indicator의 1차 가공 결과. 가중합 입력이 된다.
 */
export interface NormalizedScores {
  /** A. 수요 정규화 점수 */
  demand?: number;
  /** B. 학교·교육 여건 정규화 점수 */
  schoolSupport?: number;
  /** C. 진로체험·훈련 공급 정규화 점수 */
  trainingSupply?: number;
  /** D. 일자리·고용 결과 정규화 점수 */
  employment?: number;
  /** E. 복지·생활지원 인프라 정규화 점수 */
  welfare?: number;
  /** F. 이동권·접근성 정규화 점수 */
  accessibility?: number;
}

/**
 * 시군구·학교 단위 최종 지표.
 * 수요지수·공급지수·접근성지수·공백지수 등은 7단계 lib/indicators에서 산출한다.
 */
export interface IndicatorValues {
  /** 수요지수 (A) */
  demandIndex?: number;
  /** 학교 지원 지수 (B) */
  schoolSupportIndex?: number;
  /** 훈련공급 지수 (C) */
  trainingSupplyIndex?: number;
  /** 고용지수 (D) */
  employmentIndex?: number;
  /** 복지지수 (E) */
  welfareIndex?: number;
  /** 접근성지수 (F) */
  accessibilityIndex?: number;
  /** 전환공백지수 (통합·주지표) */
  transitionGapIndex?: number;
}

/**
 * 지표 산출 결과 묶음. 산식 버전·기준연도·계산 시각을 함께 보관해
 * 같은 화면에 다른 버전이 섞이지 않도록 한다.
 */
export interface TransitionIndex {
  /** 시군구 또는 학교 단위 키 */
  regionCode?: string;
  schoolId?: string;

  rawMetrics?: RawMetrics;
  normalizedScores?: NormalizedScores;
  indicators?: IndicatorValues;

  /** 산식 버전 (예: "v0.1-prototype") */
  indicatorVersion: string;
  /** 지표가 계산된 시각 (ISO 8601) */
  calculatedAt: string;

  baseYear?: number;
  baseMonth?: number;
  /** 원천 데이터 갱신 시각 */
  sourceUpdatedAt?: string;
  /** 데이터 수집 시각 */
  collectedAt?: string;
}
