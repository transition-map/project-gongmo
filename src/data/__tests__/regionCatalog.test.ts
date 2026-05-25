/**
 * 11-3 1차-89 — regionCatalog schema-only 회귀 보호.
 *
 * 17 시도 skeleton + readinessStatus(dataReady / partial / codeOnly / unavailable)
 * 4종 union 정착. UI 통합 (StudentProfile / Dashboard / RegionalAnalysis) 무수정 단계.
 *
 * 핵심 회귀 보호:
 * - 17 시도 모두 등록
 * - sidoCode / sidoName / readinessStatus 필수 보유
 * - sidoCode unique
 * - readinessStatus 4종 union 외 값 금지
 * - **모든 시도를 dataReady로 표시하지 않음** (실 데이터 부재 정직성)
 * - codeOnly 항목은 description 보유
 * - "전국 실데이터 분석 완료" / "완전 실데이터 대시보드 전환" 등 금지 표현 0건
 * - 실제 없는 지표를 0으로 채우지 않음 (gapIndex / trendRisk 등 fake numeric 필드 0건)
 */

import { describe, expect, it } from "vitest";
import {
  REGION_CATALOG,
  type RegionCatalogEntry,
  type RegionReadinessStatus,
} from "../regionCatalog";
import * as regionCatalogModule from "../regionCatalog";
// Vite ?raw import — 소스 파일을 문자열로 로드. node:fs / __dirname 미사용
// (tsconfig.app.json의 vite/client 환경 일관).
import REGION_CATALOG_SOURCE from "../regionCatalog.ts?raw";

