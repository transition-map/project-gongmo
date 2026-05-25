/**
 * cleanSchools.test.ts — 11-3 1차-1 B 학교 기본 정보 clean RED 테스트.
 *
 * 본 RED 단계 정책:
 * - production module(`scripts/etl/clean/cleanSchools.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 *
 * 1차-1 clean 책임 (stub 수준):
 * - **Pure function** — 입력 array 변형 0건, 입력 record 객체 무수정.
 * - 1차-1 stub은 입력 schoolRecords를 그대로 records로 반환 (pass-through).
 * - issues는 0건 (실제 정규화·dedup·범위 검증은 1차-2~3).
 * - meta는 ingest meta를 상속 (source / sourcePolicyStatus / license / collectedAt 보존),
 *   cleanedRecordCount만 records.length로 재계산.
 *
 * 1차-2 이후 본구현 예정 책임 (이번 RED 단계에서는 검증 X):
 * - schoolName / address / sidoName / sigunguName trim·whitespace 정리
 * - schoolId 중복 dedup + warning issue
 * - schoolLevel enum 검증 + 미정의 값 "other" fallback
 * - 좌표 범위 검증 (lat 33~39, lng 124~132)
 *
 * G lookup (regionCode/legalDongCode/hjdCode 매핑)은 master.real 단계로 보류
 * (1차-1 단계에서는 address/sidoName/sigunguName 보존까지만).
 */

import { describe, expect, it } from "vitest";
import { cleanSchools } from "../clean/cleanSchools";
import type { IngestedSchoolRecord } from "../ingest/ingestSchools";

const COLLECTED_AT = "2026-05-16T00:00:00+09:00";

function buildSampleRecords(): IngestedSchoolRecord[] {
  return [
    {
      schoolId: "school:demo:seoul-elem-a",
      neisSchoolCode: "B000000001",
      schoolName: "서울시연초등학교 A",
      schoolLevel: "elementary",
      schoolType: "general",
      establishmentType: "public",
      address: "서울특별시 시연구 시연동 123",
      sidoName: "서울특별시",
      sigunguName: "시연구",
      latitude: 37.5665,
      longitude: 126.978,
    },
    {
      schoolId: "school:demo:busan-mid-b",
      neisSchoolCode: "B000000002",
      schoolName: "부산시연중학교 B",
      schoolLevel: "middle",
      schoolType: "general",
      establishmentType: "public",
      address: "부산광역시 시연구 시연동 456",
      sidoName: "부산광역시",
      sigunguName: "시연구",
      latitude: 35.1796,
      longitude: 129.0756,
    },
  ];
}

function buildIngestMeta() {
  return {
    source: "fixture:B-schools" as const,
    sourcePolicyStatus: "pending-real-source-review" as const,
    license: "demo-only" as const,
    collectedAt: COLLECTED_AT,
    schoolRecordCount: 2,
    issueCount: 0,
  };
}

describe("cleanSchools (11-3 1차-1)", () => {
  // 11-3 1차-3 의미 갱신 — 1차-1·1차-2는 pass-through stub이라 records[i] 참조 동일성
  // 검증이 의미 있었지만, 1차-3부터는 cleanSchools가 trim/dedup/enum/좌표 fallback으로
  // 출력 record 객체를 새로 생성한다. 따라서 본 케이스의 의미를 "입력 array length +
  // 입력 객체 snapshot 무수정"으로 축소·갱신한다. 출력 records의 참조 검증은 제거.
  // (출력 records의 길이·필드 보존 검증은 별도 케이스들이 담당.)
  it("cleanSchools - 입력 records 변형 0건 (pure function): 입력 array length·snapshot 무변", () => {
    const input = buildSampleRecords();
    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const inputLengthBefore = input.length;
    const ref0 = input[0];
    const ref1 = input[1];

    cleanSchools({
      schoolRecords: input,
      meta: buildIngestMeta(),
    });

    // 입력 array 자체는 변형 0건 (length·참조·내용 모두 보존)
    expect(input.length).toBe(inputLengthBefore);
    expect(input[0]).toBe(ref0);
    expect(input[1]).toBe(ref1);
    expect(input).toEqual(inputSnapshot);
  });

  it("cleanSchools - 1차-1 stub은 schoolRecords를 그대로 records로 반환, issues 0건, meta.cleanedRecordCount === input.length", () => {
    const input = buildSampleRecords();

    const result = cleanSchools({
      schoolRecords: input,
      meta: buildIngestMeta(),
    });

    expect(result.records.length).toBe(input.length);
    expect(result.records).toEqual(input);
    expect(result.issues).toEqual([]);
    expect(result.meta.cleanedRecordCount).toBe(input.length);
  });

  it("cleanSchools - meta.source / sourcePolicyStatus / license는 ingest meta로부터 상속됨", () => {
    const input = buildSampleRecords();
    const ingestMeta = buildIngestMeta();

    const result = cleanSchools({
      schoolRecords: input,
      meta: ingestMeta,
    });

    expect(result.meta.source).toBe(ingestMeta.source);
    expect(result.meta.sourcePolicyStatus).toBe(ingestMeta.sourcePolicyStatus);
    expect(result.meta.license).toBe(ingestMeta.license);
    expect(result.meta.collectedAt).toBe(ingestMeta.collectedAt);
  });

  // ─── 11-3 1차-2 신규 — license "unknown" 상속 정책 ────────────────────────
  // 정책 (사용자 합의값 §1-3):
  //   - cleanSchools는 input.meta.license를 임의로 변경하지 않고 그대로 상속한다.
  //   - real source(`real:schools-json` 등)의 license="unknown"이 cleanSchools 결과
  //     meta에서도 "unknown"으로 보존되어야 한다 (GREEN 단계에서 license union 확장 시
  //     cleanSchools가 우연히 "demo-only"로 되돌리지 않는지 검증).
  //   - 본 케이스는 license type union이 `"unknown" | "demo-only"`로 확장된 후에도
  //     contract가 유지되는지 보장하는 regression guard.
  it("cleanSchools - input.meta.license가 \"unknown\"이면 결과 meta.license도 \"unknown\"으로 상속됨", () => {
    const input = buildSampleRecords();
    const ingestMetaWithUnknown = {
      source: "real:schools-json",
      sourcePolicyStatus: "pending-real-source-review",
      license: "unknown",
      collectedAt: COLLECTED_AT,
      schoolRecordCount: input.length,
      issueCount: 0,
    } as unknown as Parameters<typeof cleanSchools>[0]["meta"];

    const result = cleanSchools({
      schoolRecords: input,
      meta: ingestMetaWithUnknown,
    });

    expect(result.meta.license).toBe("unknown");
    expect(result.meta.source).toBe("real:schools-json");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
  });
});

