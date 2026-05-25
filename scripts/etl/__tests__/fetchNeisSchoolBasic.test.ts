/**
 * fetchNeisSchoolBasic.test.ts — 11-3 1차-79 NEIS schoolInfo OpenAPI live fetch scaffold RED 테스트.
 *
 * **본 테스트의 핵심 정책 (CLAUDE.md §10 / §17.32 일관)**:
 * - **실제 NEIS endpoint 호출 0건** — 모든 fetch는 dependency-injection으로 mock 주입.
 * - API key 0건 — 테스트는 mock key 문자열("MOCK-KEY-FOR-TEST")로 통과.
 * - console.log / throw / error message / URL 출력에 key 값 노출 0건 (회귀 보호).
 * - 실제 파일 write 0건 — saveNeisSchoolInfoRaw도 dependency-injection으로 mock write.
 * - `data/raw.api/` 디렉터리 생성 0건.
 *
 * **검증 범위 (1차-79 §3)**:
 * - `buildNeisSchoolInfoUrl({ apiKey, page, size })` — URL 구성. KEY는 raw에 포함, 로그용 마스킹은 별도.
 * - `maskNeisUrlKey(url)` — URL의 KEY=value를 KEY=***로 치환 (key 출력 안전 helper).
 * - `fetchNeisSchoolBasicRaw({ apiKey, page, size, fetchImpl })` — mock fetch로 호출, raw JSON 반환.
 * - HTTP error / network error → key/raw 본문 미노출 한국어 에러 throw.
 * - `computeNeisRawOutputPath({ page, today, baseDir? })` — `data/raw.api/B/neis/<YYYYMMDD>-page<page>.json`.
 * - `saveNeisSchoolInfoRaw({ raw, outputPath, writeImpl })` — write 함수 호출만 (실제 fs.write 안 함).
 * - `runNeisFetch({ apiKey, page, size, today, dryRun?, fetchImpl?, writeImpl? })` — 통합 entry.
 * - `--dry-run` 모드에서는 fetch / write 모두 skip — URL 마스킹과 path 계산만 수행.
 */

import { describe, expect, it, vi } from "vitest";
import {
  buildNeisSchoolInfoUrl,
  maskNeisUrlKey,
  fetchNeisSchoolBasicRaw,
  computeNeisRawOutputPath,
  saveNeisSchoolInfoRaw,
  runNeisFetch,
} from "../ingest/fetchNeisSchoolBasic";
import { ingestNeisSchoolBasic } from "../ingest/ingestNeisSchoolBasic";

const MOCK_KEY = "MOCK-KEY-FOR-TEST";
const TODAY = "20260522";

// ─── 유틸 — mock NEIS response ────────────────────────────────────────────
function buildMockNeisResponseText(rows: Record<string, unknown>[]): string {
  return JSON.stringify({
    schoolInfo: [
      {
        head: [
          { list_total_count: rows.length },
          { RESULT: { CODE: "INFO-000", MESSAGE: "정상 처리되었습니다." } },
        ],
      },
      { row: rows },
    ],
  });
}

function buildMockNeisRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    ATPT_OFCDC_SC_CODE: "B10",
    SD_SCHUL_CODE: "7000001",
    SCHUL_NM: "(시연용) NEIS-A 초등학교",
    SCHUL_KND_SC_NM: "초등학교",
    FOND_SC_NM: "공립",
    LCTN_SC_NM: "서울특별시",
    ORG_RDNMA: "(시연용) 서울특별시 시연구 시연로 1",
    ...overrides,
  };
}

