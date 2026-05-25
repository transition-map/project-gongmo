/**
 * ingestLegalDongCodes.test.ts — 11-2 1차-2 법정동 10자리 코드 CSV ingest 단위 테스트.
 *
 * **stage 산출물 폴더에 쓰지 않는다.** ingestLegalDongCodes는 pure function이므로
 * data/clean·data/master·data/mart·data/indicator 어디에도 영향을 주지 않는다.
 *
 * 입력 fixture: data/fixtures/G_legal_dong_codes_mini.csv (6 데이터 행: 정상 5 + 폐지 1)
 * - ingest 함수 자체는 fs 의존 0건이므로 본 테스트가 fs.readFileSync로 fixture를
 *   읽어 csvText를 만든 뒤 함수에 주입한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanLegalDongCodes } from "../clean/cleanLegalDongCodes";
import {
  ingestLegalDongCodes,
  type RawLegalDongRecord,
} from "../ingest/ingestLegalDongCodes";

const FIXTURE_PATH = join("data", "fixtures", "G_legal_dong_codes_mini.csv");
const FIXED_COLLECTED_AT = "2026-05-12T00:00:00+09:00";

function loadMiniCsv(): string {
  return readFileSync(FIXTURE_PATH, "utf-8");
}

describe("ingestLegalDongCodes — mini fixture", () => {
  it("정상 5행 + 폐지 1행 CSV에서 records 5건 생성", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBe(5);
  });

  it("폐지 코드 1199999900은 records에서 제외", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(
      result.records.find((r) => r.regionCode === "1199999900"),
    ).toBeUndefined();
  });

  it("폐지 행은 DataQualityIssue로 기록 (severity=info, field=abolished, datasetCategory=G)", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    const abolishedIssue = result.issues.find(
      (i) => i.field === "abolished" && i.severity === "info",
    );
    expect(abolishedIssue).toBeDefined();
    expect(abolishedIssue?.datasetCategory).toBe("G");
    expect(abolishedIssue?.message).toContain("1199999900");
  });

  it("모든 record의 regionCode가 10자리 숫자", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(/^\d{10}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("모든 record의 regionCodeType이 'legalDong'", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(r.regionCodeType).toBe("legalDong");
    }
  });

  it("모든 record의 sidoCode가 2자리", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(/^\d{2}$/.test(r.sidoCode)).toBe(true);
    }
  });

  it("모든 record의 sigunguCode가 5자리", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(/^\d{5}$/.test(r.sigunguCode)).toBe(true);
    }
  });

  it("모든 record의 sigunguCode === regionCode.slice(0, 5)", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(r.sigunguCode).toBe(r.regionCode.slice(0, 5));
      expect(r.sidoCode).toBe(r.regionCode.slice(0, 2));
      expect(r.legalDongCode).toBe(r.regionCode);
    }
  });

  it("한국어 시도명/시군구명/읍면동명 보존", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    const yeoksam = result.records.find((r) => r.regionCode === "1168010100");
    expect(yeoksam).toBeDefined();
    expect(yeoksam?.sidoName).toBe("서울특별시");
    expect(yeoksam?.sigunguName).toBe("강남구");
    expect(yeoksam?.emdName).toBe("역삼동");
  });

  it("BOM(\\ufeff)으로 시작하는 CSV도 정상 파싱", () => {
    const bomCsv = "﻿" + loadMiniCsv();
    const result = ingestLegalDongCodes({
      csvText: bomCsv,
      collectedAt: FIXED_COLLECTED_AT,
    });
    // BOM이 헤더 첫 셀에 묻어 들어가 헤더 검증을 깨뜨리지 않아야 함
    expect(result.records.length).toBe(5);
    expect(result.records[0].sidoName).toBe("서울특별시");
  });

  it("빈 CSV 입력은 records=[], issues=[]로 처리하고 throw 안 함", () => {
    const result = ingestLegalDongCodes({
      csvText: "",
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.meta.recordCount).toBe(0);
    expect(result.meta.issueCount).toBe(0);
  });

  it("필수 헤더 누락 CSV는 명시적 Error throw", () => {
    const brokenCsv =
      "법정동코드,시도명,시군구명,읍면동명\n1168010100,서울특별시,강남구,역삼동";
    expect(() =>
      ingestLegalDongCodes({
        csvText: brokenCsv,
        collectedAt: FIXED_COLLECTED_AT,
      }),
    ).toThrow(/필수 헤더.*폐지여부.*누락/);
  });

  it("ingest 결과를 cleanLegalDongCodes에 직접 전달해 호환성 검증", () => {
    const ingested = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    const cleaned = cleanLegalDongCodes(ingested.records);
    // 모든 ingest record(5건)가 cleaner의 10자리 게이트를 통과해야 함
    expect(cleaned.records.length).toBe(ingested.records.length);
    // ingest가 폐지 + 형식 위반을 미리 걸렀으므로 cleaner의 추가 issue는 0건
    expect(cleaned.issues.length).toBe(0);
  });

  it("collectedAt 주입 시 meta.collectedAt이 결정적으로 반영", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.meta.collectedAt).toBe(FIXED_COLLECTED_AT);
    expect(result.meta.source).toBe("demo:legal-dong-mini");
    expect(result.meta.license).toBe("demo-only");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
  });

  it("records가 RawLegalDongRecord 형태를 충족 (필드 모두 존재)", () => {
    const result = ingestLegalDongCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      const rec: RawLegalDongRecord = r;
      expect(rec.regionCode.length).toBe(10);
      expect(rec.regionCodeType).toBe("legalDong");
      expect(rec.sidoCode.length).toBe(2);
      expect(rec.sigunguCode.length).toBe(5);
      expect(rec.legalDongCode.length).toBe(10);
      expect(rec.sidoName.length).toBeGreaterThan(0);
      expect(rec.sigunguName.length).toBeGreaterThan(0);
      expect(rec.emdName.length).toBeGreaterThan(0);
    }
  });
});
