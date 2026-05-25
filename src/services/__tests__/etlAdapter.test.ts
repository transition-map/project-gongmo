/**
 * etlAdapter.test.ts — 11-3 1차-21 frontend ETL adapter (narrow scope 5a)
 *                    + 11-3 1차-26 master.real URL 전환 (Block A 해결 인프라).
 *
 * 정책 (1차-21 합의값 §1-7 + 1차-26 합의값 §1-6):
 * - VITE_DATA_SOURCE=mock|http|etl 분기 (기본값 mock).
 * - etlAdapter는 narrow scope: fetchSchoolsByRegion만 ETL 시도, 나머지 12개 함수는
 *   mockAdapter delegate.
 * - dynamic import 금지. runtime fetch 사용.
 * - 1차-26: ETL_SCHOOLS_URL을 `/etl-data/B/schools.clean.json`에서
 *   `/etl-data/B/school_master.json`으로 전환. master.real output이 input source.
 * - master.real record shape는 MasterSchoolRecord 기준: regionCode 포함, lat/lng 없음.
 * - regionCode가 있으므로 SchoolSummary.region.regionCode로 매핑.
 * - coordinate는 master record에 lat/lng 없으므로 undefined.
 * - schoolType mapping 정책 그대로 (special → specialSchool, general → generalSchool, ...).
 * - ETL fetch 실패 / JSON parse 실패 / regionCode 매핑 불가(Block B namespace mismatch) →
 *   mockAdapter fallback.
 * - 모든 ETL 학교 일괄 반환 금지 (지역 일관성 보존, 1차-26에서도 유지).
 *
 * Block A / Block B 구분 (1차-26 합의값 §6):
 * - Block A (regionCode 부재) → 1차-26에서 해결. master record에 regionCode가 있어
 *   SchoolSummary.region이 채워진다.
 * - Block B (namespace 불일치) → 1차-26 미해결. master.real는 KOSTAT regionCode("11680" 등),
 *   frontend mock region은 DEMO-SIGUNGU-* — 호출자가 DEMO-SIGUNGU-*로 호출하면 filter 빈 결과
 *   → mock fallback. KOSTAT regionCode("11680" 등)로 직접 호출 시 ETL records 반환.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  etlAdapter,
  mapSchoolType,
  ETL_SCHOOLS_URL,
  ETL_REGIONS_URL,
  ETL_REGION_SUMMARY_MART_URL,
} from "../adapters/etlAdapter";
import { mockAdapter } from "../adapters/mockAdapter";
import { getDataAdapter, setDataAdapter } from "../_adapter";

// 11-3 1차-26 — master.real MasterSchoolRecord shape.
// regionCode 포함 (1차-23 buildSchoolMasterReal 결과), lat/lng / schoolLevel /
// establishmentType 부재.
const SAMPLE_MASTER_RECORD = {
  schoolId: "school:test:gangnam-elem-a",
  neisSchoolCode: "B000000010",
  schoolName: "강남시연초등학교 A",
  schoolType: "general",
  regionCode: "11680", // KOSTAT 강남구
  regionCodeType: "sigungu",
  address: "서울특별시 강남구 어딘가 1",
  sidoName: "서울특별시",
  sigunguName: "강남구",
};

const SAMPLE_MASTER_FILE = {
  _meta: {
    source: "real:B-schools-master",
    stage: "master",
    datasetCategory: "B",
    recordCount: 1,
    issueCount: 0,
    generatedAt: "2026-05-20T00:00:00+09:00",
  },
  records: [SAMPLE_MASTER_RECORD],
  issues: [],
};

afterEach(() => {
  setDataAdapter(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── source 분기 (VITE_DATA_SOURCE) ────────────────────────────────────────
describe("getDataAdapter (11-3 1차-21 VITE_DATA_SOURCE=etl 분기)", () => {
  it("VITE_DATA_SOURCE=etl → etlAdapter 선택", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "etl");
    setDataAdapter(null);
    expect(getDataAdapter()).toBe(etlAdapter);
  });

  it("VITE_DATA_SOURCE=mock → mockAdapter 선택 (회귀)", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "mock");
    setDataAdapter(null);
    expect(getDataAdapter()).toBe(mockAdapter);
  });

  it("VITE_DATA_SOURCE 미설정 → mockAdapter 기본 (회귀)", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "");
    setDataAdapter(null);
    expect(getDataAdapter()).toBe(mockAdapter);
  });
});

// ─── schoolType mapping (사용자 합의값 §5) ─────────────────────────────────
describe("mapSchoolType (11-3 1차-21)", () => {
  it("\"special\" → \"specialSchool\"", () => {
    expect(mapSchoolType("special")).toBe("specialSchool");
  });

  it("\"general\" → \"generalSchool\"", () => {
    expect(mapSchoolType("general")).toBe("generalSchool");
  });

  it("\"alternative\" → \"alternativeSchool\"", () => {
    expect(mapSchoolType("alternative")).toBe("alternativeSchool");
  });

  it("\"other\" → \"other\"", () => {
    expect(mapSchoolType("other")).toBe("other");
  });

  it("null → \"other\" (unknown fallback)", () => {
    expect(mapSchoolType(null)).toBe("other");
  });

  it("정의 외 문자열 → \"other\" (unknown fallback)", () => {
    expect(mapSchoolType("vocational")).toBe("other");
  });
});

// ─── 11-3 1차-26 — master.real URL 전환 + regionCode 매핑 ──────────────────
describe("etlAdapter — master.real URL 전환 (11-3 1차-26 Block A 해결)", () => {
  it("ETL_SCHOOLS_URL은 /etl-data/B/school_master.json (1차-26 전환)", () => {
    expect(ETL_SCHOOLS_URL).toBe("/etl-data/B/school_master.json");
  });

  it("ETL fetch가 master.real URL(school_master.json)을 호출한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchSchoolsByRegion("11680");
    expect(fetchSpy).toHaveBeenCalledWith("/etl-data/B/school_master.json");
  });

  it("KOSTAT regionCode 일치 시 ETL records 반환 (Block A 해결 — fallback 미경유)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    const result = await etlAdapter.fetchSchoolsByRegion("11680");
    expect(result.length).toBe(1);
    expect(result[0].schoolId).toBe(SAMPLE_MASTER_RECORD.schoolId);
    expect(result[0].schoolName).toBe(SAMPLE_MASTER_RECORD.schoolName);
  });

  it("매핑된 SchoolSummary.region.regionCode에 master record의 regionCode가 부여됨 (Block A 해결)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    const result = await etlAdapter.fetchSchoolsByRegion("11680");
    expect(result[0].region).toBeDefined();
    expect(result[0].region?.regionCode).toBe("11680");
    expect(result[0].region?.regionCodeType).toBe("sigungu");
  });

  it("매핑된 SchoolSummary.coordinate는 undefined (master record에 lat/lng 없음)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    const result = await etlAdapter.fetchSchoolsByRegion("11680");
    expect(result[0].coordinate).toBeUndefined();
  });

  it("매핑된 SchoolSummary.schoolType은 1차-21 매핑 정책 그대로 (general → generalSchool)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    const result = await etlAdapter.fetchSchoolsByRegion("11680");
    expect(result[0].schoolType).toBe("generalSchool");
  });

  it("매핑된 SchoolSummary는 master record의 sidoName + sigunguName을 region.regionName으로 derived 전파한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    const result = await etlAdapter.fetchSchoolsByRegion("11680");
    // RegionRef는 sidoCode/sigunguCode (codes)만 보유. sidoName/sigunguName(names)은
    // regionName으로 derived 합성된다 (1차-26 §3 — 무리한 hardcode 금지).
    expect(result[0].region?.regionName).toBe("서울특별시 강남구");
  });

  it("master record의 sidoName 또는 sigunguName 부재 시 region.regionName은 undefined", async () => {
    const partial = { ...SAMPLE_MASTER_RECORD, sidoName: undefined };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...SAMPLE_MASTER_FILE, records: [partial] }),
      }),
    );
    const result = await etlAdapter.fetchSchoolsByRegion("11680");
    expect(result[0].region?.regionName).toBeUndefined();
    // regionCode는 여전히 부여됨
    expect(result[0].region?.regionCode).toBe("11680");
  });
});

// ─── etlAdapter.fetchSchoolsByRegion — fallback 정책 ────────────────────────
describe("etlAdapter.fetchSchoolsByRegion — fallback 정책 (11-3 1차-21·1차-26)", () => {
  it("ETL fetch 404 → mockAdapter.fetchSchoolsByRegion fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const mockResult = await mockAdapter.fetchSchoolsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchSchoolsByRegion("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
    expect(result.length).toBeGreaterThan(0);
  });

  it("ETL fetch network error → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const mockResult = await mockAdapter.fetchSchoolsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchSchoolsByRegion("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
  });

  it("ETL JSON parse 실패 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
      }),
    );
    const mockResult = await mockAdapter.fetchSchoolsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchSchoolsByRegion("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
  });

  it("ETL JSON에 records 없음 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...SAMPLE_MASTER_FILE, records: [] }),
      }),
    );
    const mockResult = await mockAdapter.fetchSchoolsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchSchoolsByRegion("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
  });

  it("Block B — DEMO-SIGUNGU-* 호출 시 KOSTAT regionCode와 불일치 → 모든 ETL 학교 반환 금지, mockAdapter fallback (1차-26 합의값 §6)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    const mockResult = await mockAdapter.fetchSchoolsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchSchoolsByRegion("DEMO-SIGUNGU-01");
    // master record는 regionCode="11680" (KOSTAT), 호출자는 "DEMO-SIGUNGU-01" → namespace
    // 불일치로 filter 빈 결과 → mock fallback. ETL의 schoolId가 결과에 포함되어선 안 됨.
    expect(result).toEqual(mockResult);
    expect(
      result.find((s) => s.schoolId === SAMPLE_MASTER_RECORD.schoolId),
    ).toBeUndefined();
  });

  it("Block B — KOSTAT regionCode로 호출했으나 master records에 해당 regionCode 없음 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_MASTER_FILE,
      }),
    );
    // master는 11680만 보유, 11500 호출
    const mockResult = await mockAdapter.fetchSchoolsByRegion("11500");
    const result = await etlAdapter.fetchSchoolsByRegion("11500");
    expect(result).toEqual(mockResult);
  });
});

// ─── narrow scope — 나머지 mockAdapter delegate ────────────────────────────
//
// 11-3 1차-28 의미 갱신 — fetchRegions / fetchRegionByCode가 ETL 분기로 이동.
// 11-3 1차-40 의미 갱신 — fetchTransitionIndexByRegion이 indicator.real cascade로 이동.
// 13개 fetch 함수 중 4개가 ETL 분기 (fetchSchoolsByRegion / fetchRegions /
// fetchRegionByCode / fetchTransitionIndexByRegion). 본 describe는 나머지 9개 delegate
// 회귀 케이스만 검증.
describe("etlAdapter 9개 delegate (11-3 1차-21 narrow scope, 1차-26·1차-28·1차-40 갱신)", () => {
  it("fetchInstitutionsByRegion → mockAdapter.fetchInstitutionsByRegion 결과와 동일", async () => {
    const mockResult = await mockAdapter.fetchInstitutionsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchInstitutionsByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });

  it("fetchRecommendationsByRegion → mockAdapter 결과와 동일", async () => {
    const mockResult = await mockAdapter.fetchRecommendationsByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchRecommendationsByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });
});

// ─── ETL 미사용 시 fetch 호출 0건 (mockAdapter 분기) ────────────────────────
//
// 11-3 1차-28 의미 갱신 — fetchRegions는 이제 fetch를 호출하므로 narrow scope guard에서 제외.
// 11-3 1차-40 의미 갱신 — fetchTransitionIndexByRegion도 fetch를 호출하므로 narrow scope guard
// 호출 목록에서 제외 (indicator.real cascade로 이동). 남은 9개 delegate 함수 중
// sample(`fetchInstitutionsByRegion`)만 검증.
describe("etlAdapter — narrow scope guard (11-3 1차-21·1차-26·1차-28·1차-40 갱신)", () => {
  it("ETL delegate 함수 (mock 직접 호출) 시 fetch가 호출되지 않는다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchInstitutionsByRegion("DEMO-SIGUNGU-01");
    await etlAdapter.fetchRecommendationsByRegion("DEMO-SIGUNGU-01");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── 11-3 1차-28 신규 — ETL G admin_codes 기반 region 분기 ─────────────────
//
// 정책 (1차-28 합의값 §1-5):
// - ETL_REGIONS_URL = /etl-data/G/admin_codes.clean.json (기존 vite middleware가
//   data/clean.real/G/admin_codes.clean.json으로 라우팅 — vite.config.ts 무수정).
// - fetchRegions / fetchRegionByCode만 ETL 시도, 나머지 함수는 mockAdapter delegate 유지.
// - 매핑: regionCode / regionCodeType / sidoCode / sigunguCode / regionName
//   (sidoName + " " + sigunguName derived 합성).
// - mock의 풍부한 도메인 필드 (population, mainIssue, yearlySupport, indicators 등)는
//   ETL admin_codes에 없으므로 mapped RegionSummary에서 undefined.
// - fallback: 404 / network / parse 실패 / records 빈 → mockAdapter.fetchRegions.
// - fetchRegionByCode: ETL에서 일치하는 record 있으면 반환, 그 외 mockAdapter.fetchRegionByCode
//   fallback (KOSTAT code가 mock에 없으면 자연스럽게 undefined).

const SAMPLE_ADMIN_RECORDS = [
  {
    regionCode: "11680",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11680",
    sidoName: "서울특별시",
    sigunguName: "강남구",
  },
  {
    regionCode: "26350",
    regionCodeType: "sigungu",
    sidoCode: "26",
    sigunguCode: "26350",
    sidoName: "부산광역시",
    sigunguName: "해운대구",
  },
  {
    regionCode: "30110",
    regionCodeType: "sigungu",
    sidoCode: "30",
    sigunguCode: "30110",
    sidoName: "대전광역시",
    sigunguName: "동구",
  },
];

const SAMPLE_ADMIN_FILE = {
  _meta: {
    source: "real:kikcd-b",
    datasetCategory: "G",
    stage: "clean",
    recordCount: 3,
    issueCount: 0,
    generatedAt: "2026-05-20T00:00:00+09:00",
  },
  records: SAMPLE_ADMIN_RECORDS,
  issues: [],
};

describe("etlAdapter — ETL admin_codes 기반 region 분기 (11-3 1차-28)", () => {
  it("ETL_REGIONS_URL은 /etl-data/G/admin_codes.clean.json (1차-28 신규 상수)", () => {
    expect(ETL_REGIONS_URL).toBe("/etl-data/G/admin_codes.clean.json");
  });

  it("fetchRegions()는 ETL_REGIONS_URL을 호출한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchRegions();
    expect(fetchSpy).toHaveBeenCalledWith(ETL_REGIONS_URL);
  });

  it("ETL admin_codes 정상 응답 → KOSTAT regionCode 보유 RegionSummary[] 반환", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegions();
    expect(result.length).toBe(3);
    expect(result.map((r) => r.regionCode).sort()).toEqual([
      "11680",
      "26350",
      "30110",
    ]);
  });

  it("매핑된 RegionSummary는 regionCode / regionCodeType / sidoCode / sigunguCode 보유", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    expect(gangnam).toBeDefined();
    expect(gangnam?.regionCodeType).toBe("sigungu");
    expect(gangnam?.sidoCode).toBe("11");
    expect(gangnam?.sigunguCode).toBe("11680");
  });

  it("regionName은 sidoName + \" \" + sigunguName derived 합성", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    expect(gangnam?.regionName).toBe("서울특별시 강남구");
  });

  it("매핑된 RegionSummary는 mock의 풍부한 도메인 필드(mainIssue, yearlySupport, indicators 등) 미보유", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    // ETL admin_codes는 도메인 필드를 제공하지 않음 — 1차-30+ mart.real 도입 시 보강.
    expect(gangnam?.population).toBeUndefined();
    expect(gangnam?.mainIssue).toBeUndefined();
    expect(gangnam?.yearlySupport).toBeUndefined();
    expect(gangnam?.indicators).toBeUndefined();
    expect(gangnam?.schoolCount).toBeUndefined();
  });

  it("ETL fetch 404 → mockAdapter.fetchRegions fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const mockResult = await mockAdapter.fetchRegions();
    const result = await etlAdapter.fetchRegions();
    expect(result).toEqual(mockResult);
    expect(result.length).toBeGreaterThan(0);
  });

  it("ETL fetch network error → mockAdapter.fetchRegions fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const mockResult = await mockAdapter.fetchRegions();
    const result = await etlAdapter.fetchRegions();
    expect(result).toEqual(mockResult);
  });

  it("ETL JSON parse 실패 → mockAdapter.fetchRegions fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
      }),
    );
    const mockResult = await mockAdapter.fetchRegions();
    const result = await etlAdapter.fetchRegions();
    expect(result).toEqual(mockResult);
  });

  it("ETL records 빈 배열 → mockAdapter.fetchRegions fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...SAMPLE_ADMIN_FILE, records: [] }),
      }),
    );
    const mockResult = await mockAdapter.fetchRegions();
    const result = await etlAdapter.fetchRegions();
    expect(result).toEqual(mockResult);
  });

  it("fetchRegionByCode(\"11680\") KOSTAT 일치 → 해당 ETL region 반환", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegionByCode("11680");
    expect(result).toBeDefined();
    expect(result?.regionCode).toBe("11680");
    expect(result?.regionName).toBe("서울특별시 강남구");
  });

  it("fetchRegionByCode(\"DEMO-SIGUNGU-01\") — ETL records 있으나 미일치 → mockAdapter.fetchRegionByCode fallback (mock region 반환)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const mockResult = await mockAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    const result = await etlAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
    expect(result?.regionCode).toBe("DEMO-SIGUNGU-01");
  });

  it("fetchRegionByCode(\"99999\") — ETL records 있으나 미일치 + mock에도 없음 → undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegionByCode("99999");
    expect(result).toBeUndefined();
  });

  it("fetchRegionByCode — ETL fetch 실패 시 mockAdapter.fetchRegionByCode fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const mockResult = await mockAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    const result = await etlAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
  });

  // ─── DEMO ↔ KOSTAT hardcoded mapping 미도입 회귀 ────────────────────────
  it("hardcoded DEMO-SIGUNGU ↔ KOSTAT mapping 미도입 — \"DEMO-SIGUNGU-01\" 호출 시 KOSTAT region 반환 금지 (mock fallback만 허용)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    );
    const result = await etlAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    // 결과 regionCode는 절대 KOSTAT 5자리 숫자가 되어선 안 됨 (DEMO ↔ KOSTAT
    // hardcoded mapping이 들어오면 이 케이스가 실패함).
    expect(result?.regionCode).not.toMatch(/^\d{5}$/);
  });
});

// ─── 11-3 1차-32 신규 — mart.real region_summary 우선 분기 + 3단계 cascade ──
//
// 정책 (1차-32 합의값 §1-6):
// - primary: ETL_REGION_SUMMARY_MART_URL = "/etl-data/B/region_summary.mart.json"
// - secondary fallback: ETL_REGIONS_URL = "/etl-data/G/admin_codes.clean.json" (1차-28 그대로)
// - final fallback: mockAdapter
// - cascade: mart.real → admin_codes → mock
// - 매핑: regionCode/regionCodeType/sidoCode/sigunguCode/regionName + **schoolCount**
//   + partialRegionFlag. supportCenterCount는 mart 값 그대로 (현재 0).
//   specialSchoolCount/specialClassCount는 RegionSummary에 동등 필드 없음 → 미반영.
//   mainIssue/yearlySupport/indicators/population 등은 mart.real에 없음 → undefined.
// - fetchRegionByCode: mart.real match → mart region 반환. mart miss → admin_codes match →
//   admin region 반환. 둘 다 miss → mockAdapter.fetchRegionByCode fallback.

const SAMPLE_MART_RECORDS = [
  {
    regionCode: "11680",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11680",
    sidoName: "서울특별시",
    sigunguName: "강남구",
    regionName: "서울특별시 강남구",
    schoolCount: 3,
    specialSchoolCount: 1,
    specialClassCount: 1,
    supportCenterCount: 0,
    trainingInstitutionCount: 0,
    careerExperienceCenterCount: 0,
    welfareFacilityCount: 0,
    jobPostingCount: 0,
    partialRegionFlag: false,
    meta: { source: "demo:fixture-etl", note: "partial fixture — C/D/E/F domains missing" },
  },
  {
    regionCode: "26350",
    regionCodeType: "sigungu",
    sidoCode: "26",
    sigunguCode: "26350",
    sidoName: "부산광역시",
    sigunguName: "해운대구",
    regionName: "부산광역시 해운대구",
    schoolCount: 1,
    specialSchoolCount: 0,
    specialClassCount: 1,
    supportCenterCount: 0,
    trainingInstitutionCount: 0,
    careerExperienceCenterCount: 0,
    welfareFacilityCount: 0,
    jobPostingCount: 0,
    partialRegionFlag: false,
    meta: { source: "demo:fixture-etl", note: "..." },
  },
];

const SAMPLE_MART_FILE = {
  _meta: {
    source: "real:B-region-summary-mart",
    stage: "mart",
    datasetCategory: "region-summary",
    recordCount: 2,
    issueCount: 0,
    generatedAt: "2026-05-20T00:00:00+09:00",
  },
  records: SAMPLE_MART_RECORDS,
  issues: [],
};

/**
 * URL-aware fetch mock — 각 URL별로 응답 함수를 등록한다.
 * 등록되지 않은 URL은 404 응답.
 */
