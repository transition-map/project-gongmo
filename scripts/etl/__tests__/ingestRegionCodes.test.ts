/**
 * ingestRegionCodes.test.ts — 11-2 1차-1 행정구역 시군구 CSV ingest 단위 테스트.
 *
 * **stage 산출물 폴더에 쓰지 않는다.** ingestRegionCodes는 pure function이므로
 * data/clean·data/master·data/mart·data/indicator 어디에도 영향을 주지 않는다.
 *
 * 입력 fixture: data/fixtures/G_admin_codes_mini.csv (6 데이터 행: 정상 5 + 폐지 1)
 * - ingest 함수 자체는 fs 의존 0건이므로 본 테스트가 fs.readFileSync로 fixture를
 *   읽어 csvText를 만든 뒤 함수에 주입한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanRegionCodes } from "../clean/cleanRegionCodes";
import {
  ingestRegionCodes,
  type RawAdminCodeRecord,
} from "../ingest/ingestRegionCodes";

const FIXTURE_PATH = join("data", "fixtures", "G_admin_codes_mini.csv");
const FIXED_COLLECTED_AT = "2026-05-12T00:00:00+09:00";

function loadMiniCsv(): string {
  return readFileSync(FIXTURE_PATH, "utf-8");
}

describe("ingestRegionCodes — mini fixture", () => {
  it("정상 5행 + 폐지 1행 CSV에서 records 5건 생성", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBe(5);
  });

  it("폐지 코드 11999는 records에서 제외", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(
      result.records.find((r) => r.regionCode === "11999"),
    ).toBeUndefined();
  });

  it("폐지 행은 DataQualityIssue로 기록 (severity=info, field=abolished)", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    const abolishedIssue = result.issues.find(
      (i) => i.field === "abolished" && i.severity === "info",
    );
    expect(abolishedIssue).toBeDefined();
    expect(abolishedIssue?.datasetCategory).toBe("G");
    expect(abolishedIssue?.message).toContain("11999");
  });

  it("모든 record의 regionCode가 5자리 숫자", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("모든 record의 regionCodeType이 'sigungu'", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      expect(r.regionCodeType).toBe("sigungu");
    }
  });

  it("한국어 시도명/시군구명 보존", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam).toBeDefined();
    expect(gangnam?.sidoName).toBe("서울특별시");
    expect(gangnam?.sigunguName).toBe("강남구");
  });

  it("BOM(\\ufeff)으로 시작하는 CSV도 정상 파싱", () => {
    const bomCsv = "﻿" + loadMiniCsv();
    const result = ingestRegionCodes({
      csvText: bomCsv,
      collectedAt: FIXED_COLLECTED_AT,
    });
    // BOM이 헤더 첫 셀에 묻어 들어가 헤더 검증을 깨뜨리지 않아야 함
    expect(result.records.length).toBe(5);
    expect(result.records[0].sidoName).toBe("서울특별시");
  });

  it("빈 CSV 입력은 records=[], issues=[]로 처리하고 throw 안 함", () => {
    const result = ingestRegionCodes({
      csvText: "",
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.meta.recordCount).toBe(0);
    expect(result.meta.issueCount).toBe(0);
  });

  it("필수 헤더 누락 CSV는 명시적 Error throw", () => {
    const brokenCsv = "시도코드,시도명,시군구코드,시군구명\n11,서울,11680,강남구";
    expect(() =>
      ingestRegionCodes({
        csvText: brokenCsv,
        collectedAt: FIXED_COLLECTED_AT,
      }),
    ).toThrow(/필수 헤더.*폐지여부.*누락/);
  });

  it("ingest 결과를 cleanRegionCodes에 직접 전달해 호환성 검증", () => {
    const ingested = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    const cleaned = cleanRegionCodes(ingested.records);
    // 모든 ingest record(5건)가 cleaner의 5자리 게이트를 통과해야 함
    expect(cleaned.records.length).toBe(ingested.records.length);
    // ingest가 폐지 + 형식 위반을 미리 걸렀으므로 cleaner의 추가 issue는 0건
    expect(cleaned.issues.length).toBe(0);
  });

  it("collectedAt 주입 시 meta.collectedAt이 결정적으로 반영", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.meta.collectedAt).toBe(FIXED_COLLECTED_AT);
    expect(result.meta.source).toBe("demo:admin-code-mini");
    expect(result.meta.license).toBe("demo-only");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
  });

  it("records가 RawAdminCodeRecord 형태를 충족 (필드 모두 존재)", () => {
    const result = ingestRegionCodes({
      csvText: loadMiniCsv(),
      collectedAt: FIXED_COLLECTED_AT,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      const rec: RawAdminCodeRecord = r;
      expect(rec.regionCode).toBeDefined();
      expect(rec.regionCodeType).toBe("sigungu");
      expect(rec.sidoCode.length).toBeGreaterThan(0);
      expect(rec.sidoName.length).toBeGreaterThan(0);
      expect(rec.sigunguCode).toBe(rec.regionCode);
      expect(rec.sigunguName.length).toBeGreaterThan(0);
    }
  });
});