// ─── 11-3 1차-3 신규 — trim / 필수 / dedup / enum / 좌표 범위 검증 ────────────
//
// 정책 (사용자 합의값 §1-3, 1차-3 합의 §1-12):
//   - Hard drop: schoolId 누락/빈 / schoolId 중복 2회차+. warning issue + records 제외.
//   - Soft preserve: schoolName 빈 / enum 위반 / 좌표 범위 위반. warning issue + fallback 적용.
//   - trim: schoolName/address/sidoName/sigunguName에 trim() + 내부 다중 공백 collapse. silent.
//   - enum case-sensitive (strict). case 정규화는 1차-4+.
//   - 좌표: lat ∈ [33,39] && lng ∈ [124,132], pair-level (한쪽만 null 또는 범위 외 → 둘 다 null).
//   - issue field 직접명 (`schoolId` / `duplicate` / `schoolName` / `schoolLevel` /
//     `schoolType` / `establishmentType` / `coordinate`). datasetCategory: "B".
//   - mini fixture 3건은 모두 valid → 0 issues / 3 records 유지.

function buildRecord(
  overrides: Partial<IngestedSchoolRecord> = {},
): IngestedSchoolRecord {
  return {
    schoolId: "school:demo:test-001",
    neisSchoolCode: null,
    schoolName: "테스트학교",
    schoolLevel: "elementary",
    schoolType: null,
    establishmentType: null,
    address: null,
    sidoName: null,
    sigunguName: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function buildMeta(
  overrides: { schoolRecordCount?: number; source?: string; license?: string } = {},
): Parameters<typeof cleanSchools>[0]["meta"] {
  return {
    source: overrides.source ?? "fixture:B-schools",
    sourcePolicyStatus: "pending-real-source-review",
    license: overrides.license ?? "demo-only",
    collectedAt: COLLECTED_AT,
    schoolRecordCount: overrides.schoolRecordCount ?? 0,
    issueCount: 0,
  } as unknown as Parameters<typeof cleanSchools>[0]["meta"];
}

function buildMiniFixtureRecords(): IngestedSchoolRecord[] {
  return [
    {
      schoolId: "school:demo:seoul-elem-a",
      neisSchoolCode: "B000000001",
      schoolName: "서울시연초등학교 A",
      schoolLevel: "elementary",
      schoolType: "general",
      establishmentType: "public",
      address: "서울특별시 시연구 시연동 123",
      sidoName: "서울특별시",
      sigunguName: "시연구",
      latitude: 37.5665,
      longitude: 126.978,
    },
    {
      schoolId: "school:demo:busan-mid-b",
      neisSchoolCode: "B000000002",
      schoolName: "부산시연중학교 B",
      schoolLevel: "middle",
      schoolType: "general",
      establishmentType: "public",
      address: "부산광역시 시연구 시연동 456",
      sidoName: "부산광역시",
      sigunguName: "시연구",
      latitude: 35.1796,
      longitude: 129.0756,
    },
    {
      schoolId: "school:demo:daejeon-special-c",
      neisSchoolCode: "B000000003",
      schoolName: "대전시연특수학교 C",
      schoolLevel: "special",
      schoolType: "special",
      establishmentType: "public",
      address: "대전광역시 시연구 시연동 789",
      sidoName: "대전광역시",
      sigunguName: "시연구",
      latitude: null,
      longitude: null,
    },
  ];
}

describe("cleanSchools (11-3 1차-3 정규화·검증)", () => {
  // ─── trim 정규화 (silent) ──────────────────────────────────────────────────
  it("cleanSchools - schoolName 앞뒤 공백 trim + 내부 다중 공백 collapse → silent", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        schoolName: "  서울    시연   초등학교  ",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("서울 시연 초등학교");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - address 앞뒤 공백 trim + 내부 다중 공백 collapse → silent", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        address: "  서울특별시   시연구   시연동   123  ",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].address).toBe("서울특별시 시연구 시연동 123");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - sidoName / sigunguName trim → silent", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        sidoName: "  서울특별시  ",
        sigunguName: " 시연구 ",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].sidoName).toBe("서울특별시");
    expect(result.records[0].sigunguName).toBe("시연구");
    expect(result.issues).toEqual([]);
  });

  // ─── Hard drop — schoolId 필수 / 중복 ─────────────────────────────────────
  it("cleanSchools - schoolId 빈 문자열 → record drop + warning(field: schoolId)", () => {
    const input = [
      buildRecord({ schoolId: "valid-1" }),
      buildRecord({ schoolId: "" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 2 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolId).toBe("valid-1");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("schoolId");
    expect(result.issues[0].datasetCategory).toBe("B");
    expect(result.meta.cleanedRecordCount).toBe(1);
  });

  // 11-3 1차-17 의미 갱신 — schoolName placeholder를 "first 학교" / "second 학교"로
  // 변경. 1차-17 step 10 keyword presence 검증에서 silent로 통과하도록 하여 본 테스트가
  // 검증하려는 dedup 계약(`field: "duplicate"` 단일 warning)을 그대로 보존한다.
  it("cleanSchools - schoolId 중복 → 첫 record 보존, 2회차 drop + warning(field: duplicate)", () => {
    const input = [
      buildRecord({ schoolId: "dup-1", schoolName: "first 학교" }),
      buildRecord({ schoolId: "dup-1", schoolName: "second 학교" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 2 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("first 학교");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("duplicate");
    expect(result.issues[0].datasetCategory).toBe("B");
    expect(result.meta.cleanedRecordCount).toBe(1);
  });

  // ─── Soft preserve — enum 위반 ────────────────────────────────────────────
  // 11-3 1차-7 의미 갱신 — 기존에는 "초등학교"를 미매핑 한글로 사용했으나, 1차-7에서
  // "초등학교" → "elementary"로 silent 매핑되도록 추가되었다. 따라서 본 fallback
  // contract 검증 케이스는 **미매핑 한글 "산업학교"** (1차-7 KOREAN_SCHOOL_LEVEL_MAP에
  // 없음)로 입력을 변경하여 fallback + warning 계약을 그대로 보존한다.
  it("cleanSchools - schoolLevel 정의 외 값 → \"other\" fallback + warning(field: schoolLevel)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        schoolLevel: "산업학교",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("schoolLevel");
  });

  it("cleanSchools - schoolType 정의 외 값 → null fallback + warning(field: schoolType)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        schoolType: "vocational",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("schoolType");
  });

  it("cleanSchools - schoolType null 입력 → silent (정상)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: null })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBeNull();
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - establishmentType 정의 외 값 → null fallback + warning(field: establishmentType)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        establishmentType: "foundation",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].establishmentType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("establishmentType");
  });

  // ─── 좌표 범위 (pair-level invalidation) ──────────────────────────────────
  it("cleanSchools - latitude 범위 외(50) → latitude/longitude 모두 null + warning(field: coordinate)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        latitude: 50,
        longitude: 126.978,
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].latitude).toBeNull();
    expect(result.records[0].longitude).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("coordinate");
    expect(result.issues[0].severity).toBe("warning");
  });

  it("cleanSchools - longitude 범위 외(200) → latitude/longitude 모두 null + warning(field: coordinate)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        latitude: 37.5665,
        longitude: 200,
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].latitude).toBeNull();
    expect(result.records[0].longitude).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("coordinate");
    expect(result.issues[0].severity).toBe("warning");
  });

  it("cleanSchools - latitude만 값, longitude=null → 모두 null + warning(field: coordinate)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        latitude: 37.5665,
        longitude: null,
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].latitude).toBeNull();
    expect(result.records[0].longitude).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("coordinate");
    expect(result.issues[0].severity).toBe("warning");
  });

  it("cleanSchools - latitude=null, longitude=null → silent (정상)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        latitude: null,
        longitude: null,
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].latitude).toBeNull();
    expect(result.records[0].longitude).toBeNull();
    expect(result.issues).toEqual([]);
  });

  // ─── 회귀 + pure function ─────────────────────────────────────────────────
  it("cleanSchools - mini fixture 3건 회귀 → 3 records / 0 issues 유지", () => {
    const input = buildMiniFixtureRecords();
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 3 }),
    });
    expect(result.records.length).toBe(3);
    expect(result.issues).toEqual([]);
    expect(result.meta.cleanedRecordCount).toBe(3);
    // 핵심 필드 보존 회귀
    expect(result.records[0].schoolId).toBe("school:demo:seoul-elem-a");
    expect(result.records[1].schoolId).toBe("school:demo:busan-mid-b");
    expect(result.records[2].schoolId).toBe("school:demo:daejeon-special-c");
    expect(result.records[2].latitude).toBeNull();
    expect(result.records[2].longitude).toBeNull();
  });

  it("cleanSchools - pure function (1차-3): 입력 array length·객체 snapshot 무변", () => {
    const input = buildMiniFixtureRecords();
    const inputLengthBefore = input.length;
    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const ref0 = input[0];

    cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 3 }),
    });

    expect(input.length).toBe(inputLengthBefore);
    expect(input[0]).toBe(ref0); // input array element 참조 무변
    expect(input).toEqual(inputSnapshot); // input 객체 무수정 (deep equality)
  });

  // ─── 선택 케이스 (Soft preserve 명시 + 다중 issue) ─────────────────────────
  it("cleanSchools - schoolName trim 후 빈 문자열 → record preserve + warning(field: schoolName)", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        schoolName: "    ",
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolName");
    expect(result.issues[0].severity).toBe("warning");
  });

  // 11-3 1차-7 의미 갱신 — 기존 입력 "유치원"은 1차-7에서 "kindergarten"으로 silent
  // 매핑되어 schoolLevel 위반 issue가 발행되지 않게 된다. 본 multi-issue contract를
  // 보존하기 위해 미매핑 한글 "산업학교"로 입력 변경 (schoolLevel + coordinate 2건 issue).
  it("cleanSchools - 한 record가 schoolLevel + coordinate 동시 위반 시 issue 2건 발행", () => {
    const input = [
      buildRecord({
        schoolId: "s1",
        schoolLevel: "산업학교",
        latitude: 50,
        longitude: 126.978,
      }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.records[0].latitude).toBeNull();
    expect(result.records[0].longitude).toBeNull();
    expect(result.issues.length).toBe(2);
    const fields = result.issues.map((i) => i.field).sort();
    expect(fields).toEqual(["coordinate", "schoolLevel"]);
  });
});

