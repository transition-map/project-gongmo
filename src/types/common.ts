/**
 * 공통 타입 — 도메인 가로지르는 기본 타입.
 * 한글 라벨은 별도 label/config에서 관리하며, 본 타입에는 영문 camelCase 식별자만 둔다.
 */

/** 데이터 도메인 분류 (CLAUDE.md §3) */
export type DatasetCategory = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** 지역 코드 레벨 */
export type RegionCodeType =
  | "sido"
  | "sigungu"
  | "haengjeongDong"
  | "legalDong";

/** 좌표 출처 */
export type CoordinateSource =
  | "official"
  | "geocoded"
  | "approximate"
  | "manual"
  | "unknown";

/** 지오코딩 결과 상태 */
export type GeocodingStatus =
  | "verified"
  | "geocoded"
  | "failed"
  | "missing"
  | "manual"
  | "approximate";

/** WGS84 좌표. 모든 좌표는 (lat, lng) 순서로 다룬다. */
export interface Coordinate {
  lat?: number;
  lng?: number;
  coordinateSource?: CoordinateSource;
  geocodingStatus?: GeocodingStatus;
}

/**
 * 데이터 출처·기준연도·갱신시각 등 표준 메타.
 * API 응답 ApiMeta와 도메인 타입 양쪽에서 재사용한다.
 */
export interface DataSourceMeta {
  source?: string;
  datasetCategory?: DatasetCategory;
  baseYear?: number;
  baseMonth?: number;
  /** 데이터 수집 시각 (ISO 8601, 권장 "+09:00") */
  collectedAt?: string;
  /** 원천 데이터 갱신 시각 */
  sourceUpdatedAt?: string;
  /** 데이터셋/스키마 버전 */
  version?: string;
  license?: string;
}

/** 페이지네이션 메타 */
export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
}

/**
 * 장애유형별 집계 1건. **집계 통계 전용**.
 *
 * - 묶음 A(전환교육 수요)에서 시군구·학교 단위 장애유형별 인원 카운트에만 사용한다.
 * - 학생 개인 단위 진단정보가 **아니다**. 개인을 식별·역추적할 수 있는 형태로
 *   사용해서는 안 되며, K-anonymity 미충족 표본은 합산·표시하지 않는다.
 * - **추천 후보 산출에서 장애유형만으로 직업 가능성을 제한하는 용도로 사용 금지.**
 *   본 필드는 RecommendationCandidate / RecommendationContext에는 노출하지 않는다.
 *
 * 사용 가능 위치:
 * - `RegionSummary.disabilityCategoryBreakdown`
 * - `SchoolSummary.disabilityCategoryBreakdown`
 * - `RawMetrics` 내 도메인 변환 중간값
 */
export interface DisabilityCategoryBreakdown {
  /** 표준 분류 코드(예: 보건복지부·교육부 분류 코드). 부재 가능. */
  categoryCode?: string;
  /** 화면 표시·집계 라벨용 명칭(한국어 허용) */
  categoryName: string;
  /** 해당 분류의 집계 인원 수 (집계 단위) */
  count: number;
  /** 데이터 출처 (예: "특수교육통계", "등록장애인 현황") */
  source?: string;
}