// ─── buildNeisSchoolInfoUrl ───────────────────────────────────────────────
describe("buildNeisSchoolInfoUrl (1차-79)", () => {
  it("NEIS open.neis.go.kr/hub/schoolInfo endpoint를 사용", () => {
    const url = buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 1, size: 100 });
    expect(url).toMatch(/^https:\/\/open\.neis\.go\.kr\/hub\/schoolInfo/);
  });

  it("Type=json + KEY + pIndex + pSize 모두 포함", () => {
    const url = buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 3, size: 50 });
    expect(url).toContain("Type=json");
    expect(url).toContain(`KEY=${MOCK_KEY}`);
    expect(url).toContain("pIndex=3");
    expect(url).toContain("pSize=50");
  });

  it("apiKey가 빈 문자열이면 한국어 에러 throw (key 값 미노출)", () => {
    expect(() =>
      buildNeisSchoolInfoUrl({ apiKey: "", page: 1, size: 100 }),
    ).toThrow(/ETL_API_KEY_NEIS/);
  });

  it("page가 1 미만이면 한국어 에러 throw", () => {
    expect(() =>
      buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 0, size: 100 }),
    ).toThrow(/page/);
  });

  it("size가 1~1000 범위 밖이면 한국어 에러 throw", () => {
    expect(() =>
      buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 1, size: 0 }),
    ).toThrow(/size/);
    expect(() =>
      buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 1, size: 1001 }),
    ).toThrow(/size/);
  });
});

// ─── maskNeisUrlKey ───────────────────────────────────────────────────────
describe("maskNeisUrlKey (1차-79 — key 비노출 안전 helper)", () => {
  it("KEY=value를 KEY=***로 치환", () => {
    const url = buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 1, size: 100 });
    const masked = maskNeisUrlKey(url);
    expect(masked).not.toContain(MOCK_KEY);
    expect(masked).toContain("KEY=***");
  });

  it("KEY 외 다른 query parameter는 보존", () => {
    const url = buildNeisSchoolInfoUrl({ apiKey: MOCK_KEY, page: 5, size: 20 });
    const masked = maskNeisUrlKey(url);
    expect(masked).toContain("Type=json");
    expect(masked).toContain("pIndex=5");
    expect(masked).toContain("pSize=20");
  });

  it("KEY가 없는 URL도 안전하게 처리 (변경 0)", () => {
    const url = "https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1";
    const masked = maskNeisUrlKey(url);
    expect(masked).toBe(url);
  });
});

// ─── fetchNeisSchoolBasicRaw ──────────────────────────────────────────────
describe("fetchNeisSchoolBasicRaw — mock fetch (1차-79)", () => {
  it("mock fetch가 호출되고 raw text를 반환", async () => {
    const mockResponseText = buildMockNeisResponseText([buildMockNeisRow()]);
    const fetchImpl = vi.fn(async () =>
      new Response(mockResponseText, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const raw = await fetchNeisSchoolBasicRaw({
      apiKey: MOCK_KEY,
      page: 1,
      size: 100,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(raw).toBe(mockResponseText);
  });

  it("fetch URL에 NEIS endpoint + 인자 포함", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(buildMockNeisResponseText([]), { status: 200 }),
    );

    await fetchNeisSchoolBasicRaw({
      apiKey: MOCK_KEY,
      page: 2,
      size: 50,
      fetchImpl,
    });

    const calledUrl = fetchImpl.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("open.neis.go.kr/hub/schoolInfo");
    expect(calledUrl).toContain("pIndex=2");
    expect(calledUrl).toContain("pSize=50");
  });

  it("HTTP 4xx 에러 시 한국어 메시지 throw, key/raw body 미노출", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(`error body with ${MOCK_KEY}`, { status: 401 }),
    );

    try {
      await fetchNeisSchoolBasicRaw({
        apiKey: MOCK_KEY,
        page: 1,
        size: 100,
        fetchImpl,
      });
      expect.fail("expected to throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).not.toContain(MOCK_KEY);
      expect(msg).not.toContain("error body");
      expect(msg).toMatch(/NEIS|HTTP|401|인증/);
    }
  });

  it("HTTP 5xx 에러 시 한국어 메시지 throw, key 미노출", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("server crashed", { status: 500 }),
    );

    try {
      await fetchNeisSchoolBasicRaw({
        apiKey: MOCK_KEY,
        page: 1,
        size: 100,
        fetchImpl,
      });
      expect.fail("expected to throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).not.toContain(MOCK_KEY);
      expect(msg).not.toContain("server crashed");
      expect(msg).toMatch(/NEIS|HTTP|500|서버/);
    }
  });

  it("network error 시 한국어 메시지 throw, key 미노출", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(`network failure containing ${MOCK_KEY}`);
    });

    try {
      await fetchNeisSchoolBasicRaw({
        apiKey: MOCK_KEY,
        page: 1,
        size: 100,
        fetchImpl,
      });
      expect.fail("expected to throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).not.toContain(MOCK_KEY);
      expect(msg).toMatch(/NEIS|네트워크/);
    }
  });

  it("fetched raw가 ingestNeisSchoolBasic parser와 호환", async () => {
    const mockResponseText = buildMockNeisResponseText([
      buildMockNeisRow({ SD_SCHUL_CODE: "7000123", SCHUL_NM: "(시연용) NEIS-B" }),
    ]);
    const fetchImpl = vi.fn(async () =>
      new Response(mockResponseText, { status: 200 }),
    );

    const raw = await fetchNeisSchoolBasicRaw({
      apiKey: MOCK_KEY,
      page: 1,
      size: 100,
      fetchImpl,
    });

    const parsed = ingestNeisSchoolBasic({
      text: raw,
      source: "real:neis-openapi-school-basic",
      collectedAt: "2026-05-22T00:00:00+09:00",
    });

    expect(parsed.schoolRecords.length).toBe(1);
    expect(parsed.schoolRecords[0]?.schoolId).toBe("school:neis:7000123");
    expect(parsed.meta.license).toBe("unknown");
  });
});

