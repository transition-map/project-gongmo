import type {
  DatasetCategory,
  PaginationMeta,
  RegionCodeType,
} from "./common";

/** API 에러 객체 */
export interface ApiError {
  code: string;
  message: string;
  /** 검증 실패 등 필드 단위 에러일 때 */
  field?: string;
  details?: unknown;
}

/**
 * API 응답 메타. ApiResponse·PaginatedResponse 모두에서 사용.
 *
 * 단위·기준연도·출처는 항상 meta로 노출한다.
 * data만으로는 의미가 전달되어선 안 된다.
 */
export interface ApiMeta {
  source?: string;
  datasetCategory?: DatasetCategory;
  baseYear?: number;
  baseMonth?: number;
  /** 원천 데이터 갱신 시각 (ISO 8601) */
  sourceUpdatedAt?: string;
  /** 데이터 수집 시각 (ISO 8601) */
  collectedAt?: string;
  /** 데이터셋·스키마 버전 */
  version?: string;
  license?: string;

  /** 응답 단위 메타 */
  regionLevel?: RegionCodeType;
  /** 점수·건수·% 등 단위 표기 */
  unit?: string;

  /** 페이지네이션 (목록 응답일 때) */
  page?: PaginationMeta;
}

/**
 * 단일·복합 자원 응답의 표준 봉투.
 * - success가 false인 경우에도 부분 data를 함께 줄 수 있다(예: 6개 도메인 중 1개 실패).
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

/**
 * 목록 응답의 표준 봉투. data는 항상 배열, meta.page는 필수.
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  error?: ApiError;
  meta: ApiMeta & { page: PaginationMeta };
}
