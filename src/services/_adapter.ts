/**
 * Service layer ↔ data source 경계.
 *
 * - `DataAdapter`: 13개 fetch 함수 인터페이스.
 * - `getDataAdapter()`: 환경변수 `VITE_DATA_SOURCE`로 mock/http 어댑터 선택.
 * - `callAdapter()`: service 함수에서 try/catch + ApiResponse 변환을 한 줄로.
 *
 * 본 파일은 mock 데이터를 직접 import하지 않는다. mock import는 `mockAdapter.ts`만.
 */

import type {
  ApiMeta,
  ApiResponse,
  CareerExperienceProgram,
  EmploymentOutcomeSummary,
  InstitutionSummary,
  InstitutionType,
  JobPosting,
  MobilityAccess,
  RecommendationResult,
  RegionSummary,
  SchoolSummary,
  TrainingProgram,
  TransitionIndex,
  WelfareFacility,
} from "../types";
import { etlAdapter } from "./adapters/etlAdapter";
import { httpAdapter } from "./adapters/httpAdapter";
import { mockAdapter } from "./adapters/mockAdapter";
import { buildMeta, type ServiceDomain } from "./_meta";

/** 13개 fetch 함수 인터페이스. mock·http 어댑터가 모두 구현해야 한다. */
export interface DataAdapter {
  fetchRegions(): Promise<RegionSummary[]>;
  fetchRegionByCode(regionCode: string): Promise<RegionSummary | undefined>;
  fetchSchoolsByRegion(regionCode: string): Promise<SchoolSummary[]>;
  fetchInstitutionsByRegion(regionCode: string): Promise<InstitutionSummary[]>;
  fetchInstitutionsByType(
    institutionType: InstitutionType,
  ): Promise<InstitutionSummary[]>;
  fetchTrainingProgramsByRegion(
    regionCode: string,
  ): Promise<TrainingProgram[]>;
  fetchCareerExperienceProgramsByRegion(
    regionCode: string,
  ): Promise<CareerExperienceProgram[]>;
  fetchJobPostingsByRegion(regionCode: string): Promise<JobPosting[]>;
  fetchEmploymentOutcomeByRegion(
    regionCode: string,
  ): Promise<EmploymentOutcomeSummary | undefined>;
  fetchWelfareFacilitiesByRegion(
    regionCode: string,
  ): Promise<WelfareFacility[]>;
  fetchMobilityAccessByRegion(
    regionCode: string,
    baseYear?: number,
  ): Promise<MobilityAccess[]>;
  fetchTransitionIndexByRegion(
    regionCode: string,
  ): Promise<TransitionIndex | undefined>;
  fetchRecommendationsByRegion(
    regionCode: string,
  ): Promise<RecommendationResult | undefined>;
}

/**
 * 활성 어댑터 캐시.
 * `setDataAdapter()`로 강제 교체 가능 (테스트·디버깅 전용).
 */
let activeAdapter: DataAdapter | null = null;

/**
 * 활성 어댑터 반환. 환경변수 `VITE_DATA_SOURCE` 분기:
 *   - `"http"` → httpAdapter (5단계 stub, 호출 즉시 throw)
 *   - `"etl"` → etlAdapter (11-3 1차-21 — narrow scope: `fetchSchoolsByRegion`만
 *     ETL 시도, 나머지 12개는 mockAdapter delegate. ETL fetch / parse / regionCode
 *     매핑 실패 시 mockAdapter fallback.)
 *   - 그 외 (`undefined`/`"mock"`) → mockAdapter (기본값)
 *
 * stub인 httpAdapter는 호출 시 throw하여 service layer의 `callAdapter()`가
 * ApiResponse error로 변환한다. etlAdapter는 throw 대신 mockAdapter delegate /
 * fallback이라 service 호출은 항상 성공한다.
 */
export function getDataAdapter(): DataAdapter {
  if (activeAdapter) return activeAdapter;
  const source = import.meta.env.VITE_DATA_SOURCE;
  activeAdapter =
    source === "http"
      ? httpAdapter
      : source === "etl"
        ? etlAdapter
        : mockAdapter;
  return activeAdapter;
}

/**
 * 테스트·디버깅용 강제 교체.
 * production code에서는 호출하지 않는다.
 */
export function setDataAdapter(adapter: DataAdapter | null): void {
  activeAdapter = adapter;
}

/**
 * service 함수의 공통 호출 래퍼.
 * - adapter fetcher를 try로 감싸 throw 시 ApiResponse error로 변환.
 * - 성공 시 buildMeta로 일관된 ApiMeta 봉투 생성.
 */
export async function callAdapter<T>(
  domain: ServiceDomain,
  fetcher: () => Promise<T>,
  extraMeta?: Partial<ApiMeta>,
): Promise<ApiResponse<T>> {
  const meta = buildMeta(domain, extraMeta);
  try {
    const data = await fetcher();
    return { success: true, data, meta };
  } catch (e) {
    return {
      success: false,
      error: {
        code: "FETCH_FAILED",
        message: e instanceof Error ? e.message : String(e),
      },
      meta,
    };
  }
}