// ─── 11-3 1차-5 신규 — enum case-insensitive 정규화 (영문만, 한글 매핑 보류) ───
//
// 정책 (사용자 합의값 §1-3):
//   - normalizeEnumValue(value) = value.trim().toLowerCase() (null skip).
//   - normalize 후 allowlist 안 → records에 lowercase canonical 값으로 저장, issue 없음 (silent).
//   - normalize 후에도 allowlist 밖 → 기존 1차-3 fallback 정책 유지.
//     - schoolLevel 정의 외 → "other" + warning(field: schoolLevel)
//     - schoolType 정의 외 → null + warning(field: schoolType)
//     - establishmentType 정의 외 → null + warning(field: establishmentType)
//   - 한글 값(예: "초등학교", "공립")은 한글 case 무관이라 normalize 후에도 동일 → fallback 그대로.
//     한글 매핑은 1차-6+로 보류.
//   - case-insensitive가 enum 경계를 넘지 않음: schoolLevel "PUBLIC"은 normalize → "public"이지만
//     schoolLevel allowlist에 없으므로 "other" + warning.
//   - mini fixture 3건(이미 lowercase canonical)은 회귀 안전 — 기존 case 14가 records=3 / issues=0 검증.

describe("cleanSchools (11-3 1차-5 enum case-insensitive 정규화)", () => {
  // ─── schoolLevel case/space 변형 → silent normalize ────────────────────────
  it("cleanSchools - schoolLevel \"Elementary\" → \"elementary\"로 silent normalize", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "Elementary" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolLevel).toBe("elementary");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"ELEMENTARY\" → \"elementary\"로 silent normalize", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "ELEMENTARY" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("elementary");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \" Elementary \" → \"elementary\"로 silent normalize (trim + toLowerCase)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: " Elementary " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("elementary");
    expect(result.issues).toEqual([]);
  });

  // ─── schoolLevel 미매핑 한글 → 기존 fallback 유지 ──────────────────────────
  // 11-3 1차-7 의미 갱신 — 1차-5 시점에는 모든 한글을 fallback 처리했지만, 1차-7부터
  // `"초등학교"` 등 일부 한글은 영문 canonical로 silent 매핑된다. 본 케이스는 1차-7
  // KOREAN_SCHOOL_LEVEL_MAP에 **없는 한글** `"산업학교"`로 입력을 변경하여, 매핑 키 외
  // 한글은 여전히 fallback(`"other"` + warning) 정책을 따른다는 contract를 보존한다.
  it("cleanSchools - schoolLevel 미매핑 한글 \"산업학교\" → \"other\" fallback + warning 유지 (1차-5 회귀)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "산업학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolLevel");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── schoolType case/space 변형 → silent normalize ─────────────────────────
  it("cleanSchools - schoolType \"General\" → \"general\"로 silent normalize", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "General" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("general");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"GENERAL\" → \"general\"로 silent normalize", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "GENERAL" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("general");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \" Special \" → \"special\"로 silent normalize (trim + toLowerCase)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: " Special " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("special");
    expect(result.issues).toEqual([]);
  });

  // ─── establishmentType case/space 변형 → silent normalize ──────────────────
  it("cleanSchools - establishmentType \"Public\" → \"public\"로 silent normalize", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "Public" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("public");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - establishmentType \"PRIVATE\" → \"private\"로 silent normalize", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "PRIVATE" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("private");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - establishmentType \" National \" → \"national\"로 silent normalize (trim + toLowerCase)", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: " National " }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("national");
    expect(result.issues).toEqual([]);
  });

  // ─── cross-enum guard — case-insensitive가 enum 경계를 넘지 않는지 ─────────
  it("cleanSchools - schoolLevel \"PUBLIC\" → schoolLevel allowlist 밖이라 \"other\" + warning (cross-enum guard)", () => {
    // "PUBLIC"은 normalize 후 "public"이지만 schoolLevel allowlist에는 없음.
    // (establishmentType allowlist에는 있지만 enum 경계를 넘어서 매칭하지 않음.)
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "PUBLIC" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolLevel");
    expect(result.issues[0].severity).toBe("warning");
  });
});

