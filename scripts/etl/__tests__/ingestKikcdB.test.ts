/**
 * ingestKikcdB.test.ts — 11-2 1차-15 KIKcd_B 통합 ingest RED 테스트.
 *
 * KIKcd_B(법정동코드 10자리 fixed-width 텍스트) 한 파일에서 다음 2가지 record를
 * 동시에 산출한다:
 *   1. legalDongRecords — 진정 법정동 단위(읍면동·리). RawLegalDongRecord shape.
 *   2. adminRecords    — 시군구 5자리 단위 (KIKcd_B에서 파생). RawAdminCodeRecord shape.
 *
 * **분류 정책 (1차-15)**:
 *   - 시도 행 (코드 endsWith "00000000") → 둘 다 제외 (시도 단위는 본 범위 외).
 *   - 시군구 행 (endsWith "00000" + 시군구명 != "" + 읍면동명 == "")
 *       → adminRecords 1건 (regionCode = code.slice(0, 5)).
 *       → legalDongRecords 제외 (legalDong은 읍면동/리 단위만).
 *   - 읍면동/리 행 (그 외 유효 10자리 코드) → legalDongRecords 1건.
 *   - 말소 행 (말소일자 8자리 날짜 != "") → 둘 다 제외 + info issue.
 *   - 형식 위반 행 (10자리 아님) → 둘 다 제외 + warning issue.
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/ingest/ingestKikcdB.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 * - 실제 data/raw/G/jscode20260325/.../KIKcd_B.20260325는 본 테스트에서 참조 0건.
 * - CP949 디코드 책임은 호출자 — 본 함수는 이미 UTF-8 string으로 디코드된 text를 받는다.
 * - fixed-width row 구성은 인라인 helper `padDisplay`로 헤더와 동일 컬럼 폭으로 작성.
 */

import { describe, expect, it } from "vitest";
import { ingestKikcdB } from "../ingest/ingestKikcdB";

// 인라인 helper — 한글 1글자=2, 그 외=1 display width 패딩
function padDisplay(value: string, targetWidth: number): string {
  let w = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp >= 0xac00 && cp <= 0xd7a3) w += 2;
    else w += 1;
  }
  return value + " ".repeat(Math.max(0, targetWidth - w));
}

// KIKcd_B mini fixture 컬럼 정의 — 실 행안부 KIKcd_B와 동일 컬럼·순서, 폭만 축소.
const COLUMNS = [
  { key: "법정동코드", width: 10 },
  { key: "시도명", width: 14 },
  { key: "시군구명", width: 10 },
  { key: "읍면동명", width: 10 },
  { key: "동리명", width: 10 },
  { key: "생성일자", width: 8 },
  { key: "말소일자", width: 8 },
] as const;

const HEADER = COLUMNS.map((c) => padDisplay(c.key, c.width)).join(" ");

function buildRow(values: Record<string, string>): string {
  return COLUMNS.map((c) => padDisplay(values[c.key] ?? "", c.width)).join(" ");
}

const COLLECTED_AT = "2026-05-15T00:00:00+09:00";