function urlAwareFetchMock(
  responses: Record<
    string,
    () => Promise<{
      ok: boolean;
      json?: () => Promise<unknown>;
      status?: number;
    }>
  >,
) {
  return vi.fn().mockImplementation((url: string) => {
    const handler = responses[url];
    if (handler) return handler();
    return Promise.resolve({ ok: false, status: 404 });
  });
}

describe("etlAdapter — mart.real region_summary 우선 분기 (11-3 1차-32 신규)", () => {
  it("ETL_REGION_SUMMARY_MART_URL은 /etl-data/B/region_summary.mart.json (1차-32 신규 상수)", () => {
    expect(ETL_REGION_SUMMARY_MART_URL).toBe(
      "/etl-data/B/region_summary.mart.json",
    );
  });

  it("fetchRegions()는 mart.real URL을 먼저 호출한다 (cascade primary)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchRegions();
    expect(fetchSpy).toHaveBeenCalledWith(ETL_REGION_SUMMARY_MART_URL);
  });

  it("mart.real 정상 응답 → schoolCount 보유 RegionSummary[] 반환 (admin URL 미호출)", async () => {
    const fetchSpy = urlAwareFetchMock({
      [ETL_REGION_SUMMARY_MART_URL]: async () => ({
        ok: true,
        json: async () => SAMPLE_MART_FILE,
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await etlAdapter.fetchRegions();
    expect(result.length).toBe(2);
    expect(result.map((r) => r.regionCode).sort()).toEqual(["11680", "26350"]);
    expect(fetchSpy).not.toHaveBeenCalledWith(ETL_REGIONS_URL);
  });

  it("매핑된 RegionSummary는 regionCode / regionCodeType / sidoCode / sigunguCode / regionName 보유", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    expect(gangnam?.regionCodeType).toBe("sigungu");
    expect(gangnam?.sidoCode).toBe("11");
    expect(gangnam?.sigunguCode).toBe("11680");
    expect(gangnam?.regionName).toBe("서울특별시 강남구");
  });

  it("매핑된 RegionSummary는 mart record의 schoolCount를 전파한다 (Block C partial 화면 반영)", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    const haeundae = result.find((r) => r.regionCode === "26350");
    expect(gangnam?.schoolCount).toBe(3);
    expect(haeundae?.schoolCount).toBe(1);
  });

  it("매핑된 RegionSummary는 mart record의 partialRegionFlag를 전파한다", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    expect(gangnam?.partialRegionFlag).toBe(false);
  });

  it("mart.real에 없는 풍부한 도메인 필드(mainIssue / yearlySupport / indicators / population 등)는 undefined", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegions();
    const gangnam = result.find((r) => r.regionCode === "11680");
    expect(gangnam?.population).toBeUndefined();
    expect(gangnam?.mainIssue).toBeUndefined();
    expect(gangnam?.yearlySupport).toBeUndefined();
    expect(gangnam?.indicators).toBeUndefined();
  });
});