describe("regionCatalog — 17 시도 skeleton", () => {
  it("17개 시도가 등록되어 있다", () => {
    expect(REGION_CATALOG).toHaveLength(17);
  });

  it("각 항목에 sidoCode / sidoName / readinessStatus 필수 보유", () => {
    for (const entry of REGION_CATALOG) {
      expect(entry.sidoCode).toBeTruthy();
      expect(entry.sidoName).toBeTruthy();
      expect(entry.readinessStatus).toBeTruthy();
    }
  });

  it("sidoCode는 2자리 숫자 문자열", () => {
    for (const entry of REGION_CATALOG) {
      expect(entry.sidoCode).toMatch(/^\d{2}$/);
    }
  });

  it("sidoCode는 unique", () => {
    const codes = REGION_CATALOG.map((e) => e.sidoCode);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("필수 시도 sidoCode가 포함된다 (서울 11 / 부산 26 / 경기 41)", () => {
    const codes = REGION_CATALOG.map((e) => e.sidoCode);
    expect(codes).toContain("11");
    expect(codes).toContain("26");
    expect(codes).toContain("41");
  });
});

describe("regionCatalog — readinessStatus 정책", () => {
  it("readinessStatus는 4종 union 외 값을 가질 수 없다", () => {
    const allowed: RegionReadinessStatus[] = [
      "dataReady",
      "partial",
      "codeOnly",
      "unavailable",
    ];
    for (const entry of REGION_CATALOG) {
      expect(allowed).toContain(entry.readinessStatus);
    }
  });

  it("모든 시도를 dataReady로 표시하지 않는다 (실 데이터 부재 정직성)", () => {
    const allDataReady = REGION_CATALOG.every(
      (e) => e.readinessStatus === "dataReady",
    );
    expect(allDataReady).toBe(false);
  });

  it("codeOnly 항목은 description 보유", () => {
    const codeOnlyEntries = REGION_CATALOG.filter(
      (e) => e.readinessStatus === "codeOnly",
    );
    // codeOnly 항목이 적어도 1개는 존재해야 정책 의미 있음
    expect(codeOnlyEntries.length).toBeGreaterThan(0);
    for (const entry of codeOnlyEntries) {
      expect(entry.description).toBeTruthy();
      expect(typeof entry.description).toBe("string");
    }
  });

  it("partial 항목은 description 보유 (있을 때만)", () => {
    const partialEntries = REGION_CATALOG.filter(
      (e) => e.readinessStatus === "partial",
    );
    for (const entry of partialEntries) {
      expect(entry.description).toBeTruthy();
    }
  });
});

describe("regionCatalog — 금지 표현 회귀", () => {
  it("'전국 실데이터 분석 완료' 표현이 없다", () => {
    expect(REGION_CATALOG_SOURCE).not.toMatch(/전국\s*실데이터\s*분석\s*완료/);
    for (const entry of REGION_CATALOG) {
      if (entry.description) {
        expect(entry.description).not.toMatch(/전국\s*실데이터\s*분석\s*완료/);
      }
    }
  });

  it("'완전 실데이터 대시보드 전환' 표현이 없다", () => {
    expect(REGION_CATALOG_SOURCE).not.toMatch(
      /완전\s*실데이터\s*대시보드\s*전환/,
    );
  });

  it("'NEIS API 연결 완료' / '실제 API 호출 완료' / '실데이터 수집 완료' 표현이 없다", () => {
    expect(REGION_CATALOG_SOURCE).not.toMatch(/NEIS\s*API\s*연결\s*완료/);
    expect(REGION_CATALOG_SOURCE).not.toMatch(/실제\s*API\s*호출\s*완료/);
    expect(REGION_CATALOG_SOURCE).not.toMatch(/실데이터\s*수집\s*완료/);
  });
});

describe("regionCatalog — 실제 없는 지표 0 채우기 회귀", () => {
  it("RegionCatalogEntry sample에 gapIndex / trendRisk / currentGapIndex 등 fake numeric 필드 0건", () => {
    const sample: RegionCatalogEntry = {
      sidoCode: "11",
      sidoName: "서울특별시",
      readinessStatus: "partial",
      description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능",
    };
    const keys = Object.keys(sample);
    const forbiddenNumericKeys = [
      "gapIndex",
      "trendRisk",
      "currentGapIndex",
      "transitionGapIndex",
      "schoolCount",
      "studentCount",
    ];
    for (const forbidden of forbiddenNumericKeys) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("regionCatalog.ts 소스에 hardcoded numeric indicator 0으로 채운 흔적이 없다", () => {
    // "currentGapIndex: 0" 같은 패턴 차단
    expect(REGION_CATALOG_SOURCE).not.toMatch(/currentGapIndex\s*:\s*0/);
    expect(REGION_CATALOG_SOURCE).not.toMatch(/transitionGapIndex\s*:\s*0/);
    expect(REGION_CATALOG_SOURCE).not.toMatch(/trendRisk(?:Score)?\s*:\s*0/);
  });

  it("실제 카운트·지표 필드가 schema에 없다 (codeOnly 정직성)", () => {
    // type 선언에 schoolCount / studentCount 등이 등장하지 않도록
    expect(REGION_CATALOG_SOURCE).not.toMatch(/\bschoolCount\s*[?:]/);
    expect(REGION_CATALOG_SOURCE).not.toMatch(/\bstudentCount\s*[?:]/);
    expect(REGION_CATALOG_SOURCE).not.toMatch(/\bcurrentGapIndex\s*[?:]/);
  });
});

describe("regionCatalog — read-only helper 정책", () => {
  it("자동 추천 / 정책 결정 helper export 0건", () => {
    const forbiddenExports = [
      "autoSelectRegion",
      "recommendRegion",
      "decidePolicy",
      "forceRegion",
    ];
    const exported = Object.keys(regionCatalogModule);
    for (const forbidden of forbiddenExports) {
      expect(exported).not.toContain(forbidden);
    }
  });

  it("read-only lookup helper getRegionCatalogEntry export 보유", () => {
    expect(typeof regionCatalogModule.getRegionCatalogEntry).toBe("function");
  });

  it("getRegionCatalogEntry는 exact sidoCode 매칭만 수행", () => {
    const seoul = regionCatalogModule.getRegionCatalogEntry("11");
    expect(seoul).toBeDefined();
    expect(seoul?.sidoCode).toBe("11");
    const miss = regionCatalogModule.getRegionCatalogEntry("99");
    expect(miss).toBeUndefined();
  });
});
