/**
 * ingestKikmix.test.ts — 11-2 1차-17 KIKmix 행정동↔법정동 매핑 ingest RED 테스트.
 *
 * KIKmix(행정동코드 + 법정동코드 매핑, CP949 fixed-width 8컬럼)에서 매핑 pair records를
 * 산출한다. KIKcd_B(법정동) / KIKcd_H(행정동)와 별도 도메인 — 두 코드 체계 간 매핑이
 * single source of truth. ingestKikcdB/H와 별도 함수.
 *
 * 헤더 (8 컬럼):
 *   행정동코드 시도명 시군구명 읍면동명 법정동코드 동리명 생성일자 말소일자
 *
 * **분류 정책 (1차-17 사용자 합의값)**:
 *   - 시도 행 (`hjdCode.endsWith("00000000") AND legalDongCode.endsWith("00000000")`)
 *       → 제외, issue 없음.
 *   - 시군구 행 (`endsWith("00000")` + 시군구명 != "" + 읍면동명 == "")
 *       → 제외, issue 없음.
 *   - 매핑 행 (그 외 유효 10자리, 읍면동명 != "", 동리명 != "") → mappingRecords 1건.
 *   - 말소 행 (`parseExpirationDate(말소일자) === true`) → 제외 + info issue.
 *   - 형식 위반 (10자리 숫자 아님) → 제외 + warning issue.
 *   - sigungu prefix 불일치 (`hjdCode.slice(0,5) !== legalDongCode.slice(0,5)`)
 *       → records 포함 + warning issue (정보 보존 우선).
 *   - 중복 매핑 (동일 (hjdCode, legalDongCode) pair) → records 포함 + info issue.
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/ingest/ingestKikmix.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 * - 실 data/raw/G/.../KIKmix.20260325는 참조 0건.
 * - CP949 디코드는 호출자 책임 — 본 함수는 UTF-8 string text를 받는다.
 */

import { describe, expect, it } from "vitest";
import { ingestKikmix } from "../ingest/ingestKikmix";

function padDisplay(value: string, targetWidth: number): string {
  let w = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp >= 0xac00 && cp <= 0xd7a3) w += 2;
    else w += 1;
  }
  return value + " ".repeat(Math.max(0, targetWidth - w));
}

// KIKmix mini fixture — 실 행안부 KIKmix와 동일 컬럼 순서, 폭만 축소.
// 8 컬럼: 행정동코드/시도명/시군구명/읍면동명(행정동명)/법정동코드/동리명(법정동명)/생성일자/말소일자.
const COLUMNS = [
  { key: "행정동코드", width: 10 },
  { key: "시도명", width: 14 },
  { key: "시군구명", width: 10 },
  { key: "읍면동명", width: 14 },
  { key: "법정동코드", width: 10 },
  { key: "동리명", width: 14 },
  { key: "생성일자", width: 8 },
  { key: "말소일자", width: 8 },
] as const;

const HEADER = COLUMNS.map((c) => padDisplay(c.key, c.width)).join(" ");

function buildRow(values: Record<string, string>): string {
  return COLUMNS.map((c) => padDisplay(values[c.key] ?? "", c.width)).join(" ");
}

const COLLECTED_AT = "2026-05-15T00:00:00+09:00";