// ─── 11-3 1차-7 신규 — schoolLevel / establishmentType 한글 enum 매핑 ────────
//
// 정책 (사용자 합의값 §1-3 / 1차-7 합의 §2-7):
//   - schoolLevel 한글 매핑 (`KOREAN_SCHOOL_LEVEL_MAP`, 8 key → 5 영문값):
//       유치원→kindergarten, 초등학교/초등→elementary, 중학교/중등→middle,
//       고등학교/고등→high, 특수학교→special.
//   - establishmentType 한글 매핑 (`KOREAN_ESTABLISHMENT_TYPE_MAP`, 3 key → 3 영문값):
//       국립→national, 공립→public, 사립→private.
//   - schoolType 한글 매핑은 **1차-8+ 보류** (cross-enum boundary 합의 필요).
//   - 한글 매핑 성공 시 silent — issue 0건, records에 영문 lowercase canonical 저장
//     (1차-5 case-insensitive 정규화 정책 일관).
//   - 매핑 키는 `normalizeEnumValue` 결과(`trim() + toLowerCase()`). 한글은 case 무관이라
//     trim 효과가 핵심 — `" 초등학교 "` → trim → `"초등학교"` → 매핑 키 일치 → `"elementary"`.
//   - 미매핑 한글 (예: `"산업학교"`, `"국공립"`)은 1차-3 fallback 정책 유지
//     (schoolLevel → `"other"` + warning / establishmentType → null + warning).
//   - cross-enum guard 유지 — 매핑은 enum별 독립.