describe("etlAdapter — mart.real cascade fallback (11-3 1차-32 신규)", () => {
  it("mart records 빈 배열 → admin_codes fallback (admin URL 호출)", async () => {
    const fetchSpy = urlAwareFetchMock({
      [ETL_REGION_SUMMARY_MART_URL]: async () => ({
        ok: true,
        json: async () => ({ ...SAMPLE_MART_FILE, records: [] }),
      }),
      [ETL_REGIONS_URL]: async () => ({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await etlAdapter.fetchRegions();
    expect(fetchSpy).toHaveBeenCalledWith(ETL_REGIONS_URL);
    // admin_codes 3건이 반환됨
    expect(result.length).toBe(3);
  });

  it("mart.real 404 → admin_codes fallback", async () => {
    const fetchSpy = urlAwareFetchMock({
      [ETL_REGIONS_URL]: async () => ({
        ok: true,
        json: async () => SAMPLE_ADMIN_FILE,
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await etlAdapter.fetchRegions();
    expect(fetchSpy).toHaveBeenCalledWith(ETL_REGIONS_URL);
    expect(result.length).toBe(3); // admin SAMPLE 3건
  });

  it("mart.real network error → admin_codes fallback", async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url === ETL_REGION_SUMMARY_MART_URL) {
        return Promise.reject(new Error("network down"));
      }
      if (url === ETL_REGIONS_URL) {
        return Promise.resolve({
          ok: true,
          json: async () => SAMPLE_ADMIN_FILE,
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await etlAdapter.fetchRegions();
    expect(result.length).toBe(3);
  });

  it("mart.real JSON parse 실패 → admin_codes fallback", async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url === ETL_REGION_SUMMARY_MART_URL) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
        });
      }
      if (url === ETL_REGIONS_URL) {
        return Promise.resolve({
          ok: true,
          json: async () => SAMPLE_ADMIN_FILE,
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await etlAdapter.fetchRegions();
    expect(result.length).toBe(3);
  });

  it("mart.real 실패 + admin_codes 실패 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const mockResult = await mockAdapter.fetchRegions();
    const result = await etlAdapter.fetchRegions();
    expect(result).toEqual(mockResult);
    expect(result.length).toBeGreaterThan(0);
  });

  it("mart.real 실패 + admin_codes network error → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const mockResult = await mockAdapter.fetchRegions();
    const result = await etlAdapter.fetchRegions();
    expect(result).toEqual(mockResult);
  });
});

describe("etlAdapter.fetchRegionByCode — mart.real cascade (11-3 1차-32 신규)", () => {
  it("KOSTAT regionCode 일치 (mart.real) → schoolCount 포함 region 반환", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegionByCode("11680");
    expect(result).toBeDefined();
    expect(result?.regionCode).toBe("11680");
    expect(result?.schoolCount).toBe(3);
  });

  it("mart.real 미일치 + admin_codes 일치 → admin region 반환 (schoolCount 없음)", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
        [ETL_REGIONS_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_ADMIN_FILE,
        }),
      }),
    );
    // mart에는 11680/26350만 있고 admin에는 30110도 있음
    const result = await etlAdapter.fetchRegionByCode("30110");
    expect(result).toBeDefined();
    expect(result?.regionCode).toBe("30110");
    expect(result?.schoolCount).toBeUndefined();
  });

  it("mart.real 미일치 + admin_codes 미일치 → mockAdapter.fetchRegionByCode fallback", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
        [ETL_REGIONS_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_ADMIN_FILE,
        }),
      }),
    );
    const mockResult = await mockAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    const result = await etlAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    expect(result).toEqual(mockResult);
  });

  it("모든 cascade 미일치 (mart/admin records 있으나 매칭 없음 + mock에도 없음) → undefined", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
        [ETL_REGIONS_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_ADMIN_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegionByCode("99999");
    expect(result).toBeUndefined();
  });

  it("DEMO-SIGUNGU-* 호출 시 hardcoded KOSTAT mapping 없이 mock fallback (회귀)", async () => {
    vi.stubGlobal(
      "fetch",
      urlAwareFetchMock({
        [ETL_REGION_SUMMARY_MART_URL]: async () => ({
          ok: true,
          json: async () => SAMPLE_MART_FILE,
        }),
      }),
    );
    const result = await etlAdapter.fetchRegionByCode("DEMO-SIGUNGU-01");
    // 결과 regionCode는 절대 KOSTAT 5자리 숫자 패턴이어선 안 됨
    expect(result?.regionCode).not.toMatch(/^\d{5}$/);
  });
});