describe("ingestKikcdB (11-2 1차-15)", () => {
  it("빈 입력 → legalDong=[], admin=[], issues=[]", () => {
    const result = ingestKikcdB({ text: "", collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords).toEqual([]);
    expect(result.adminRecords).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("헤더만 + 데이터 0행 → legalDong=[], admin=[]", () => {
    const result = ingestKikcdB({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords).toEqual([]);
    expect(result.adminRecords).toEqual([]);
  });

  it("시도 행 (1100000000 서울특별시) → legalDong=[], admin=[] (둘 다 제외)", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1100000000",
        "시도명": "서울특별시",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords).toEqual([]);
    expect(result.adminRecords).toEqual([]);
  });

  it("시군구 행 (1111000000 종로구) → adminRecords 1건, legalDong=[]", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1111000000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.adminRecords.length).toBe(1);
    expect(result.adminRecords[0].regionCode).toBe("11110");
    expect(result.adminRecords[0].regionCodeType).toBe("sigungu");
    expect(result.adminRecords[0].sidoCode).toBe("11");
    expect(result.adminRecords[0].sigunguCode).toBe("11110");
    expect(result.adminRecords[0].sidoName).toBe("서울특별시");
    expect(result.adminRecords[0].sigunguName).toBe("종로구");
    expect(result.legalDongRecords).toEqual([]);
  });

  it("읍면동 행 (1111010100 청운동) → legalDongRecords 1건, admin=[]", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1111010100",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운동",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords.length).toBe(1);
    expect(result.legalDongRecords[0].regionCode).toBe("1111010100");
    expect(result.legalDongRecords[0].regionCodeType).toBe("legalDong");
    expect(result.legalDongRecords[0].legalDongCode).toBe("1111010100");
    expect(result.legalDongRecords[0].sidoCode).toBe("11");
    expect(result.legalDongRecords[0].sigunguCode).toBe("11110");
    expect(result.legalDongRecords[0].sidoName).toBe("서울특별시");
    expect(result.legalDongRecords[0].sigunguName).toBe("종로구");
    expect(result.legalDongRecords[0].emdName).toBe("청운동");
    expect(result.adminRecords).toEqual([]);
  });

  it("리 행 (1111010101 청운리) → legalDongRecords 1건", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1111010101",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운동",
        "동리명": "청운리",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords.length).toBe(1);
    expect(result.legalDongRecords[0].regionCode).toBe("1111010101");
  });

  it("말소 행 (말소일자=20100101) → 둘 다 제외 + info issue", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1111010200",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "신교동",
        "생성일자": "19880423",
        "말소일자": "20100101",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords).toEqual([]);
    expect(result.adminRecords).toEqual([]);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.severity === "info")).toBe(true);
  });

  it("형식 위반 (10자리 미만) → 둘 다 제외 + warning issue", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "111101",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운동",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.legalDongRecords).toEqual([]);
    expect(result.adminRecords).toEqual([]);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("mixed input — 시도/시군구/읍면동/리/말소 5행 → 정확한 분리", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1100000000",
        "시도명": "서울특별시",
        "생성일자": "19880423",
      }),
      buildRow({
        "법정동코드": "1111000000",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "생성일자": "19880423",
      }),
      buildRow({
        "법정동코드": "1111010100",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운동",
        "생성일자": "19880423",
      }),
      buildRow({
        "법정동코드": "1111010101",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운동",
        "동리명": "청운리",
        "생성일자": "19880423",
      }),
      buildRow({
        "법정동코드": "1111010200",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "신교동",
        "생성일자": "19880423",
        "말소일자": "20100101",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.adminRecords.length).toBe(1); // 시군구 행 1건
    expect(result.legalDongRecords.length).toBe(2); // 읍면동 + 리
    expect(result.issues.some((i) => i.severity === "info")).toBe(true); // 말소 info
  });

  it("meta — source / sourcePolicyStatus / license / collectedAt 보존", () => {
    const result = ingestKikcdB({ text: HEADER, collectedAt: COLLECTED_AT });
    expect(result.meta.source).toBe("real:kikcd-b");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
    expect(result.meta.license).toBe("unknown");
    expect(result.meta.collectedAt).toBe(COLLECTED_AT);
  });

  it("meta — recordCount / issueCount는 실제 array length와 일치", () => {
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "1111010100",
        "시도명": "서울특별시",
        "시군구명": "종로구",
        "읍면동명": "청운동",
        "생성일자": "19880423",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.meta.legalDongRecordCount).toBe(
      result.legalDongRecords.length,
    );
    expect(result.meta.adminRecordCount).toBe(result.adminRecords.length);
    expect(result.meta.issueCount).toBe(result.issues.length);
  });

  it("collectedAt 미주입 → ISO 8601 형식 타임스탬프 자동 생성", () => {
    const result = ingestKikcdB({ text: HEADER });
    expect(result.meta.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("meta shape — 허용된 7개 key만 포함한다 (추가 필드 금지)", () => {
    // GREEN 단계 ingestKikcdB의 meta 반환 shape를 정확히 7개 key로 고정.
    // 1차-1 ingestRegionCodes의 `originalSource` 같은 추가 필드는 본 ingest에서는 허용하지 않음 —
    // meta shape의 명시적 single source of truth는 본 테스트.
    const result = ingestKikcdB({ text: HEADER, collectedAt: COLLECTED_AT });

    expect(Object.keys(result.meta).sort()).toEqual([
      "adminRecordCount",
      "collectedAt",
      "issueCount",
      "legalDongRecordCount",
      "license",
      "source",
      "sourcePolicyStatus",
    ]);
  });

  it("원본 KIKcd_B 헤더 구조 호환성 — 7개 컬럼 헤더 + 정상 데이터 행을 그대로 처리", () => {
    // 실 KIKcd_B는 폭이 더 넓지만 컬럼 순서·키는 동일.
    // mini fixture (위 COLUMNS)로 검증 — 동일 동적 헤더 검출 경로를 거치므로 본 케이스가
    // 통과하면 실 KIKcd_B에서도 동일 로직이 작동할 것으로 기대 (단, 실 파일 검증은 Step H).
    const text = [
      HEADER,
      buildRow({
        "법정동코드": "4100000000",
        "시도명": "경기도",
        "생성일자": "19880423",
      }),
      buildRow({
        "법정동코드": "4111100000",
        "시도명": "경기도",
        "시군구명": "장안구",
        "생성일자": "20030301",
      }),
    ].join("\n");
    const result = ingestKikcdB({ text, collectedAt: COLLECTED_AT });
    expect(result.adminRecords.length).toBe(1);
    expect(result.adminRecords[0].regionCode).toBe("41111");
    expect(result.adminRecords[0].sigunguName).toBe("장안구");
  });
});