describe("ingestKikmix (11-2 1차-17)", () => {
  it("빈 입력 → mappingRecords=[], issues=[]", () => {
    const result = ingestKikmix({ text: "", collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("헤더만 + 데이터 0행 → mappingRecords=[]", () => {
    const result = ingestKikmix({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
  });

  it("시도 행 (1100000000) → mappingRecords=[]", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1100000000",
        "시도명": "서울특별시",
        "법정동코드": "1100000000",
        "동리명": "서울특별시",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
  });

  it("시군구 행 (1111000000) → mappingRecords=[]", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111000000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "법정동코드": "1111000000",
        "동리명": "종로구",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
  });

  it("정상 매핑 행 1건 → mappingRecords 1건, 모든 필드 정상", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords.length).toBe(1);
    expect(result.mappingRecords[0].hjdCode).toBe("1111051500");
    expect(result.mappingRecords[0].legalDongCode).toBe("1111010100");
    expect(result.mappingRecords[0].sidoCode).toBe("11");
    expect(result.mappingRecords[0].sigunguCode).toBe("11110");
    expect(result.mappingRecords[0].sidoName).toBe("서울특별시");
    expect(result.mappingRecords[0].sigunguName).toBe("종로구");
    expect(result.mappingRecords[0].hjdName).toBe("청운효자동");
    expect(result.mappingRecords[0].legalDongName).toBe("청운동");
  });

  it("1:N — 행정동 1개 (청운효자동)이 법정동 3개에 매핑 → mappingRecords 3건", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010200",
        "동리명": "신교동",
        "생성일자": "20081101",
      }),
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010300",
        "동리명": "궁정동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords.length).toBe(3);
    expect(result.mappingRecords.every((r) => r.hjdCode === "1111051500")).toBe(
      true,
    );
    const legalDongCodes = result.mappingRecords.map((r) => r.legalDongCode);
    expect(legalDongCodes).toEqual([
      "1111010100",
      "1111010200",
      "1111010300",
    ]);
  });

  it("hjdCode 형식 위반 (9자리) → records 제외 + warning issue", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "111105150",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("legalDongCode 형식 위반 (9자리) → records 제외 + warning issue", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "111101010",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("sigunguCode 파생: hjdCode.slice(0,5)와 동일 (정상 시), legalDongCode.slice(0,5)도 동일해야 함", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "4111153500",
        "시도명": "경기도",
        "시군구명": "장안구",
        "읍면동명": "파장동",
        "법정동코드": "4111110100",
        "동리명": "파장동",
        "생성일자": "20030301",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords.length).toBe(1);
    expect(result.mappingRecords[0].sigunguCode).toBe("41111");
    expect(result.mappingRecords[0].sidoCode).toBe("41");
    // 정상 시 양쪽 slice(0,5)가 일치
    expect(result.mappingRecords[0].hjdCode.slice(0, 5)).toBe(
      result.mappingRecords[0].legalDongCode.slice(0, 5),
    );
  });

  it("sigungu prefix 불일치 — records 포함 + warning issue (정보 보존)", () => {
    // hjdCode = 1111051500 (종로구 11110), legalDongCode = 1114010100 (중구 11140) — mismatch
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1114010100",
        "동리명": "다른법정동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords.length).toBe(1); // records 포함
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("말소 행 (말소일자=20100101) → records 제외 + info issue", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111052000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "구청운동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "19880423",
        "말소일자": "20100101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords).toEqual([]);
    expect(result.issues.some((i) => i.severity === "info")).toBe(true);
  });

  it("중복 매핑 pair (동일 hjdCode + legalDongCode) → records 포함 + info issue", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.mappingRecords.length).toBe(2); // records 포함
    expect(result.issues.some((i) => i.severity === "info")).toBe(true);
  });

  it("meta — source / sourcePolicyStatus / license 보존", () => {
    const result = ingestKikmix({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.meta.source).toBe("real:kikmix");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
    expect(result.meta.license).toBe("unknown");
  });

  it("meta — collectedAt 주입값 보존", () => {
    const result = ingestKikmix({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.meta.collectedAt).toBe(COLLECTED_AT);
  });

  it("meta — mappingRecordCount / issueCount는 실제 array length와 일치", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "법정동코드": "1111010100",
        "동리명": "청운동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikmix({ text, collectedAt: COLLECTED_AT });
    expect(result.meta.mappingRecordCount).toBe(result.mappingRecords.length);
    expect(result.meta.issueCount).toBe(result.issues.length);
  });

  it("meta shape — 허용된 6개 key만 포함한다 (추가 필드 금지)", () => {
    // GREEN 단계 ingestKikmix의 meta 반환 shape를 정확히 6개 key로 고정.
    // ingestKikcdB(7키) / ingestKikcdH(6키)와 일관 — mapping records는 단일 도메인 카운트.
    const result = ingestKikmix({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(Object.keys(result.meta).sort()).toEqual([
      "collectedAt",
      "issueCount",
      "license",
      "mappingRecordCount",
      "source",
      "sourcePolicyStatus",
    ]);
  });

  it("collectedAt 미주입 → ISO 8601 형식 타임스탬프 자동 생성", () => {
    const result = ingestKikmix({ text: HEADER });
    expect(result.meta.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