describe("cleanSchools (11-3 1차-7 한글 enum 매핑)", () => {
  // ─── schoolLevel 한글 매핑 (5 영문값 → 8 한글 키) ─────────────────────────
  it("cleanSchools - schoolLevel \"유치원\" → \"kindergarten\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "유치원" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolLevel).toBe("kindergarten");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"초등학교\" → \"elementary\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "초등학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("elementary");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"초등\" (alias) → \"elementary\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "초등" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("elementary");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"중학교\" → \"middle\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "중학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("middle");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"중등\" (alias) → \"middle\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "중등" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("middle");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"고등학교\" → \"high\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "고등학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("high");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"고등\" (alias) → \"high\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "고등" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("high");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolLevel \"특수학교\" → \"special\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "특수학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("special");
    expect(result.issues).toEqual([]);
  });

  // ─── establishmentType 한글 매핑 (3 영문값 → 3 한글 키) ───────────────────
  it("cleanSchools - establishmentType \"국립\" → \"national\" silent 매핑", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "국립" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("national");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - establishmentType \"공립\" → \"public\" silent 매핑", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "공립" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("public");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - establishmentType \"사립\" → \"private\" silent 매핑", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "사립" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("private");
    expect(result.issues).toEqual([]);
  });

  // ─── trim + 한글 매핑 ─────────────────────────────────────────────────────
  it("cleanSchools - schoolLevel \" 초등학교 \" → \"elementary\" silent 매핑 (trim + 한글)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: " 초등학교 " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("elementary");
    expect(result.issues).toEqual([]);
  });

  // ─── 미매핑 한글 → 1차-3 fallback 유지 ────────────────────────────────────
  it("cleanSchools - schoolLevel \"산업학교\" (미매핑 한글) → \"other\" fallback + warning", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "산업학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolLevel");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── schoolType 미매핑 한글 → fallback 유지 ───────────────────────────────
  // 11-3 1차-9 의미 갱신 — 기존에는 "특수"가 schoolType 한글 매핑 미도입(1차-7 안 B)이라
  // null + warning fallback 케이스로 사용되었으나, 1차-9에서 "특수" → "special"로 silent
  // 매핑되도록 추가되었다. 따라서 본 fallback contract 검증 케이스는 **미매핑 한글
  // "전문"** (1차-9 KOREAN_SCHOOL_TYPE_MAP에 없음)로 입력을 변경하여, 매핑 키 외 한글은
  // 여전히 fallback(null + warning) 정책을 따른다는 contract를 보존한다.
  it("cleanSchools - schoolType \"전문\" (1차-9 미매핑 한글) → null fallback + warning", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "전문" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolType");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── establishmentType 변형 (1차-7 미매핑) → fallback 유지 ────────────────
  it("cleanSchools - establishmentType \"국공립\" (변형, 1차-7 미매핑) → null fallback + warning", () => {
    // "국립"/"공립"/"사립"만 1차-7 매핑. "국공립" 같은 변형은 1차-8+로 보류.
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "국공립" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("establishmentType");
    expect(result.issues[0].severity).toBe("warning");
  });
});

// ─── 11-3 1차-9 신규 — schoolType 한글 enum 매핑 (안 B) ──────────────────────
//
// 정책 (사용자 합의값 §1-5 / 1차-9 합의):
//   - `KOREAN_SCHOOL_TYPE_MAP` (4 한글 키 → 4 영문 canonical, alias 없음):
//       일반→general, 특수→special, 대안→alternative, 기타→other.
//   - silent mapping (1차-5/1차-7 정책 일관) — 매핑 hit 시 issue 0건 + records에
//     영문 lowercase canonical 저장.
//   - cross-enum boundary rule:
//       "특수"(suffix 없음)는 schoolType 전용 매핑 → schoolType="special" silent.
//       "특수학교"(suffix 있음)는 schoolLevel 전용 매핑(1차-7) → schoolType에서는 null fallback.
//       반대로 schoolLevel에 "특수" 입력 시 → "other" fallback (KOREAN_SCHOOL_LEVEL_MAP에 없음).
//   - 미매핑 한글 (예: "전문") 또는 변형 ("대안학교"/"기타학교" 등)은 1차-3 fallback 유지
//     (1차-10+로 변형 매핑 보류).