describe("etlAdapter — 1차-32 회귀 (1차-21·1차-26·1차-28 contract 유지)", () => {
  it("fetchSchoolsByRegion (1차-26)은 master.real URL을 그대로 호출한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchSchoolsByRegion("11680");
    expect(fetchSpy).toHaveBeenCalledWith(ETL_SCHOOLS_URL);
  });

  it("VITE_DATA_SOURCE 미설정 → mockAdapter (1차-21 기본 동작 회귀)", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "");
    setDataAdapter(null);
    expect(getDataAdapter()).toBe(mockAdapter);
  });
});

// ─── 11-3 1차-40 신규 — indicator.real fetchTransitionIndexByRegion cascade ───
//
// 정책 (사용자 합의값 §1-6):
// - ETL_TRANSITION_INDEX_URL = "/etl-data/B/transition_index.real.json"
// - vite middleware가 `.real.json` 패턴을 `data/indicator.real/`로 라우팅.
// - fetchTransitionIndexByRegion: indicator.real → mockAdapter cascade.
//   indicator.real 정상 + regionCode 일치 → ETL TransitionIndex 반환.
//   404 / network / parse 실패 / records 빈 / regionCode 미일치 → mockAdapter fallback.
// - DEMO-SIGUNGU-* ↔ KOSTAT hardcoded mapping 미도입.
// - 화면 표시 정책 변경 0건 — regionAdapter currentGapIndex 우선순위는 그대로
//   (calculatedTransitionIndex 1순위 유지). 1차-40 단독으로 시연 회귀 0.

