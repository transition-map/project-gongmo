/**
 * 11-3 1차-55 — official resource evidence cards.
 *
 * `data/fixtures/official_resources_sample.json` link-only registry를 import해
 * frontend에서 사용할 수 있는 helper를 제공한다.
 *
 * **정책 (data/fixtures/README.md 일관)**:
 * - AI 정책 문구 생성 금지 / `aiGenerated: false` 강제.
 * - 본문 전문 복제 금지 — 제목·기관·분류·짧은 요약·원문 URL만 보유.
 * - 공식기관·공공기관·연구기관 출처 한정.
 * - **공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.**
 *
 * **본 파일은 region별 매칭 로직을 도입하지 않는다** — 1차-55 단계는 대표 자료 목록을
 * 그대로 노출하는 scaffold. region별 매칭은 후속 단계 별도 합의.
 */

import fixture from "../../data/fixtures/official_resources_sample.json";

export type OfficialResourceSourceType =
  | "official-site"
  | "official-manual"
  | "uploaded-report"
  | "research-paper"
  | "other";

/**
 * 11-3 1차-57 — 기관 유형. Dashboard 대표 카드는 national-agency / public-institution
 * 중심으로 표시한다 (사용자 합의 — 국가 기관·중앙 공공기관·중앙 공공서비스 우선).
 */
export type OrganizationType =
  | "national-agency"
  | "public-institution"
  | "national-service";

/**
 * 11-3 1차-57 — 신선도 단계. Dashboard 대표 카드는 current 우선.
 * - `current`: 2025~2026 또는 계속 갱신되는 공식 서비스
 * - `recent`: 2024
 * - `foundational`: 오래됐지만 기초 근거
 * - `date-unknown`: 연도 확인 어려움
 */
export type FreshnessTier =
  | "current"
  | "recent"
  | "foundational"
  | "date-unknown";

export interface OfficialResource {
  /** Stable identifier. UI key + 후속 region 매칭 합의 시 join key 후보. */
  id: string;
  title: string;
  /** 기관명 (공식·공공·연구). */
  organization: string;
  /**
   * 11-3 1차-57 신규 — 기관 유형 (대표 카드 우선순위 판단용).
   * optional이나 featured 등록 시 사실상 필수 (테스트가 강제).
   */
  organizationType?: OrganizationType;
  /** 분류 라벨 (자유 텍스트). 예: "진로직업교육 성과지표", "취업지원". */
  category: string;
  /** 적용 대상 (자유 라벨 배열). 예: ["고등학교", "전공과"]. optional. */
  targets?: string[];
  /** 활용 상황 라벨 배열. 예: ["진로설계", "취업지원 서비스 연계"]. optional. */
  useCases?: string[];
  /** 외부 원문 URL. `uploaded-report` 등 부재 시 비워두고 `sourceNote` 보유. */
  url?: string;
  sourceType: OfficialResourceSourceType;
  /** 1~2문장 요약. 본문 전문 복제 금지. */
  summary: string;
  /**
   * 11-3 1차-57 신규 — 발행 연도 (있을 때만 입력). `current` 또는 `date-unknown`이
   * 아닌 record는 publishedYear 강제 (테스트로 회귀 보호).
   */
  publishedYear?: number;
  /** 11-3 1차-57 신규 — 신선도 단계. 모든 record 필수. */
  freshnessTier: FreshnessTier;
  /**
   * 11-3 1차-57 신규 — Dashboard 대표 카드 우선순위.
   * - 정수 (1, 2, 3, ...)면 featured. 낮은 값이 상위.
   * - `undefined`면 registry에는 있으나 대표 카드에는 미노출.
   */
  featuredOrder?: number;
  /** 라이선스·이용 안내. 본문 복제 금지 정책 등. */
  licenseNote?: string;
  /** url 부재 시 출처 안내. 예: "uploaded-report — 발표 단계에서 별도 안내". */
  sourceNote?: string;
  /**
   * AI 생성 여부. **본 registry는 항상 false** — AI 정책 문구 생성 금지 정책.
   * 테스트가 모든 record에 false임을 강제한다.
   */
  aiGenerated: boolean;
}

export interface OfficialResourceMeta {
  source?: string;
  license?: string;
  datasetCategory?: string;
  generatedAt?: string;
  note?: string;
  policy?: {
    aiGeneratedAllowed?: boolean;
    fullTextCopyAllowed?: boolean;
    humanReviewRequired?: boolean;
    /**
     * 11-3 1차-57 신규 — 등록 선호 기관 유형 목록. Dashboard 대표 카드 우선순위 정책
     * 명문화. registry는 본 목록 외 기관 유형 등록을 금지하지 않으나 featured는
     * 본 목록 한정 (사용자 합의).
     */
    preferredOrganizationTypes?: OrganizationType[];
  };
}

interface OfficialResourceFixtureFile {
  _meta?: OfficialResourceMeta;
  records?: OfficialResource[];
}

const file = fixture as OfficialResourceFixtureFile;
const allResources: OfficialResource[] = file.records ?? [];

/** 전체 공식자료 목록 반환 (registry 순서 그대로). */
export function getOfficialResources(): OfficialResource[] {
  return allResources;
}

/**
 * 11-3 1차-57 — Dashboard 대표 카드용 featured 목록.
 *
 * `featuredOrder`가 정의된 record만 포함, 오름차순 정렬 (낮은 값이 상위) 후 `limit` 적용.
 * `featuredOrder` 미지정 record는 대표 카드에 노출되지 않는다 (registry에는 남아 `getOfficialResources()`로
 * 접근 가능).
 *
 * **정책 (1차-57)**:
 * - 성과지표 매뉴얼 / 경기교육연구원 보고서는 fixture에서 완전 제거되어 본 함수 결과에 포함 0건 (회귀 보호 테스트로 강제).
 * - 대표 카드는 국가기관·중앙 공공기관 자료 중심 (테스트로 강제).
 *
 * @param limit 최대 반환 개수. 0 이하면 빈 배열.
 */
export function getFeaturedOfficialResources(
  limit: number,
): OfficialResource[] {
  if (limit <= 0) return [];
  return allResources
    .filter((r) => r.featuredOrder !== undefined)
    .slice()
    .sort(
      (a, b) =>
        (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.featuredOrder ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, limit);
}

/** category 일치 record만 반환. 미일치는 빈 배열. */
export function getOfficialResourcesByCategory(
  category: string,
): OfficialResource[] {
  return allResources.filter((r) => r.category === category);
}

/** fixture meta (UI 안내·테스트용). */
export const officialResourcesMeta: OfficialResourceMeta | undefined =
  file._meta;