describe("cleanSchools (11-3 1차-9 schoolType 한글 매핑)", () => {
  // ─── schoolType 한글 매핑 (4 영문값 → 4 한글 키, alias 없음) ───────────────
  it("cleanSchools - schoolType \"일반\" → \"general\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "일반" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolType).toBe("general");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"특수\" → \"special\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "특수" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("special");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"대안\" → \"alternative\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "대안" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("alternative");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"기타\" → \"other\" silent 매핑", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "기타" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("other");
    expect(result.issues).toEqual([]);
  });

  // ─── trim + 한글 매핑 ─────────────────────────────────────────────────────
  it("cleanSchools - schoolType \" 특수 \" → \"special\" silent 매핑 (trim + 한글)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: " 특수 " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("special");
    expect(result.issues).toEqual([]);
  });

  // ─── boundary rule: "특수" vs "특수학교" ──────────────────────────────────
  it("cleanSchools - schoolType \"특수학교\" → null fallback + warning (boundary rule: \"특수학교\"는 schoolLevel 전용)", () => {
    // "특수학교"는 KOREAN_SCHOOL_LEVEL_MAP(1차-7) 전용. schoolType에서는 매핑 안 함 →
    // schoolType allowlist 밖 → null fallback + warning.
    const input = [buildRecord({ schoolId: "s1", schoolType: "특수학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolType");
    expect(result.issues[0].severity).toBe("warning");
  });

  it("cleanSchools - schoolLevel \"특수\" → \"other\" fallback + warning (boundary rule: \"특수\"는 schoolType 전용)", () => {
    // "특수"는 KOREAN_SCHOOL_TYPE_MAP(1차-9) 전용. schoolLevel에서는 매핑 안 함 →
    // schoolLevel allowlist + KOREAN_SCHOOL_LEVEL_MAP(1차-7) 둘 다 밖 → "other" fallback.
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "특수" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolLevel");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── 미매핑 한글 → 1차-3 fallback 유지 (deeper 변형 회귀) ─────────────────
  // 11-3 1차-13 의미 갱신 — 1차-11 시점에는 "대안고"를 미매핑 deeper 변형 fallback
  // 케이스로 사용했으나, 1차-13에서 "대안고" → "alternative"로 silent 매핑되도록
  // 추가되었다. 따라서 본 fallback contract 검증 케이스는 **모호한 미매핑 변형
  // "공업고"** (1차-13 KOREAN_SCHOOL_TYPE_MAP에도 없음 — 특성화고 분류 합의 부재로
  // 1차-15+ 보류)로 입력을 변경하여, 매핑 키 외 변형은 여전히 fallback(null + warning)
  // 정책을 따른다는 contract를 보존한다.
  it("cleanSchools - schoolType \"공업고\" (모호 미매핑 변형, 1차-13 미매핑) → null fallback + warning (1차-15+ 보류)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "공업고" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolType");
    expect(result.issues[0].severity).toBe("warning");
  });
});

// ─── 11-3 1차-11 신규 — 한글 enum 변형 매핑 + schoolLevel "기타" ─────────────
//
// 정책 (사용자 합의값 §1):
//   - schoolType 변형 매핑 추가 (3 키): "대안학교"→alternative / "기타학교"→other /
//     "일반학교"→general.
//   - schoolLevel "기타"→other 매핑 추가 (1 키, 1차-9까지 "기타"는 schoolType 전용이었음).
//   - establishmentType 변형 매핑 추가 (2 키): "공립학교"→public / "사립학교"→private.
//   - **"국공립"은 1차-11에서도 매핑 미도입** — national + public 합성 의미라 단일 enum으로
//     안전하게 축약 불가. null + warning fallback 유지.
//   - silent mapping 정책 (1차-7/1차-9 일관) — 매핑 hit 시 issue 0건 + records에 영문
//     lowercase canonical 저장.
//   - boundary rule 유지 — "특수학교"=schoolLevel / "특수"=schoolType / cross-enum 자동
//     추론 금지.

describe("cleanSchools (11-3 1차-11 한글 enum 변형 매핑)", () => {
  // ─── schoolType 변형 매핑 (3건) ────────────────────────────────────────────
  it("cleanSchools - schoolType \"대안학교\" → \"alternative\" silent 매핑 (1차-11 변형)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "대안학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolType).toBe("alternative");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"기타학교\" → \"other\" silent 매핑 (1차-11 변형)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "기타학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("other");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"일반학교\" → \"general\" silent 매핑 (1차-11 변형)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "일반학교" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("general");
    expect(result.issues).toEqual([]);
  });

  // ─── schoolLevel "기타" 매핑 (1건) ────────────────────────────────────────
  it("cleanSchools - schoolLevel \"기타\" → \"other\" silent 매핑 (1차-11 신규)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolLevel: "기타" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolLevel).toBe("other");
    expect(result.issues).toEqual([]);
  });

  // ─── establishmentType 변형 매핑 (2건) ─────────────────────────────────────
  it("cleanSchools - establishmentType \"공립학교\" → \"public\" silent 매핑 (1차-11 변형)", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "공립학교" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("public");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - establishmentType \"사립학교\" → \"private\" silent 매핑 (1차-11 변형)", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "사립학교" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBe("private");
    expect(result.issues).toEqual([]);
  });

  // ─── "국공립" boundary 회귀 — 매핑 미도입 명시 (1건) ────────────────────────
  // 1차-11 합의 §4 — "국공립"은 national + public 합성 의미라 단일 enum으로 안전하게
  // 축약 불가. 1차-11에서도 KOREAN_ESTABLISHMENT_TYPE_MAP에 포함하지 않으며,
  // fallback (null + warning) 정책을 명시적으로 유지한다. 본 케이스는 그 contract를
  // 보존하는 boundary 회귀 테스트이다 (기존 1차-7 동일 케이스도 line ~886에 유지).
  it("cleanSchools - establishmentType \"국공립\" → null fallback + warning 유지 (1차-11 boundary 미매핑 명시)", () => {
    const input = [
      buildRecord({ schoolId: "s1", establishmentType: "국공립" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].establishmentType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("establishmentType");
    expect(result.issues[0].severity).toBe("warning");
  });
});

