/**
 * 11-3 1차-55 — official resource evidence cards.
 *
 * fixture(`data/fixtures/official_resources_sample.json`)는 공식자료 link-only registry.
 * AI 정책 문구 생성 금지 — 본 테스트가 registry 구조와 정책 boundary를 강제한다.
 */

import { describe, expect, it } from "vitest";
import {
  getFeaturedOfficialResources,
  getOfficialResources,
  getOfficialResourcesByCategory,
  officialResourcesMeta,
} from "../officialResources";

describe("officialResources — registry 구조 (1차-55)", () => {
  const resources = getOfficialResources();

  it("records가 1개 이상", () => {
    expect(resources.length).toBeGreaterThan(0);
  });

  it("모든 record가 id / title / organization / category / sourceType / summary 보유", () => {
    for (const r of resources) {
      expect(r.id, `id missing on ${JSON.stringify(r)}`).toBeTruthy();
      expect(r.title, `title missing on ${r.id}`).toBeTruthy();
      expect(
        r.organization,
        `organization missing on ${r.id}`,
      ).toBeTruthy();
      expect(r.category, `category missing on ${r.id}`).toBeTruthy();
      expect(r.sourceType, `sourceType missing on ${r.id}`).toBeTruthy();
      expect(r.summary, `summary missing on ${r.id}`).toBeTruthy();
    }
  });

  it("모든 record에서 aiGenerated가 false", () => {
    for (const r of resources) {
      expect(r.aiGenerated, `aiGenerated must be false on ${r.id}`).toBe(false);
    }
  });

  it("url이 있는 record는 http:// 또는 https://로 시작", () => {
    for (const r of resources) {
      if (r.url) {
        expect(
          /^https?:\/\//.test(r.url),
          `url malformed on ${r.id}: ${r.url}`,
        ).toBe(true);
      }
    }
  });

  it("url이 없는 record는 sourceNote 보유 (uploaded-report 등)", () => {
    for (const r of resources) {
      if (!r.url || r.url.length === 0) {
        expect(
          r.sourceNote,
          `sourceNote required when url missing on ${r.id}`,
        ).toBeTruthy();
      }
    }
  });

  it("id가 unique", () => {
    const ids = resources.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("officialResources — _meta 정책 (1차-55)", () => {
  it("_meta.license = 'link-only'", () => {
    expect(officialResourcesMeta?.license).toBe("link-only");
  });

  it("_meta.note에 'AI 정책 생성' 부정 취지 포함 (link-only registry 정책)", () => {
    expect(officialResourcesMeta?.note).toBeTruthy();
    // 정책 명문화: AI 정책 생성이 아니다 / AI 생성이 아니다 등
    const note = officialResourcesMeta?.note ?? "";
    const hasAiNegation = /AI(\s+정책)?\s*생성/.test(note);
    expect(
      hasAiNegation,
      `_meta.note must explicitly mention 'AI 정책 생성' 또는 'AI 생성' (부정 취지)`,
    ).toBe(true);
  });
});

describe("officialResources — getOfficialResourcesByCategory (1차-55)", () => {
  it("존재하는 category를 입력하면 해당 records만 반환", () => {
    const all = getOfficialResources();
    if (all.length === 0) return;
    const firstCategory = all[0].category;
    const filtered = getOfficialResourcesByCategory(firstCategory);
    expect(filtered.length).toBeGreaterThan(0);
    for (const r of filtered) {
      expect(r.category).toBe(firstCategory);
    }
  });

  it("존재하지 않는 category 입력 시 빈 배열", () => {
    const filtered = getOfficialResourcesByCategory(
      "__non-existent-category-xyz__",
    );
    expect(filtered).toEqual([]);
  });
});

// 11-3 1차-57 — registry 국가기관 중심 재정렬 + freshnessTier / publishedYear /
// organizationType / featuredOrder 신규 schema + getFeaturedOfficialResources helper.
// Dashboard 대표 카드는 featured만 표시하고 성과지표 매뉴얼·경기교육연구원 보고서를 제외한다.
const ALLOWED_FRESHNESS_TIERS = [
  "current",
  "recent",
  "foundational",
  "date-unknown",
];
const ALLOWED_ORGANIZATION_TYPES = [
  "national-agency",
  "public-institution",
  "national-service",
];

describe("officialResources — schema 확장 (1차-57)", () => {
  const resources = getOfficialResources();

  it("모든 record에 freshnessTier 보유 + 허용값 한정", () => {
    for (const r of resources) {
      expect(
        r.freshnessTier,
        `freshnessTier missing on ${r.id}`,
      ).toBeTruthy();
      expect(
        ALLOWED_FRESHNESS_TIERS,
        `freshnessTier invalid on ${r.id}: ${r.freshnessTier}`,
      ).toContain(r.freshnessTier);
    }
  });

  it("publishedYear가 있는 record는 1990~2100 사이 정수", () => {
    for (const r of resources) {
      if (r.publishedYear !== undefined) {
        expect(
          Number.isInteger(r.publishedYear),
          `publishedYear must be integer on ${r.id}`,
        ).toBe(true);
        expect(r.publishedYear).toBeGreaterThanOrEqual(1990);
        expect(r.publishedYear).toBeLessThanOrEqual(2100);
      }
    }
  });

  it("freshnessTier='date-unknown'이 아닌 record는 publishedYear 보유", () => {
    for (const r of resources) {
      if (r.freshnessTier !== "date-unknown" && r.freshnessTier !== "current") {
        expect(
          r.publishedYear,
          `publishedYear required on ${r.id} (freshnessTier=${r.freshnessTier})`,
        ).toBeDefined();
      }
    }
  });

  it("organizationType이 있는 record는 허용값 한정", () => {
    for (const r of resources) {
      if (r.organizationType !== undefined) {
        expect(
          ALLOWED_ORGANIZATION_TYPES,
          `organizationType invalid on ${r.id}: ${r.organizationType}`,
        ).toContain(r.organizationType);
      }
    }
  });
});

describe("officialResources — featured 제외 정책 (1차-57)", () => {
  it("featured 목록에 nise-career-job-evaluation-manual 미포함 (성과지표 매뉴얼 제외)", () => {
    const featured = getFeaturedOfficialResources(20);
    const ids = featured.map((r) => r.id);
    expect(ids).not.toContain("nise-career-job-evaluation-manual");
  });

  it("featured 목록에 gie-report-vocational-track-community 미포함 (경기교육연구원 보고서 제외)", () => {
    const featured = getFeaturedOfficialResources(20);
    const ids = featured.map((r) => r.id);
    expect(ids).not.toContain("gie-report-vocational-track-community");
  });
});

describe("officialResources — getFeaturedOfficialResources (1차-57)", () => {
  it("limit 만큼 반환 (대표 카드 우선순위 순)", () => {
    const featured = getFeaturedOfficialResources(6);
    expect(featured.length).toBeLessThanOrEqual(6);
    expect(featured.length).toBeGreaterThan(0);
  });

  it("featured 상위 6개 모두 organizationType이 national-agency 또는 public-institution", () => {
    const featured = getFeaturedOfficialResources(6);
    for (const r of featured) {
      expect(
        r.organizationType,
        `featured top 6 must have organizationType on ${r.id}`,
      ).toBeDefined();
      expect(
        ["national-agency", "public-institution"],
        `featured top 6 must be national-agency 또는 public-institution on ${r.id}: ${r.organizationType}`,
      ).toContain(r.organizationType);
    }
  });

  it("featured 상위 6개 모두 freshnessTier가 current (사용자 합의 우선순위)", () => {
    const featured = getFeaturedOfficialResources(6);
    for (const r of featured) {
      expect(
        r.freshnessTier,
        `featured top 6 must be current freshnessTier on ${r.id}`,
      ).toBe("current");
    }
  });

  it("featured 우선순위 1번이 KEAD 온라인 직업심리검사 안내 (1차-58 갱신)", () => {
    const featured = getFeaturedOfficialResources(6);
    expect(featured[0]).toBeDefined();
    expect(featured[0].id).toBe("kead-online-occupational-test-guidance");
    expect(featured[0].organization).toMatch(/한국장애인고용공단|KEAD/);
  });

  it("limit=0 입력 시 빈 배열", () => {
    expect(getFeaturedOfficialResources(0)).toEqual([]);
  });

  it("limit이 featured 총수보다 크면 모든 featured 반환", () => {
    const all = getFeaturedOfficialResources(100);
    const six = getFeaturedOfficialResources(6);
    expect(all.length).toBeGreaterThanOrEqual(six.length);
  });
});

// 11-3 1차-58 → 1차-60 — Dashboard 공식자료 카드 final state.
// 1차-58은 사용자 지정 5건으로 전면 교체했고, 1차-60에서 CareerNet 자료 중복 정리로
// `careernet-data-1437` (진로실행력검사 활용안내서)을 제거 → 4건.
// 11-3 1차-64에서 KEAD 지역본부·지사 안내(`kead-regional-branches`)를 추가 → 총 5건.
const EXPECTED_RECORD_IDS_1차_60 = [
  "kead-online-occupational-test-guidance",
  "nise-teemh-intro",
  "nise-workshop-2026-737999",
  "careernet-data-list",
];

// 11-3 1차-64 — KEAD 지역본부·지사 안내 카드 추가 (지역별 자동 추천 아님 — link-only 공식 안내).
const KEAD_REGIONAL_BRANCH_ID = "kead-regional-branches";
const EXPECTED_RECORD_IDS_1차_64 = [
  ...EXPECTED_RECORD_IDS_1차_60,
  KEAD_REGIONAL_BRANCH_ID,
];

const REMOVED_RECORD_IDS_1차_60 = [
  // 1차-55 시점에 존재했던 자료 + 1차-57에서 추가됐던 NISE 2026/2025 워크숍 — 1차-58에서 전부 제거
  "nise-career-job-evaluation-manual",
  "gie-report-vocational-track-community",
  "career-net-data-595",
  "kead-youth-career-guidance",
  "kead-student-employment-support",
  "kead-developmental-disability-training-center",
  "mohw-disability-job-program",
  "koddi-disability-job-program",
  "nise-eduable-board",
  "nise-workshop-collection-2025",
  "nise-lifelong-board-460",
  "nise-workshop-collection-2026",
  // 1차-60에서 추가 제거 — CareerNet 자료 중복 정리 (`careernet-data-list`만 유지)
  "careernet-data-1437",
];

describe("officialResources — 1차-60 사용자 지정 4건 registry (CareerNet 중복 정리, 1차-64 KEAD 지역본부·지사 추가 반영)", () => {
  const resources = getOfficialResources();

  // 1차-64에서 KEAD 지역본부·지사 카드(`kead-regional-branches`) 추가로 4건 → 5건.
  it("records가 정확히 5개 (1차-60 4건 + 1차-64 KEAD 지역본부·지사 1건)", () => {
    expect(resources.length).toBe(5);
  });

  it("getFeaturedOfficialResources(6)는 정확히 5개 반환 (featuredOrder 1~5)", () => {
    const featured = getFeaturedOfficialResources(6);
    expect(featured.length).toBe(5);
  });

  it("기존 제거 대상 id가 registry에 없음 (1차-60 시점 — careernet-data-1437 포함)", () => {
    const ids = resources.map((r) => r.id);
    for (const removed of REMOVED_RECORD_IDS_1차_60) {
      expect(ids, `${removed} must be removed`).not.toContain(removed);
    }
  });

  it("기존 제거 대상 id가 featured에도 없음 (1차-60 시점)", () => {
    const featured = getFeaturedOfficialResources(20);
    const featuredIds = featured.map((r) => r.id);
    for (const removed of REMOVED_RECORD_IDS_1차_60) {
      expect(featuredIds, `${removed} must not appear in featured`).not.toContain(
        removed,
      );
    }
  });

  it("careernet-data-1437이 registry와 featured 모두에서 제거됨 (1차-60 중복 정리)", () => {
    const ids = resources.map((r) => r.id);
    expect(ids).not.toContain("careernet-data-1437");
    const featured = getFeaturedOfficialResources(20);
    expect(featured.map((r) => r.id)).not.toContain("careernet-data-1437");
  });

  it("careernet-data-list는 registry와 featured에 유지됨 (1차-60 CareerNet 자료 1건만 유지)", () => {
    const ids = resources.map((r) => r.id);
    expect(ids).toContain("careernet-data-list");
    const featured = getFeaturedOfficialResources(20);
    expect(featured.map((r) => r.id)).toContain("careernet-data-list");
  });

  it("1차-60 4건 id 모두 registry에 존재 (1차-64에서도 그대로 유지)", () => {
    const ids = new Set(resources.map((r) => r.id));
    for (const expected of EXPECTED_RECORD_IDS_1차_60) {
      expect(ids.has(expected), `${expected} must exist in registry`).toBe(true);
    }
  });

  it("featuredOrder가 1~5 정확한 순서 (1차-64 KEAD 지역본부·지사 5번 포함)", () => {
    const featured = getFeaturedOfficialResources(10);
    const orders = featured.map((r) => r.featuredOrder);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  it("featuredOrder 순서가 1차-64 최종 5건과 일치", () => {
    const featured = getFeaturedOfficialResources(10);
    expect(featured.map((r) => r.id)).toEqual(EXPECTED_RECORD_IDS_1차_64);
  });

  it("모든 record가 freshnessTier='current'", () => {
    for (const r of resources) {
      expect(r.freshnessTier, `freshnessTier on ${r.id}`).toBe("current");
    }
  });

  it("모든 record가 aiGenerated=false", () => {
    for (const r of resources) {
      expect(r.aiGenerated, `aiGenerated on ${r.id}`).toBe(false);
    }
  });

  it("모든 record url이 https://로 시작", () => {
    for (const r of resources) {
      expect(r.url, `url required on ${r.id}`).toBeTruthy();
      expect(
        r.url?.startsWith("https://"),
        `url must start with https:// on ${r.id}: ${r.url}`,
      ).toBe(true);
    }
  });

  it("모든 record organizationType이 national-agency 또는 public-institution", () => {
    for (const r of resources) {
      expect(
        ["national-agency", "public-institution"],
        `organizationType on ${r.id}: ${r.organizationType}`,
      ).toContain(r.organizationType);
    }
  });
});

// 11-3 1차-64 — KEAD 지역본부·지사 안내 카드 추가.
// 지역별 자동 추천 아님: 사용자가 KEAD 페이지에서 자기 지역의 지사를 직접 확인하는
// link-only 공식 안내. regionCode → 기관 자동 매칭 helper 신규 등장 0건 (회귀 보호).
describe("officialResources — 1차-64 KEAD 지역본부·지사 안내 카드 추가", () => {
  const resources = getOfficialResources();

  it("kead-regional-branches가 registry에 존재", () => {
    const ids = resources.map((r) => r.id);
    expect(ids).toContain(KEAD_REGIONAL_BRANCH_ID);
  });

  it("kead-regional-branches가 featured에 존재", () => {
    const featured = getFeaturedOfficialResources(20);
    expect(featured.map((r) => r.id)).toContain(KEAD_REGIONAL_BRANCH_ID);
  });

  it("kead-regional-branches의 featuredOrder가 5", () => {
    const record = resources.find((r) => r.id === KEAD_REGIONAL_BRANCH_ID);
    expect(record?.featuredOrder).toBe(5);
  });

  it("kead-regional-branches가 1차-60 4건 다음 5번째 자리에 위치", () => {
    const featured = getFeaturedOfficialResources(20);
    expect(featured[4]?.id).toBe(KEAD_REGIONAL_BRANCH_ID);
  });

  it("kead-regional-branches의 organization이 KEAD 표기", () => {
    const record = resources.find((r) => r.id === KEAD_REGIONAL_BRANCH_ID);
    expect(record?.organization).toMatch(/한국장애인고용공단|KEAD/);
  });

  it("kead-regional-branches가 public-institution / current / official-site / aiGenerated=false", () => {
    const record = resources.find((r) => r.id === KEAD_REGIONAL_BRANCH_ID);
    expect(record).toBeDefined();
    expect(record?.organizationType).toBe("public-institution");
    expect(record?.freshnessTier).toBe("current");
    expect(record?.sourceType).toBe("official-site");
    expect(record?.aiGenerated).toBe(false);
  });

  it("kead-regional-branches url이 KEAD 공식 도메인 (www.kead.or.kr)", () => {
    const record = resources.find((r) => r.id === KEAD_REGIONAL_BRANCH_ID);
    expect(record?.url).toMatch(/^https:\/\/www\.kead\.or\.kr/);
  });

  it("기존 1차-60 4건 id 모두 그대로 유지 (regression)", () => {
    const ids = new Set(resources.map((r) => r.id));
    for (const expected of EXPECTED_RECORD_IDS_1차_60) {
      expect(
        ids.has(expected),
        `${expected} must remain in registry after 1차-64`,
      ).toBe(true);
    }
  });

  it("regionCode 기반 매칭 helper가 신규 export로 등장하지 않음 (자동 매칭 미도입 회귀 보호)", async () => {
    const mod = await import("../officialResources");
    const exportNames = Object.keys(mod);
    const regionMatchingNames = exportNames.filter((name) =>
      /(byRegion|forRegion|byRegionCode|regionalAgencies|matchAgencyToRegion|getResourcesByRegion)/i.test(
        name,
      ),
    );
    expect(regionMatchingNames).toEqual([]);
  });
});