// ETL_TRANSITION_INDEX_URL은 etlAdapter에서 export — import 추가
import { ETL_TRANSITION_INDEX_URL } from "../adapters/etlAdapter";
import type { TransitionIndex } from "../../types";

// 1차-38 IndicatorRealOutputFile shape mirror.
const SAMPLE_ETL_TRANSITION_INDEX: TransitionIndex = {
  regionCode: "11680",
  indicators: {
    demandIndex: 42,
    schoolSupportIndex: 30,
    trainingSupplyIndex: 0,
    employmentIndex: 0,
    welfareIndex: 0,
    accessibilityIndex: 0,
    transitionGapIndex: 68,
  },
  normalizedScores: {
    demand: 42,
    schoolSupport: 30,
    trainingSupply: 0,
    employment: 0,
    welfare: 0,
    accessibility: 0,
  },
  indicatorVersion: "mvp-v1",
  calculatedAt: "2026-05-11T00:00:00+09:00",
  baseYear: 2026,
};

const SAMPLE_INDICATOR_REAL_FILE = {
  _meta: {
    source: "real:B-transition-index",
    stage: "indicator",
    indicatorVersion: "mvp-v1",
    recordCount: 1,
    issueCount: 0,
    generatedAt: "2026-05-20T00:00:00+09:00",
    baseYear: 2026,
    calculatedAt: "2026-05-11T00:00:00+09:00",
  },
  records: [SAMPLE_ETL_TRANSITION_INDEX],
  issues: [],
};

