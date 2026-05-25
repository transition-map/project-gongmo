/**
 * ingestKikcdH.test.ts — 11-2 1차-16 행안부 KIKcd_H 행정동 ingest RED 테스트.
 *
 * KIKcd_H(행정동코드 10자리 fixed-width 텍스트, CP949) 한 파일에서 행정동 records를
 * 단독 산출한다. KIKcd_B의 `ingestKikcdB`와는 별도 함수 — 행정동과 법정동은 의미가
 * 다른 코드 체계이므로 도메인 분리.
 *
 * **분류 정책 (1차-16, 사용자 합의값 그대로)**:
 *   - 시도 행 (`endsWith("00000000")`) → 제외, issue 없음.
 *   - 시군구 행 (`endsWith("00000")` + 시군구명 != "" + 읍면동명 == "")
 *       → 제외, issue 없음. (admin은 KIKcd_B 기반 single source 유지.)
 *   - 행정동 행 (그 외 유효 10자리, 읍면동명 != "") → `hjdRecords` 1건 추가.
 *   - 말소 행 (`parseExpirationDate(말소일자) === true`) → 제외 + info issue.
 *   - 형식 위반 행 (10자리 아님) → 제외 + warning issue.
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/ingest/ingestKikcdH.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 * - 실 data/raw/G/.../KIKcd_H.20260325는 참조 0건.
 * - CP949 디코드는 호출자 책임 — 본 함수는 UTF-8 string text를 받는다.
 */

import { describe, expect, it } from "vitest";
import { ingestKikcdH } from "../ingest/ingestKikcdH";

function padDisplay(value: string, targetWidth: number): string {
  let w = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp >= 0xac00 && cp <= 0xd7a3) w += 2;
    else w += 1;
  }
  return value + " ".repeat(Math.max(0, targetWidth - w));
}

// KIKcd_H mini fixture 컬럼 정의 — 실 행안부 KIKcd_H와 동일 컬럼·순서, 폭만 축소.
// KIKcd_B와 달리 "동리명" 컬럼이 없음 (행정동은 리 단위 부재).
const COLUMNS = [
  { key: "행정동코드", width: 10 },
  { key: "시도명", width: 14 },
  { key: "시군구명", width: 10 },
  { key: "읍면동명", width: 14 },
  { key: "생성일자", width: 8 },
  { key: "말소일자", width: 8 },
] as const;

const HEADER = COLUMNS.map((c) => padDisplay(c.key, c.width)).join(" ");

function buildRow(values: Record<string, string>): string {
  return COLUMNS.map((c) => padDisplay(values[c.key] ?? "", c.width)).join(" ");
}

const COLLECTED_AT = "2026-05-15T00:00:00+09:00";