// ─── computeNeisRawOutputPath ─────────────────────────────────────────────
describe("computeNeisRawOutputPath (1차-79)", () => {
  it("data/raw.api/B/neis/<YYYYMMDD>-page<page>.json 형식", () => {
    const path = computeNeisRawOutputPath({ page: 1, today: TODAY });
    expect(path.replace(/\\/g, "/")).toBe(
      "data/raw.api/B/neis/20260522-page1.json",
    );
  });

  it("page 번호 그대로 반영", () => {
    const path = computeNeisRawOutputPath({ page: 42, today: TODAY });
    expect(path).toMatch(/page42\.json$/);
  });

  it("baseDir override 지원 (테스트 임시 디렉터리 등)", () => {
    const path = computeNeisRawOutputPath({
      page: 1,
      today: TODAY,
      baseDir: "/tmp/test-raw",
    });
    expect(path.replace(/\\/g, "/")).toBe(
      "/tmp/test-raw/B/neis/20260522-page1.json",
    );
  });

  it("today format이 YYYYMMDD 아니면 한국어 에러 throw", () => {
    expect(() =>
      computeNeisRawOutputPath({ page: 1, today: "2026-05-22" }),
    ).toThrow(/YYYYMMDD/);
  });
});

// ─── saveNeisSchoolInfoRaw ────────────────────────────────────────────────
describe("saveNeisSchoolInfoRaw — mock write (1차-79)", () => {
  it("writeImpl이 outputPath와 raw로 호출됨", async () => {
    const writeImpl = vi.fn(async () => undefined);
    await saveNeisSchoolInfoRaw({
      raw: "{}",
      outputPath: "/tmp/test/sample.json",
      writeImpl,
    });
    expect(writeImpl).toHaveBeenCalledTimes(1);
    const [calledPath, calledRaw] = writeImpl.mock.calls[0] ?? [];
    expect(calledPath).toBe("/tmp/test/sample.json");
    expect(calledRaw).toBe("{}");
  });

  it("writeImpl이 에러 throw하면 한국어 메시지로 wrap", async () => {
    const writeImpl = vi.fn(async () => {
      throw new Error("EACCES");
    });
    try {
      await saveNeisSchoolInfoRaw({
        raw: "{}",
        outputPath: "/forbidden/sample.json",
        writeImpl,
      });
      expect.fail("expected to throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/raw 저장|파일/);
    }
  });
});

// ─── runNeisFetch (통합 entry) ────────────────────────────────────────────
describe("runNeisFetch (1차-79 통합 entry, mock injection)", () => {
  it("dry-run mode에서는 fetch / write 모두 호출되지 않고 maskedUrl + outputPath 반환", async () => {
    const fetchImpl = vi.fn();
    const writeImpl = vi.fn();
    const result = await runNeisFetch({
      apiKey: MOCK_KEY,
      page: 1,
      size: 100,
      today: TODAY,
      dryRun: true,
      fetchImpl,
      writeImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(writeImpl).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.maskedUrl).not.toContain(MOCK_KEY);
    expect(result.maskedUrl).toContain("KEY=***");
    expect(result.outputPath.replace(/\\/g, "/")).toBe(
      "data/raw.api/B/neis/20260522-page1.json",
    );
  });

  it("정상 모드에서 fetch + write 호출 후 결과 반환", async () => {
    const mockResponseText = buildMockNeisResponseText([buildMockNeisRow()]);
    const fetchImpl = vi.fn(async () =>
      new Response(mockResponseText, { status: 200 }),
    );
    const writeImpl = vi.fn(async () => undefined);

    const result = await runNeisFetch({
      apiKey: MOCK_KEY,
      page: 1,
      size: 100,
      today: TODAY,
      dryRun: false,
      fetchImpl,
      writeImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(writeImpl).toHaveBeenCalledTimes(1);
    expect(result.dryRun).toBe(false);
    expect(result.maskedUrl).not.toContain(MOCK_KEY);
    expect(result.recordCount).toBe(1);
    expect(result.apiResultCode).toBe("INFO-000");
    expect(result.outputPath.replace(/\\/g, "/")).toBe(
      "data/raw.api/B/neis/20260522-page1.json",
    );
  });

  it("apiKey가 빈 문자열이면 한국어 에러 throw (안내문)", async () => {
    try {
      await runNeisFetch({
        apiKey: "",
        page: 1,
        size: 100,
        today: TODAY,
        dryRun: true,
        fetchImpl: vi.fn(),
        writeImpl: vi.fn(),
      });
      expect.fail("expected to throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/ETL_API_KEY_NEIS|\.env\.local/);
      expect(msg).not.toContain(MOCK_KEY);
    }
  });

  it("fetch 결과가 parser와 호환되는 raw text 반환 후 저장", async () => {
    const mockResponseText = buildMockNeisResponseText([
      buildMockNeisRow({ SD_SCHUL_CODE: "7000999", SCHUL_NM: "(시연용) NEIS-Z" }),
      buildMockNeisRow({ SD_SCHUL_CODE: "7001000", SCHUL_NM: "(시연용) NEIS-Y" }),
    ]);
    const fetchImpl = vi.fn(async () =>
      new Response(mockResponseText, { status: 200 }),
    );
    let savedRaw = "";
    const writeImpl = vi.fn(async (_path: string, raw: string) => {
      savedRaw = raw;
    });

    const result = await runNeisFetch({
      apiKey: MOCK_KEY,
      page: 1,
      size: 100,
      today: TODAY,
      dryRun: false,
      fetchImpl,
      writeImpl,
    });

    expect(result.recordCount).toBe(2);

    // 저장된 raw가 parser와 호환되는지 확인
    const parsed = ingestNeisSchoolBasic({
      text: savedRaw,
      source: "real:neis-openapi-school-basic",
      collectedAt: "2026-05-22T00:00:00+09:00",
    });
    expect(parsed.schoolRecords.map((r) => r.schoolId)).toEqual([
      "school:neis:7000999",
      "school:neis:7001000",
    ]);
  });
});

// ─── 외부 의존성·키 노출 회귀 보호 ────────────────────────────────────────
describe("fetchNeisSchoolBasic — 키 노출 회귀 보호 (1차-79)", () => {
  it("module export 표면에 key를 출력할 가능성이 있는 logger 이름 미등장", async () => {
    const mod = await import("../ingest/fetchNeisSchoolBasic");
    const exportNames = Object.keys(mod);
    // log / print / dump 패턴이 key를 흘릴 가능성 있는 helper로 export되지 않는지 회귀 보호.
    const loggerNames = exportNames.filter((name) =>
      /(printKey|dumpKey|logApiKey|logKey|debugKey)/i.test(name),
    );
    expect(loggerNames).toEqual([]);
  });

  it("module은 default key를 노출하지 않음 (constant export 0건)", async () => {
    const mod = (await import("../ingest/fetchNeisSchoolBasic")) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(mod)) {
      const value = mod[key];
      if (typeof value === "string") {
        // 32자 이상 영숫자 문자열은 API key로 의심 — export 0건이어야 함
        expect(/^[A-Za-z0-9]{32,}$/.test(value)).toBe(false);
      }
    }
  });
});
