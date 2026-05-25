/**
 * ingestNeisSchoolBasic.test.ts — 11-3 1차-75 NEIS schoolInfo OpenAPI ingest scaffold RED 테스트.
 *
 * **본 테스트의 핵심 정책 (CLAUDE.md §10 / §17 일관)**:
 * - 실제 NEIS OpenAPI endpoint 호출 0건 — inline JSON 문자열만 입력.
 * - API key 0건 — parser 테스트는 key 없이 통과해야 함.
 * - fetch / axios / http import 0건 — parser는 pure function.
 * - 학교 단위 데이터라 PII 위험 낮음 (NEIS schoolInfo 응답에 학생/보호자 정보 없음).
 *
 * **scaffold 단계 (1차-75)**:
 * - parser/normalizer 순수 함수만 추가.
 * - URL builder / fetch helper / CLI 분기는 본 단계에서 도입 0건 — 후속 사용자
 *   manual 단계에서만 합의.
 * - NEIS schoolInfo wrapper(`{ schoolInfo: [head, body] }`) + 단순 row array 둘 다
 *   안전하게 처리.
 * - error 응답 (`RESULT.CODE` != "INFO-000") → empty records + info issue.
 *
 * **매핑 정책** (NEIS schoolInfo → IngestedSchoolRecord):
 * - SD_SCHUL_CODE → neisSchoolCode + `schoolId = "school:neis:${SD_SCHUL_CODE}"`
 * - SCHUL_NM → schoolName
 * - SCHUL_KND_SC_NM → schoolLevel (한글 그대로 — cleanSchools 1차-7 한글 매핑이 영문 canonical 변환)
 * - FOND_SC_NM → establishmentType (한글 그대로 — cleanSchools 1차-7 매핑)
 * - ORG_RDNMA → address
 * - LCTN_SC_NM → sidoName
 * - schoolType / sigunguName / latitude / longitude → null (NEIS schoolInfo 응답에 부재, master.real G lookup으로 보류)
 *
 * **license 정책 (ingestSchools 1차-2 동형)**:
 * - source `"real:..."` → `"unknown"`
 * - 그 외 (`"fixture:..."` 등) → `"demo-only"`
 */

import { describe, expect, it } from "vitest";
import { ingestNeisSchoolBasic } from "../ingest/ingestNeisSchoolBasic";

const COLLECTED_AT = "2026-05-22T00:00:00+09:00";

/**
 * NEIS schoolInfo OpenAPI 응답 wrapper 형태 mock fixture.
 * 실제 NEIS API 응답 구조를 흉내내되 실 데이터는 사용하지 않음 — 가공된 학교명/코드.
 */
function buildMockNeisSchoolInfoResponse(rows: Record<string, unknown>[]): string {
  return JSON.stringify({
    schoolInfo: [
      {
        head: [
          { list_total_count: rows.length },
          {
            RESULT: {
              CODE: "INFO-000",
              MESSAGE: "정상 처리되었습니다.",
            },
          },
        ],
      },
      { row: rows },
    ],
  });
}

function buildMockNeisRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    ATPT_OFCDC_SC_CODE: "B10",
    ATPT_OFCDC_SC_NM: "(시연용) 시도교육청 A",
    SD_SCHUL_CODE: "7000001",
    SCHUL_NM: "(시연용) NEIS-A 초등학교",
    ENG_SCHUL_NM: "Demo NEIS-A Elementary School",
    SCHUL_KND_SC_NM: "초등학교",
    LCTN_SC_NM: "서울특별시",
    JU_ORG_NM: "(시연용) 시도교육청 A",
    FOND_SC_NM: "공립",
    ORG_RDNZC: "04519",
    ORG_RDNMA: "(시연용) 서울특별시 시연구 시연로 1",
    ORG_RDNDA: "(시연용 동 안내)",
    LOAD_CHECK_DAY: "20260101",
    ...overrides,
  };
}

