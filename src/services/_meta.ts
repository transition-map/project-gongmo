/**
 * Service layer 공용 — ApiMeta 빌더와 도메인별 메타 매핑.
 *
 * 통합 service(region/institution/index/recommend)는 datasetCategory를 무리하게
 * 한 묶음으로 고정하지 않고 undefined로 둔다.
 */

import type { ApiMeta, DatasetCategory } from "../types";

/** service 호출 시 사용하는 도메인 키 */
export type ServiceDomain =
  | "region"
  | "school"
  | "institution"
  | "training"
  | "career"
  | "job"
  | "employment"
  | "welfare"
  | "mobility"
  | "index"
  | "recommend";

interface DomainMetaSeed {
  source: string;
  datasetCategory?: DatasetCategory;
}

/**
 * 도메인별 ApiMeta seed.
 * - 단일 묶음 service는 datasetCategory를 명시.
 * - 통합 service(region/institution/index/recommend)는 datasetCategory undefined.
 */
export const DOMAIN_META: Record<ServiceDomain, DomainMetaSeed> = {
  region: { source: "demo:integrated" },
  school: { source: "demo:학교알리미", datasetCategory: "B" },
  institution: { source: "demo:integrated" },
  training: { source: "demo:HRD-Net", datasetCategory: "C" },
  career: { source: "demo:꿈길", datasetCategory: "C" },
  job: { source: "demo:장애인구인정보", datasetCategory: "D" },
  employment: {
    source: "demo:장애인경제활동실태조사+의무고용현황",
    datasetCategory: "D",
  },
  welfare: { source: "demo:장애인복지시설현황", datasetCategory: "E" },
  mobility: {
    source: "demo:장애인편의시설+이동지원",
    datasetCategory: "F",
  },
  index: { source: "demo:integrated" },
  recommend: { source: "demo:integrated" },
};

/** ApiMeta의 demo 공통 상수. mock 단계에서는 4단계 _shared와 일관되도록 둔다. */
const DEMO_VERSION = "demo-v0";
const DEMO_LICENSE = "demo-only / 공모전 시연용";
const DEMO_BASE_YEAR = 2026;
const DEMO_SOURCE_UPDATED_AT = "2026-05-01T00:00:00+09:00";
const DEMO_COLLECTED_AT = "2026-05-10T00:00:00+09:00";

/**
 * service 응답에 사용할 ApiMeta를 만든다.
 * `extra`로 호출 시점 메타(예: 페이지·정렬·기준연도 변동)를 덮어쓸 수 있다.
 */
export function buildMeta(
  domain: ServiceDomain,
  extra?: Partial<ApiMeta>,
): ApiMeta {
  const seed = DOMAIN_META[domain];
  return {
    source: seed.source,
    datasetCategory: seed.datasetCategory,
    baseYear: DEMO_BASE_YEAR,
    sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
    collectedAt: DEMO_COLLECTED_AT,
    version: DEMO_VERSION,
    license: DEMO_LICENSE,
    regionLevel: "sigungu",
    ...extra,
  };
}