// ─── 11-3 1차-13 신규 — schoolType deeper 한글 변형 매핑 ─────────────────────
//
// 정책 (사용자 합의값 §1):
//   - schoolType deeper 변형 3키 추가: "대안고"→alternative / "기타고"→other /
//     "일반계"→general. 일반계 고등학교(인문계) 표준 분류명 포함.
//   - "공업고" / "상업고" / "외국어고" / "과학고" 등 특성화·목적형 고교 표현은
//     **이번 단계 매핑 미도입** — alternative vs other 분류 합의 부재로 1차-15+ 보류.
//   - silent mapping 정책 (1차-7/1차-9/1차-11 일관) — 매핑 hit 시 issue 0건 + records에
//     영문 lowercase canonical 저장.
//   - boundary rule 유지 — "특수"=schoolType / "특수학교"=schoolLevel / "국공립"=
//     establishmentType null + warning 그대로.

describe("cleanSchools (11-3 1차-13 schoolType deeper 변형 매핑)", () => {
  // ─── schoolType deeper 변형 매핑 (3건) ─────────────────────────────────────
  it("cleanSchools - schoolType \"대안고\" → \"alternative\" silent 매핑 (1차-13 deeper 변형)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "대안고" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolType).toBe("alternative");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"기타고\" → \"other\" silent 매핑 (1차-13 deeper 변형)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "기타고" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("other");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolType \"일반계\" → \"general\" silent 매핑 (1차-13 deeper 변형, 일반계 고등학교 표준 분류)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "일반계" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("general");
    expect(result.issues).toEqual([]);
  });

  // ─── trim + deeper 변형 (1건) ─────────────────────────────────────────────
  it("cleanSchools - schoolType \" 대안고 \" → \"alternative\" silent 매핑 (trim + deeper 변형)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: " 대안고 " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBe("alternative");
    expect(result.issues).toEqual([]);
  });

  // ─── 모호 미매핑 deeper 변형 boundary 회귀 (1건) ───────────────────────────
  // 1차-13 합의 §2 — "공업고" / "상업고" / "외국어고" / "과학고" 등 특성화·목적형
  // 고교는 alternative vs other 분류 합의 부재로 1차-15+ 보류. 본 케이스는 매핑
  // 미도입을 명시적으로 보존하는 boundary 회귀 (기존 1차-11 "대안고" 회귀 케이스도
  // 1차-13에서 "공업고"로 의미 갱신됨).
  it("cleanSchools - schoolType \"상업고\" → null fallback + warning 유지 (1차-13 boundary 미매핑 명시, 1차-15+ 보류)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolType: "상업고" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolType).toBeNull();
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolType");
    expect(result.issues[0].severity).toBe("warning");
  });
});

// ─── 11-3 1차-15 신규 — neisSchoolCode 형식 검증 (Soft preserve) ─────────────
//
// 정책 (사용자 합의값 §1·§2):
//   - valid pattern: ^B\d{9}$ (예: "B000000001")
//   - null 입력 → silent (records의 neisSchoolCode는 null)
//   - 빈 문자열 / whitespace-only → null로 정규화 + silent
//   - 앞뒤 공백 있는 valid 값 → trim 후 valid 처리 + silent
//   - 형식 위반 non-empty 값 → record drop X. trimmed value preserve + warning(field: "neisSchoolCode")
//   - schoolId 중복/누락 정책과 섞지 않는다 (neisSchoolCode는 보조 식별자).
//   - mini fixture 3건은 모두 valid `B\d{9}` 패턴 → records=3 / issues=0 유지.