describe("etlAdapter — indicator.real fetchTransitionIndexByRegion cascade (11-3 1차-40)", () => {
  it("ETL_TRANSITION_INDEX_URL 상수가 /etl-data/B/transition_index.real.json", () => {
    expect(ETL_TRANSITION_INDEX_URL).toBe(
      "/etl-data/B/transition_index.real.json",
    );
  });

  it("fetchTransitionIndexByRegion이 ETL_TRANSITION_INDEX_URL을 fetch한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_INDICATOR_REAL_FILE,
    });
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchTransitionIndexByRegion("11680");
    expect(fetchSpy).toHaveBeenCalledWith(ETL_TRANSITION_INDEX_URL);
  });

  it("indicator.real 정상 + regionCode 일치 → ETL TransitionIndex 반환", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_INDICATOR_REAL_FILE,
      }),
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion("11680");
    expect(result).toBeDefined();
    expect(result?.regionCode).toBe("11680");
    expect(result?.indicators?.transitionGapIndex).toBe(68);
    expect(result?.indicatorVersion).toBe("mvp-v1");
  });

  it("indicator.real 404 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const mockResult = await mockAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });

  it("indicator.real network error → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );
    const mockResult = await mockAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });

  it("indicator.real JSON parse 실패 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("invalid JSON");
        },
      }),
    );
    const mockResult = await mockAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });

  it("indicator.real records 빈 배열 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _meta: {}, records: [], issues: [] }),
      }),
    );
    const mockResult = await mockAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });

  it("indicator.real 정상 + regionCode 미일치 → mockAdapter fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_INDICATOR_REAL_FILE,
      }),
    );
    const mockResult = await mockAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    expect(result).toEqual(mockResult);
  });

  it("DEMO-SIGUNGU-* 호출 시 KOSTAT hardcoded mapping 없이 mock fallback (회귀)", async () => {
    // indicator.real에는 KOSTAT regionCode("11680" 등)만 있는 시나리오.
    // etlAdapter가 DEMO-SIGUNGU-01로 호출되면 indicator.real에서 미일치 → mock 반환 (mock의
    // DEMO-SIGUNGU-01 demo-v0). KOSTAT regionCode가 DEMO 코드로 응답되는 경로 금지.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_INDICATOR_REAL_FILE,
      }),
    );
    const result = await etlAdapter.fetchTransitionIndexByRegion(
      "DEMO-SIGUNGU-01",
    );
    // mockAdapter는 DEMO-SIGUNGU-01에 대해 demo-v0 TransitionIndex를 반환
    // (indicatorVersion="demo-v0"). KOSTAT 11680의 ETL TransitionIndex가 잘못
    // 반환되면 indicatorVersion이 "mvp-v1"이라 구분 가능.
    expect(result?.regionCode).not.toBe("11680");
    if (result !== undefined) {
      expect(result.indicatorVersion).toBe("demo-v0");
    }
  });
});

// ─── 11-3 1차-40 회귀 — fetchSchoolsByRegion / fetchRegions 영향 없음 ────────
describe("etlAdapter — 1차-40 회귀 (fetchSchoolsByRegion / fetchRegions 무영향)", () => {
  it("fetchSchoolsByRegion (1차-26)은 master.real URL을 계속 호출 (indicator URL 호출 X)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchSpy);
    await etlAdapter.fetchSchoolsByRegion("11680");
    expect(fetchSpy).toHaveBeenCalledWith(ETL_SCHOOLS_URL);
    expect(fetchSpy).not.toHaveBeenCalledWith(ETL_TRANSITION_INDEX_URL);
  });
});