describe("ingestNeisSchoolBasic — 정상 응답 wrapper 처리 (1차-75)", () => {
  it("schoolInfo wrapper의 row 배열을 IngestedSchoolRecord로 매핑", () => {
    const text = buildMockNeisSchoolInfoResponse([buildMockNeisRow()]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords.length).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it("schoolId가 `school:neis:${SD_SCHUL_CODE}` 패턴", () => {
    const text = buildMockNeisSchoolInfoResponse([
      buildMockNeisRow({ SD_SCHUL_CODE: "7011569" }),
    ]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords[0]?.schoolId).toBe("school:neis:7011569");
    expect(result.schoolRecords[0]?.neisSchoolCode).toBe("7011569");
  });

  it("schoolName / schoolLevel / establishmentType / address / sidoName 한글 그대로 매핑 (cleanSchools 한글 매핑이 정규화)", () => {
    const text = buildMockNeisSchoolInfoResponse([
      buildMockNeisRow({
        SCHUL_NM: "(시연용) NEIS-B 중학교",
        SCHUL_KND_SC_NM: "중학교",
        FOND_SC_NM: "사립",
        ORG_RDNMA: "(시연용) 부산광역시 시연구 시연로 22",
        LCTN_SC_NM: "부산광역시",
      }),
    ]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    const r = result.schoolRecords[0];
    expect(r?.schoolName).toBe("(시연용) NEIS-B 중학교");
    expect(r?.schoolLevel).toBe("중학교");
    expect(r?.establishmentType).toBe("사립");
    expect(r?.address).toBe("(시연용) 부산광역시 시연구 시연로 22");
    expect(r?.sidoName).toBe("부산광역시");
  });

  it("schoolType / sigunguName / latitude / longitude는 null (NEIS schoolInfo 응답에 부재)", () => {
    const text = buildMockNeisSchoolInfoResponse([buildMockNeisRow()]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    const r = result.schoolRecords[0];
    expect(r?.schoolType).toBeNull();
    expect(r?.sigunguName).toBeNull();
    expect(r?.latitude).toBeNull();
    expect(r?.longitude).toBeNull();
  });

  it("다수 row 매핑 시 입력 순서 유지", () => {
    const text = buildMockNeisSchoolInfoResponse([
      buildMockNeisRow({ SD_SCHUL_CODE: "7000001", SCHUL_NM: "(시연용) NEIS-A" }),
      buildMockNeisRow({ SD_SCHUL_CODE: "7000002", SCHUL_NM: "(시연용) NEIS-B" }),
      buildMockNeisRow({ SD_SCHUL_CODE: "7000003", SCHUL_NM: "(시연용) NEIS-C" }),
    ]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords.map((r) => r.schoolName)).toEqual([
      "(시연용) NEIS-A",
      "(시연용) NEIS-B",
      "(시연용) NEIS-C",
    ]);
  });
});

describe("ingestNeisSchoolBasic — 빈/에러 응답 (1차-75)", () => {
  it("schoolInfo wrapper의 row 배열이 빈 경우 빈 결과", () => {
    const text = buildMockNeisSchoolInfoResponse([]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords).toEqual([]);
  });

  it("RESULT.CODE가 'INFO-200' (해당 데이터 없음)이면 빈 결과 + info issue", () => {
    const text = JSON.stringify({
      RESULT: {
        CODE: "INFO-200",
        MESSAGE: "해당하는 데이터가 없습니다.",
      },
    });
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords).toEqual([]);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    expect(result.issues[0]?.severity).toBe("info");
  });

  it("RESULT.CODE가 다른 error code (예: 'ERROR-300')면 빈 결과 + warning issue", () => {
    const text = JSON.stringify({
      RESULT: {
        CODE: "ERROR-300",
        MESSAGE: "요청 변수의 값이 잘못되었습니다.",
      },
    });
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords).toEqual([]);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    expect(result.issues[0]?.severity).toBe("warning");
  });

  it("최상위가 빈 객체 {}면 빈 결과", () => {
    const result = ingestNeisSchoolBasic({
      text: "{}",
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.schoolRecords).toEqual([]);
  });

  it("JSON parse 실패 시 한국어 에러로 throw", () => {
    expect(() =>
      ingestNeisSchoolBasic({
        text: "this is not json",
        source: "fixture:B-neis-school-basic",
        collectedAt: COLLECTED_AT,
      }),
    ).toThrow(/JSON|json/);
  });
});

describe("ingestNeisSchoolBasic — license / source 정책 (1차-2 동형, 1차-75)", () => {
  it("source 'real:neis-openapi-school-basic' → license 'unknown'", () => {
    const text = buildMockNeisSchoolInfoResponse([buildMockNeisRow()]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "real:neis-openapi-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.meta.license).toBe("unknown");
    expect(result.meta.source).toBe("real:neis-openapi-school-basic");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
  });

  it("source 'fixture:B-neis-school-basic' → license 'demo-only'", () => {
    const text = buildMockNeisSchoolInfoResponse([buildMockNeisRow()]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    expect(result.meta.license).toBe("demo-only");
  });
});

describe("ingestNeisSchoolBasic — PII 차단 회귀 보호 (1차-75)", () => {
  it("입력 raw에 가상의 PII 필드(STDNT_NM / GRDR_NM / PHONE_NMBR 등)가 있어도 IngestedSchoolRecord slot 부재로 자동 누락", () => {
    // NEIS schoolInfo 응답에는 학생/보호자 PII 부재. 만약 다른 NEIS endpoint(학생 정보 등)
    // 응답을 잘못 ingest해도 IngestedSchoolRecord slot이 없어 자동 차단되는지 회귀 보호.
    const text = buildMockNeisSchoolInfoResponse([
      buildMockNeisRow({
        STDNT_NM: "(가상 PII) 홍길동",
        GRDR_NM: "(가상 PII) 보호자",
        PHONE_NMBR: "010-0000-0000",
        EMAIL_ADDR: "demo@example.com",
        BIRTHDAY: "20100101",
        DSBLT_TYPE: "(가상 PII)",
      }),
    ]);
    const result = ingestNeisSchoolBasic({
      text,
      source: "fixture:B-neis-school-basic",
      collectedAt: COLLECTED_AT,
    });

    const r = result.schoolRecords[0];
    // IngestedSchoolRecord 정의된 11개 슬롯만 노출
    const allowedKeys = new Set([
      "schoolId",
      "neisSchoolCode",
      "schoolName",
      "schoolLevel",
      "schoolType",
      "establishmentType",
      "address",
      "sidoName",
      "sigunguName",
      "latitude",
      "longitude",
    ]);
    for (const key of Object.keys(r ?? {})) {
      expect(
        allowedKeys.has(key),
        `unexpected key ${key} — PII 또는 비허용 필드 자동 누락 정책 위반`,
      ).toBe(true);
    }
  });
});

describe("ingestNeisSchoolBasic — 외부 의존성 부재 회귀 보호 (1차-75)", () => {
  it("module export 표면에 fetch / URL builder / live API helper가 등장하지 않음", async () => {
    const mod = await import("../ingest/ingestNeisSchoolBasic");
    const exportNames = Object.keys(mod);
    // 본 1차-75 scaffold는 parser-only. live fetch helper / URL builder는 미도입.
    const liveApiNames = exportNames.filter((name) =>
      /(fetchNeis|callNeis|buildNeisUrl|requestNeis|httpNeis|liveNeis)/i.test(name),
    );
    expect(liveApiNames).toEqual([]);
  });

  it("ingestNeisSchoolBasic은 단일 input 인자 받는 함수", () => {
    expect(typeof ingestNeisSchoolBasic).toBe("function");
    expect(ingestNeisSchoolBasic.length).toBe(1);
  });
});