describe("cleanSchools (11-3 1차-15 neisSchoolCode 형식 검증)", () => {
  // ─── valid 패턴 (silent) ───────────────────────────────────────────────────
  it("cleanSchools - neisSchoolCode \"B000000001\" → silent valid", () => {
    const input = [
      buildRecord({ schoolId: "s1", neisSchoolCode: "B000000001" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].neisSchoolCode).toBe("B000000001");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - neisSchoolCode \" B000000001 \" → trim 후 silent valid", () => {
    const input = [
      buildRecord({ schoolId: "s1", neisSchoolCode: " B000000001 " }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].neisSchoolCode).toBe("B000000001");
    expect(result.issues).toEqual([]);
  });

  // ─── null / empty / whitespace → null silent ───────────────────────────────
  it("cleanSchools - neisSchoolCode null → silent (records 값 null 유지)", () => {
    const input = [buildRecord({ schoolId: "s1", neisSchoolCode: null })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].neisSchoolCode).toBeNull();
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - neisSchoolCode \"\" → null로 정규화 + silent", () => {
    const input = [buildRecord({ schoolId: "s1", neisSchoolCode: "" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].neisSchoolCode).toBeNull();
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - neisSchoolCode \"   \" (whitespace-only) → null로 정규화 + silent", () => {
    const input = [buildRecord({ schoolId: "s1", neisSchoolCode: "   " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].neisSchoolCode).toBeNull();
    expect(result.issues).toEqual([]);
  });

  // ─── 형식 위반 (Soft preserve + warning) ───────────────────────────────────
  it("cleanSchools - neisSchoolCode \"B12345\" → preserve + warning(field: \"neisSchoolCode\")", () => {
    const input = [buildRecord({ schoolId: "s1", neisSchoolCode: "B12345" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].neisSchoolCode).toBe("B12345");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("neisSchoolCode");
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].datasetCategory).toBe("B");
  });

  it("cleanSchools - neisSchoolCode \"X000000001\" → preserve + warning(field: \"neisSchoolCode\")", () => {
    const input = [
      buildRecord({ schoolId: "s1", neisSchoolCode: "X000000001" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].neisSchoolCode).toBe("X000000001");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("neisSchoolCode");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── mini fixture 회귀 (3건 모두 valid) ────────────────────────────────────
  it("cleanSchools - mini fixture 3건 회귀 → records=3 / issues=0 유지 (1차-15 형식 검증 도입 후에도 회귀 안전)", () => {
    const input = buildMiniFixtureRecords();
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 3 }),
    });
    expect(result.records.length).toBe(3);
    expect(result.issues).toEqual([]);
    expect(result.records[0].neisSchoolCode).toBe("B000000001");
    expect(result.records[1].neisSchoolCode).toBe("B000000002");
    expect(result.records[2].neisSchoolCode).toBe("B000000003");
  });
});

// ─── 11-3 1차-17 신규 — schoolName keyword presence 검증 (Soft preserve) ────
//
// 정책 (사용자 합의값 §1·§2):
//   - valid pattern: /(학교|유치원)/ — schoolName 어디서든 키워드 1회 이상 등장.
//   - schoolName은 이미 1차-3 step 1에서 trim + 내부 공백 collapse가 적용된다.
//   - 빈 schoolName (trim 후 "")는 1차-3 step 4 schoolName empty warning 정책만 유지 —
//     1차-17 keyword 검증 분기 미경유 (empty 검사 우선).
//   - keyword 부재 non-empty schoolName → record drop X. normalized schoolName preserve
//     + warning(field: "schoolName") 발행.
//   - silent transform (suffix 자동 확장 / 약어 → 정식 명칭 / 분교 정리 등)은 1차-17에서 미도입.
//   - schoolLevel / schoolType / establishmentType 추론과 섞지 않는다.
//   - mini fixture 3건은 모두 "초등학교" / "중학교" / "특수학교" 포함 → records=3 / issues=0 유지.

describe("cleanSchools (11-3 1차-17 schoolName keyword presence 검증)", () => {
  // ─── valid (silent) ────────────────────────────────────────────────────────
  it("cleanSchools - schoolName \"서울시연초등학교 A\" → silent valid (초등학교 키워드 포함)", () => {
    const input = [
      buildRecord({ schoolId: "s1", schoolName: "서울시연초등학교 A" }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("서울시연초등학교 A");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolName \"부산유치원\" → silent valid (유치원 키워드 포함)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolName: "부산유치원" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("부산유치원");
    expect(result.issues).toEqual([]);
  });

  it("cleanSchools - schoolName \" 서울시연  초등학교 A \" → trim/collapse 후 silent valid", () => {
    const input = [
      buildRecord({ schoolId: "s1", schoolName: " 서울시연  초등학교 A " }),
    ];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records[0].schoolName).toBe("서울시연 초등학교 A");
    expect(result.issues).toEqual([]);
  });

  // ─── keyword 부재 (Soft preserve + warning) ────────────────────────────────
  it("cleanSchools - schoolName \"ㅁㅁ센터\" → preserve + warning(field: \"schoolName\")", () => {
    const input = [buildRecord({ schoolId: "s1", schoolName: "ㅁㅁ센터" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("ㅁㅁ센터");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolName");
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].datasetCategory).toBe("B");
  });

  it("cleanSchools - schoolName \"테스트시설\" → preserve + warning(field: \"schoolName\")", () => {
    const input = [buildRecord({ schoolId: "s1", schoolName: "테스트시설" })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("테스트시설");
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolName");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── 빈 schoolName 회귀 (1차-3 정책만 유지 — 1차-17 keyword 분기 미경유) ───
  it("cleanSchools - schoolName \"    \" (whitespace-only) → 1차-3 empty warning 1건만 유지 (1차-17 keyword warning 추가 X)", () => {
    const input = [buildRecord({ schoolId: "s1", schoolName: "    " })];
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 1 }),
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].schoolName).toBe("");
    // 빈 schoolName은 1차-3 step 4 warning 1건만 — 1차-17 keyword 검증은 미경유.
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("schoolName");
    expect(result.issues[0].severity).toBe("warning");
  });

  // ─── mini fixture 회귀 (3건 모두 학교 키워드 포함) ────────────────────────
  it("cleanSchools - mini fixture 3건 회귀 → records=3 / issues=0 유지 (1차-17 keyword 검증 도입 후에도 회귀 안전)", () => {
    const input = buildMiniFixtureRecords();
    const result = cleanSchools({
      schoolRecords: input,
      meta: buildMeta({ schoolRecordCount: 3 }),
    });
    expect(result.records.length).toBe(3);
    expect(result.issues).toEqual([]);
    expect(result.records[0].schoolName).toBe("서울시연초등학교 A");
    expect(result.records[1].schoolName).toBe("부산시연중학교 B");
    expect(result.records[2].schoolName).toBe("대전시연특수학교 C");
  });
});