describe("ingestKikcdH (11-2 1차-16)", () => {
  it("빈 입력 → hjdRecords=[], issues=[]", () => {
    const result = ingestKikcdH({ text: "", collectedAt: COLLECTED_AT });
    expect(result.hjdRecords).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("헤더만 + 데이터 0행 → hjdRecords=[]", () => {
    const result = ingestKikcdH({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords).toEqual([]);
  });

  it("시도 행 (1100000000 서울특별시) → hjdRecords=[]", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1100000000",
        "시도명": "서울특별시",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords).toEqual([]);
  });

  it("시군구 행 (1111000000 종로구) → hjdRecords=[] (admin은 KIKcd_B에서 산출)", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111000000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords).toEqual([]);
  });

  it("행정동 행 (1111051500 청운효자동) → hjdRecords 1건", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords.length).toBe(1);
    expect(result.hjdRecords[0].regionCode).toBe("1111051500");
    expect(result.hjdRecords[0].regionCodeType).toBe("haengjeongDong");
    expect(result.hjdRecords[0].sidoCode).toBe("11");
    expect(result.hjdRecords[0].sigunguCode).toBe("11110");
    expect(result.hjdRecords[0].hjdCode).toBe("1111051500");
    expect(result.hjdRecords[0].sidoName).toBe("서울특별시");
    expect(result.hjdRecords[0].sigunguName).toBe("종로구");
    expect(result.hjdRecords[0].hjdName).toBe("청운효자동");
  });

  it("행정동 행 다수 (3건) → hjdRecords 3건", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "생성일자": "20081101",
      }),
      buildRow({
        "행정동코드": "1111053000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "사직동",
        "생성일자": "19880423",
      }),
      buildRow({
        "행정동코드": "1111054000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "삼청동",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords.length).toBe(3);
  });

  it("말소 행 (말소일자=20100101) → 제외 + info issue", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111052000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "구청운동",
        "생성일자": "19880423",
        "말소일자": "20100101",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords).toEqual([]);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.severity === "info")).toBe(true);
  });

  it("형식 위반 (10자리 미만) → 제외 + warning issue", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "111105",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords).toEqual([]);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("mixed input — 시도/시군구/행정동/말소 4행 → 정확한 분리", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1100000000",
        "시도명": "서울특별시",
        "생성일자": "19880423",
      }),
      buildRow({
        "행정동코드": "1111000000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "생성일자": "19880423",
      }),
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "생성일자": "20081101",
      }),
      buildRow({
        "행정동코드": "1111052000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "구청운동",
        "생성일자": "19880423",
        "말소일자": "20100101",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords.length).toBe(1); // 행정동 1건만
    expect(result.issues.some((i) => i.severity === "info")).toBe(true); // 말소 info
  });

  it("meta — source / sourcePolicyStatus / license / collectedAt 보존", () => {
    const result = ingestKikcdH({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.meta.source).toBe("real:kikcd-h");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
    expect(result.meta.license).toBe("unknown");
    expect(result.meta.collectedAt).toBe(COLLECTED_AT);
  });

  it("meta — hjdRecordCount / issueCount는 실제 array length와 일치", () => {
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "1111051500",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운효자동",
        "생성일자": "20081101",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.meta.hjdRecordCount).toBe(result.hjdRecords.length);
    expect(result.meta.issueCount).toBe(result.issues.length);
  });

  it("collectedAt 미주입 → ISO 8601 형식 타임스탬프 자동 생성", () => {
    const result = ingestKikcdH({ text: HEADER });
    expect(result.meta.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("meta shape — 허용된 6개 key만 포함한다 (추가 필드 금지)", () => {
    // GREEN 단계 ingestKikcdH의 meta 반환 shape를 정확히 6개 key로 고정.
    // ingestKikcdB(7키)와 달리 admin records 산출 안 하므로 adminRecordCount 부재.
    const result = ingestKikcdH({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(Object.keys(result.meta).sort()).toEqual([
      "collectedAt",
      "hjdRecordCount",
      "issueCount",
      "license",
      "source",
      "sourcePolicyStatus",
    ]);
  });

  it("KIKcd_H 헤더 구조 호환성 — 6개 컬럼 헤더 + 정상 데이터 행 (다른 시도)", () => {
    // 실 KIKcd_H는 폭이 더 넓지만 컬럼 순서·키는 동일.
    // mini fixture의 시군구명 width=10 제약 안에 들어가는 짧은 이름 사용
    // (실 데이터에서는 "수원시 장안구"처럼 공백 포함 시군구명도 정상 처리됨).
    const text = [
      HEADER,
      buildRow({
        "행정동코드": "4111153500",
        "시도명": "경기도",
        "시군구명": "장안구",
        "읍면동명": "파장동",
        "생성일자": "20030301",
      }),
    ].join("\n");
    const result = ingestKikcdH({ text, collectedAt: COLLECTED_AT });
    expect(result.hjdRecords.length).toBe(1);
    expect(result.hjdRecords[0].regionCode).toBe("4111153500");
    expect(result.hjdRecords[0].sidoCode).toBe("41");
    expect(result.hjdRecords[0].sigunguCode).toBe("41111");
    expect(result.hjdRecords[0].hjdName).toBe("파장동");
  });
});
