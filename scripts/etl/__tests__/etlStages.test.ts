/**
 * etlStages.test.ts — fixture 기반 ETL 산출물 통합 테스트.
 *
 * **stage 산출물 폴더(data/clean·data/master·data/mart·data/indicator)에 쓰는 유일한
 * 테스트 파일이다.** Vitest는 테스트 파일을 병렬 실행할 수 있어 여러 테스트가 같은
 * 산출물 경로에 동시 쓰면 flaky 위험이 있다. master.test.ts / mart.test.ts /
 * indicator.test.ts는 in-memory pure function 테스트만 수행하고, 실제 stage 실행과
 * 파일 산출물 검증은 본 파일이 단독으로 담당한다.
 *
 * **자체 준비** (beforeAll): `--stage all` 1회 실행으로 4단계 산출물 모두 생성.
 *   `tsx scripts/etl/runEtl.ts --mode fixture --stage all`
 *
 * 11-1 2차 5차 변경: 이전에는 clean/master/mart/indicator 4회 child_process를 spawn했으나,
 * --stage all 도입 후 단일 child_process로 통합. 부수 효과로 beforeAll 시간 단축.
 *
 * 모든 stage는 mockAdapter / fixture 기반 — 외부 네트워크 / API key 사용 0건.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { readJson } from "../io/readJson";
import { runEtlStage } from "./testEtlCommands";

const CLEAN_DIR = "data/clean";
const MASTER_DIR = "data/master";
const MART_DIR = "data/mart";
const INDICATOR_DIR = "data/indicator";

const CLEAN_PATHS = {
  regionCodes: join(CLEAN_DIR, "G", "region_codes.clean.json"),
  geocoding: join(CLEAN_DIR, "G", "geocoding.clean.json"),
  specialEducation: join(CLEAN_DIR, "A", "special_education.clean.json"),
  disabledPopulation: join(CLEAN_DIR, "A", "disabled_population.clean.json"),
  schoolBasic: join(CLEAN_DIR, "B", "school_basic.clean.json"),
  supportCenter: join(CLEAN_DIR, "B", "support_center.clean.json"),
  // 11-2 1차-3 신규 — CSV ingest 결과 clean 산출물
  adminCodes: join(CLEAN_DIR, "G", "admin_codes.clean.json"),
  legalDongCodes: join(CLEAN_DIR, "G", "legal_dong_codes.clean.json"),
} as const;

const MASTER_PATHS = {
  region: join(MASTER_DIR, "region_master.json"),
  demand: join(MASTER_DIR, "demand_master.json"),
  school: join(MASTER_DIR, "school_master.json"),
  supportCenter: join(MASTER_DIR, "support_center_master.json"),
  // 11-2 1차-4 신규 — legalDong dimension master
  legalDong: join(MASTER_DIR, "legal_dong_master.json"),
  // 11-2 1차-5 신규 — adminCode dimension master
  adminCode: join(MASTER_DIR, "admin_code_master.json"),
  // 11-2 1차-7 신규 — admin × legalDong cross-reference master
  crossref: join(MASTER_DIR, "admin_legal_dong_crossref.json"),
} as const;

const MART_OUTPUT_PATH = join(MART_DIR, "region_summary_mart.json");
const INDICATOR_OUTPUT_PATH = join(INDICATOR_DIR, "transition_index_fixture.json");

beforeAll(() => {
  // --stage all 1회 실행으로 clean → master → mart → indicator 순차 처리.
  // 단일 child_process라 4회 spawn보다 가볍고, --stage all 동작도 함께 검증된다.
  // mockAdapter / fixture 기반이므로 외부 네트워크 / API key 사용 0건.
  runEtlStage("all");
}, 120_000);

// ─── clean 산출물 ──────────────────────────────────────────────────────────
describe("--stage clean 산출물", () => {
  it("data/clean 8개 파일이 모두 존재", () => {
    // 6개 JSON fixture 기반 + 2개 CSV ingest 기반 = 8개 (11-2 1차-3 통합)
    expect(existsSync(CLEAN_PATHS.regionCodes)).toBe(true);
    expect(existsSync(CLEAN_PATHS.geocoding)).toBe(true);
    expect(existsSync(CLEAN_PATHS.specialEducation)).toBe(true);
    expect(existsSync(CLEAN_PATHS.disabledPopulation)).toBe(true);
    expect(existsSync(CLEAN_PATHS.schoolBasic)).toBe(true);
    expect(existsSync(CLEAN_PATHS.supportCenter)).toBe(true);
    expect(existsSync(CLEAN_PATHS.adminCodes)).toBe(true);
    expect(existsSync(CLEAN_PATHS.legalDongCodes)).toBe(true);
  });

  it("각 clean 파일의 _meta.stage='clean', recordCount/issueCount 일치", () => {
    for (const path of Object.values(CLEAN_PATHS)) {
      const content = readJson<{
        _meta: {
          stage: string;
          source: string;
          recordCount: number;
          issueCount: number;
        };
        records: unknown[];
        issues: unknown[];
      }>(path);
      expect(content._meta.stage).toBe("clean");
      expect(content._meta.source).toBe("demo");
      expect(content._meta.recordCount).toBe(content.records.length);
      expect(content._meta.issueCount).toBe(content.issues.length);
    }
  });
});

// ─── master 산출물 ────────────────────────────────────────────────────────
describe("--stage master 산출물", () => {
  it("data/master 7개 파일이 모두 존재", () => {
    // 4개 기존 도메인 master + legalDong (1차-4) + adminCode (1차-5) +
    // adminLegalDongCrossref (1차-7) dimension/artifact
    expect(existsSync(MASTER_PATHS.region)).toBe(true);
    expect(existsSync(MASTER_PATHS.demand)).toBe(true);
    expect(existsSync(MASTER_PATHS.school)).toBe(true);
    expect(existsSync(MASTER_PATHS.supportCenter)).toBe(true);
    expect(existsSync(MASTER_PATHS.legalDong)).toBe(true);
    expect(existsSync(MASTER_PATHS.adminCode)).toBe(true);
    expect(existsSync(MASTER_PATHS.crossref)).toBe(true);
  });

  it("각 master 파일의 _meta.stage='master', source='demo:fixture-etl'", () => {
    for (const path of Object.values(MASTER_PATHS)) {
      const content = readJson<{
        _meta: {
          stage: string;
          source: string;
          datasetCategory: string;
          recordCount: number;
          issueCount: number;
          generatedAt: string;
        };
        records: unknown[];
        issues: unknown[];
      }>(path);
      expect(content._meta.stage).toBe("master");
      expect(content._meta.source).toBe("demo:fixture-etl");
      expect(content._meta.recordCount).toBe(content.records.length);
      expect(content._meta.issueCount).toBe(content.issues.length);
    }
  });

  it("datasetCategory가 정확히 매핑됨 (G/A/B/B/G/G/G)", () => {
    const expected: Array<[string, string]> = [
      [MASTER_PATHS.region, "G"],
      [MASTER_PATHS.demand, "A"],
      [MASTER_PATHS.school, "B"],
      [MASTER_PATHS.supportCenter, "B"],
      [MASTER_PATHS.legalDong, "G"],
      [MASTER_PATHS.adminCode, "G"],
      [MASTER_PATHS.crossref, "G"],
    ];
    for (const [path, category] of expected) {
      const content = readJson<{ _meta: { datasetCategory: string } }>(path);
      expect(content._meta.datasetCategory).toBe(category);
    }
  });

  it("region_master.json: records=10 (JSON 6 + admin-union 4, 11-2 1차-9 Policy A)", () => {
    const content = readJson<{ records: { regionCode: string }[] }>(
      MASTER_PATHS.region,
    );
    expect(content.records.length).toBe(10);
    for (const r of content.records) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("demand_master.json: records=6, INVALID 미포함", () => {
    const content = readJson<{ records: { regionCode: string }[] }>(
      MASTER_PATHS.demand,
    );
    expect(content.records.length).toBe(6);
    expect(
      content.records.find((r) => r.regionCode === "INVALID"),
    ).toBeUndefined();
  });

  it("school_master.json: records=7 (빈 schoolName 차단 후)", () => {
    const content = readJson<{ records: unknown[] }>(MASTER_PATHS.school);
    expect(content.records.length).toBe(7);
  });

  it("support_center_master.json: records=3, issues=0 (정밀 분리 후)", () => {
    const content = readJson<{
      records: unknown[];
      issues: unknown[];
    }>(MASTER_PATHS.supportCenter);
    expect(content.records.length).toBe(3);
    expect(content.issues.length).toBe(0);
  });

  it("school_master.json: 모든 issue가 datasetCategory='B'", () => {
    const content = readJson<{
      issues: Array<{
        datasetCategory: string;
        field?: string;
        message: string;
      }>;
    }>(MASTER_PATHS.school);
    for (const issue of content.issues) {
      expect(issue.datasetCategory).toBe("B");
    }
    const hasSchoolIssue = content.issues.some(
      (i) =>
        i.field === "schoolName" ||
        (i.field === "regionCode" && i.message.includes("school")),
    );
    expect(hasSchoolIssue).toBe(true);
  });
});

// ─── mart 산출물 ──────────────────────────────────────────────────────────
describe("--stage mart 산출물", () => {
  it("data/mart/region_summary_mart.json이 존재", () => {
    expect(existsSync(MART_OUTPUT_PATH)).toBe(true);
  });

  it("_meta.stage='mart', source='demo:fixture-etl', datasetCategory='region-summary'", () => {
    const content = readJson<{
      _meta: {
        source: string;
        stage: string;
        datasetCategory: string;
      };
    }>(MART_OUTPUT_PATH);
    expect(content._meta.stage).toBe("mart");
    expect(content._meta.source).toBe("demo:fixture-etl");
    expect(content._meta.datasetCategory).toBe("region-summary");
  });

  it("_meta.partialFixture=true, missingDomains=['C','D','E','F']", () => {
    const content = readJson<{
      _meta: { partialFixture: boolean; missingDomains: string[] };
    }>(MART_OUTPUT_PATH);
    expect(content._meta.partialFixture).toBe(true);
    expect(content._meta.missingDomains).toEqual(["C", "D", "E", "F"]);
  });

  it("_meta.recordCount === records.length, issueCount === issues.length", () => {
    const content = readJson<{
      _meta: { recordCount: number; issueCount: number };
      records: unknown[];
      issues: unknown[];
    }>(MART_OUTPUT_PATH);
    expect(content._meta.recordCount).toBe(content.records.length);
    expect(content._meta.issueCount).toBe(content.issues.length);
  });

  it("records=10, 모든 regionCode가 5자리 숫자 (11-2 1차-9 Policy A)", () => {
    const content = readJson<{
      records: Array<{ regionCode: string }>;
    }>(MART_OUTPUT_PATH);
    expect(content.records.length).toBe(10);
    for (const r of content.records) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
    }
  });
});

// ─── indicator 산출물 ─────────────────────────────────────────────────────
describe("--stage indicator 산출물", () => {
  it("data/indicator/transition_index_fixture.json이 존재", () => {
    expect(existsSync(INDICATOR_OUTPUT_PATH)).toBe(true);
  });

  it("_meta.stage='indicator', source='demo:fixture-etl', indicatorVersion='mvp-v1'", () => {
    const content = readJson<{
      _meta: {
        source: string;
        stage: string;
        indicatorVersion: string;
      };
    }>(INDICATOR_OUTPUT_PATH);
    expect(content._meta.stage).toBe("indicator");
    expect(content._meta.source).toBe("demo:fixture-etl");
    expect(content._meta.indicatorVersion).toBe("mvp-v1");
  });

  it("_meta.partialFixture=true, missingDomains=['C','D','E','F'], baseYear=2026", () => {
    const content = readJson<{
      _meta: {
        partialFixture: boolean;
        missingDomains: string[];
        baseYear: number;
        calculatedAt: string;
      };
    }>(INDICATOR_OUTPUT_PATH);
    expect(content._meta.partialFixture).toBe(true);
    expect(content._meta.missingDomains).toEqual(["C", "D", "E", "F"]);
    expect(content._meta.baseYear).toBe(2026);
    expect(content._meta.calculatedAt).toBe("2026-05-11T00:00:00+09:00");
  });

  it("_meta.recordCount === records.length, issueCount === issues.length", () => {
    const content = readJson<{
      _meta: { recordCount: number; issueCount: number };
      records: unknown[];
      issues: unknown[];
    }>(INDICATOR_OUTPUT_PATH);
    expect(content._meta.recordCount).toBe(content.records.length);
    expect(content._meta.issueCount).toBe(content.issues.length);
  });

  it("records.length === 10 (11-2 1차-9 Policy A)", () => {
    const content = readJson<{ records: unknown[] }>(INDICATOR_OUTPUT_PATH);
    expect(content.records.length).toBe(10);
  });

  it("각 record의 transitionGapIndex가 0~100 범위", () => {
    const content = readJson<{
      records: Array<{
        indicators?: { transitionGapIndex?: number };
      }>;
    }>(INDICATOR_OUTPUT_PATH);
    expect(content.records.length).toBeGreaterThan(0);
    for (const r of content.records) {
      const v = r.indicators?.transitionGapIndex;
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

// ─── --stage clean CSV ingest 산출물 (11-2 1차-3) ──────────────────────────
//
// data/clean/G/admin_codes.clean.json (1차-1 시군구 CSV) / legal_dong_codes.clean.json
// (1차-2 법정동 CSV)이 runEtl의 CSV pipeline을 통해 정상 생성됐는지 검증한다.
// `runEtlStage("all")` 호출은 beforeAll 한 곳에서만 수행 — 산출물 폴더 동시 쓰기 방지
// 원칙(testEtlCommands.ts 참조)을 유지한다.

interface CleanFileForCsv<TRecord> {
  _meta: {
    source: string;
    datasetCategory: string;
    stage: string;
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: TRecord[];
  issues: Array<{
    severity: string;
    field?: string;
    message: string;
    datasetCategory?: string;
  }>;
}

interface AdminCodeRecord {
  regionCode: string;
  regionCodeType: string;
  sidoCode?: string;
  sigunguCode?: string;
}

interface LegalDongRecord {
  regionCode: string;
  regionCodeType: string;
  sidoCode?: string;
  sigunguCode?: string;
  legalDongCode?: string;
}

interface RegionMasterRecordForCsv {
  regionCode: string;
}

describe("--stage clean CSV ingest 산출물: admin_codes.clean.json", () => {
  it("파일이 존재", () => {
    expect(existsSync(CLEAN_PATHS.adminCodes)).toBe(true);
  });

  it("_meta.stage === 'clean'", () => {
    const content = readJson<CleanFileForCsv<AdminCodeRecord>>(
      CLEAN_PATHS.adminCodes,
    );
    expect(content._meta.stage).toBe("clean");
  });

  it("_meta.datasetCategory === 'G'", () => {
    const content = readJson<CleanFileForCsv<AdminCodeRecord>>(
      CLEAN_PATHS.adminCodes,
    );
    expect(content._meta.datasetCategory).toBe("G");
  });

  it("records.length === 5 (정상 5건, 폐지 1건 제외)", () => {
    const content = readJson<CleanFileForCsv<AdminCodeRecord>>(
      CLEAN_PATHS.adminCodes,
    );
    expect(content.records.length).toBe(5);
  });

  it("issues.length === 1 (ingest 폐지 info 1건)", () => {
    const content = readJson<CleanFileForCsv<AdminCodeRecord>>(
      CLEAN_PATHS.adminCodes,
    );
    expect(content.issues.length).toBe(1);
  });

  it("records에 폐지 코드 '11999' 없음", () => {
    const content = readJson<CleanFileForCsv<AdminCodeRecord>>(
      CLEAN_PATHS.adminCodes,
    );
    expect(
      content.records.find((r) => r.regionCode === "11999"),
    ).toBeUndefined();
  });
});

describe("--stage clean CSV ingest 산출물: legal_dong_codes.clean.json", () => {
  it("파일이 존재", () => {
    expect(existsSync(CLEAN_PATHS.legalDongCodes)).toBe(true);
  });

  it("_meta.stage === 'clean'", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(content._meta.stage).toBe("clean");
  });

  it("_meta.datasetCategory === 'G'", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(content._meta.datasetCategory).toBe("G");
  });

  it("records.length === 5 (정상 5건, 폐지 1건 제외)", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(content.records.length).toBe(5);
  });

  it("issues.length === 1 (ingest 폐지 info 1건)", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(content.issues.length).toBe(1);
  });

  it("records에 폐지 코드 '1199999900' 없음", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(
      content.records.find((r) => r.regionCode === "1199999900"),
    ).toBeUndefined();
  });

  it("모든 record의 regionCode가 10자리 숫자", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(content.records.length).toBeGreaterThan(0);
    for (const r of content.records) {
      expect(/^\d{10}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("모든 record의 sigunguCode === regionCode.slice(0, 5)", () => {
    const content = readJson<CleanFileForCsv<LegalDongRecord>>(
      CLEAN_PATHS.legalDongCodes,
    );
    expect(content.records.length).toBeGreaterThan(0);
    for (const r of content.records) {
      expect(r.sigunguCode).toBe(r.regionCode.slice(0, 5));
    }
  });
});

// ─── --stage master legal_dong_master.json (11-2 1차-4) ────────────────────
//
// legalDong 5건이 dimension master로 별도 출력되고, sigunguCode 매칭 품질이
// 검증되는지 확인한다. region_master는 무영향(아래 회귀 가드로 별도 확인).

interface MasterLegalDongFile {
  _meta: {
    source: string;
    stage: string;
    datasetCategory: string;
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: Array<{
    legalDongCode: string;
    regionCode: string;
    regionCodeType: string;
    sidoCode?: string;
    sigunguCode: string;
    sidoName?: string;
    sigunguName?: string;
    emdName?: string;
    matchedSigunguRegion: boolean;
  }>;
  issues: Array<{
    severity: string;
    datasetCategory?: string;
    field?: string;
    message: string;
  }>;
}

describe("--stage master 산출물: legal_dong_master.json (11-2 1차-4)", () => {
  it("파일이 존재", () => {
    expect(existsSync(MASTER_PATHS.legalDong)).toBe(true);
  });

  it("_meta.stage === 'master'", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content._meta.stage).toBe("master");
  });

  it("_meta.source === 'demo:fixture-etl'", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content._meta.source).toBe("demo:fixture-etl");
  });

  it("_meta.datasetCategory === 'G'", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content._meta.datasetCategory).toBe("G");
  });

  it("records.length === 5 (legalDong 5건 모두 dimension에 보존)", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content.records.length).toBe(5);
  });

  it("issues.length === 0 (Policy A: 모든 sigunguCode가 final region에 매칭, 11-2 1차-9)", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content.issues.length).toBe(0);
  });

  it("모든 record의 legalDongCode가 10자리 숫자", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content.records.length).toBeGreaterThan(0);
    for (const r of content.records) {
      expect(/^\d{10}$/.test(r.legalDongCode)).toBe(true);
    }
  });

  it("모든 record의 sigunguCode === legalDongCode.slice(0, 5)", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content.records.length).toBeGreaterThan(0);
    for (const r of content.records) {
      expect(r.sigunguCode).toBe(r.legalDongCode.slice(0, 5));
    }
  });

  it("1168010100 / 1168010300의 matchedSigunguRegion === true", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    const matched = ["1168010100", "1168010300"];
    for (const code of matched) {
      const rec = content.records.find((r) => r.regionCode === code);
      expect(rec, `legalDong ${code} should exist`).toBeDefined();
      expect(rec?.matchedSigunguRegion).toBe(true);
    }
  });

  it("1165010100 / 1120010600 / 1141010100의 matchedSigunguRegion === true (Policy A: union 후 매칭, 11-2 1차-9)", () => {
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    const previouslyUnmatched = ["1165010100", "1120010600", "1141010100"];
    for (const code of previouslyUnmatched) {
      const rec = content.records.find((r) => r.regionCode === code);
      expect(rec, `legalDong ${code} should exist`).toBeDefined();
      // Policy A (1차-9): 1차-4 시점 false였던 3건이 union 후 true로 반전.
      expect(rec?.matchedSigunguRegion).toBe(true);
    }
  });

  it("legalDong issues 0건 회귀 가드 (Policy A: 모든 매칭됨, 11-2 1차-9)", () => {
    // 1차-4 시점에는 issues.length===3였으나, Policy A 후 모든 sigunguCode가 매칭되어
    // issue 자체가 발생하지 않음. 회귀 가드로서 0건 단언만 유지.
    const content = readJson<MasterLegalDongFile>(MASTER_PATHS.legalDong);
    expect(content.issues.length).toBe(0);
  });
});

// ─── --stage master admin_code_master.json (11-2 1차-5) ────────────────────
//
// admin_codes(CSV 시군구 5자리) 5건이 dimension master로 별도 출력되고,
// regionCode가 기존 region_master(JSON fixture 기반)와 매칭되는지 검증한다.
// region_master는 무영향(아래 회귀 가드로 별도 확인).

interface MasterAdminCodeFile {
  _meta: {
    source: string;
    stage: string;
    datasetCategory: string;
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: Array<{
    regionCode: string;
    regionCodeType: string;
    sidoCode?: string;
    sigunguCode?: string;
    sidoName?: string;
    sigunguName?: string;
    matchedRegionMaster: boolean;
  }>;
  issues: Array<{
    severity: string;
    datasetCategory?: string;
    field?: string;
    message: string;
  }>;
}

describe("--stage master 산출물: admin_code_master.json (11-2 1차-5)", () => {
  it("파일이 존재", () => {
    expect(existsSync(MASTER_PATHS.adminCode)).toBe(true);
  });

  it("_meta.stage === 'master'", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content._meta.stage).toBe("master");
  });

  it("_meta.source === 'demo:fixture-etl'", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content._meta.source).toBe("demo:fixture-etl");
  });

  it("_meta.datasetCategory === 'G'", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content._meta.datasetCategory).toBe("G");
  });

  it("records.length === 5 (admin_codes 5건 모두 dimension에 보존)", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content.records.length).toBe(5);
  });

  it("issues.length === 0 (Policy A: 모든 adminCode가 final region에 매칭, 11-2 1차-9)", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content.issues.length).toBe(0);
  });

  it("모든 record의 regionCode가 5자리 숫자", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content.records.length).toBeGreaterThan(0);
    for (const r of content.records) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("11680의 matchedRegionMaster === true", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    const rec = content.records.find((r) => r.regionCode === "11680");
    expect(rec, "adminCode 11680 should exist").toBeDefined();
    expect(rec?.matchedRegionMaster).toBe(true);
  });

  it("11650 / 11200 / 11410 / 11440의 matchedRegionMaster === true (Policy A: union 후 매칭, 11-2 1차-9)", () => {
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    const previouslyUnmatched = ["11650", "11200", "11410", "11440"];
    for (const code of previouslyUnmatched) {
      const rec = content.records.find((r) => r.regionCode === code);
      expect(rec, `adminCode ${code} should exist`).toBeDefined();
      // Policy A (1차-9): 1차-5 시점 false였던 4건이 union 후 true로 반전.
      expect(rec?.matchedRegionMaster).toBe(true);
    }
  });

  it("adminCode issues 0건 회귀 가드 (Policy A: 모든 매칭됨, 11-2 1차-9)", () => {
    // 1차-5 시점에는 issues.length===4였으나, Policy A 후 모든 sigunguCode가 매칭되어
    // issue 자체가 발생하지 않음. 회귀 가드로서 0건 단언만 유지.
    const content = readJson<MasterAdminCodeFile>(MASTER_PATHS.adminCode);
    expect(content.issues.length).toBe(0);
  });
});

// ─── --stage master admin_legal_dong_crossref.json (11-2 1차-7) ────────────
//
// 1차-6에서 단언으로만 검증된 admin × legalDong cross-reference를 별도 master
// 산출물로 데이터화. sigunguCode union 10건 + 매칭 메트릭 보유.
// region_master/admin_code_master/legal_dong_master는 무영향.

interface MasterCrossrefFile {
  _meta: {
    source: string;
    stage: string;
    datasetCategory: string;
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: Array<{
    sigunguCode: string;
    inRegionMaster: boolean;
    inAdminCodeMaster: boolean;
    inLegalDongMaster: boolean;
    legalDongRecordCount: number;
  }>;
  issues: Array<{
    severity: string;
    datasetCategory?: string;
    field?: string;
    message: string;
  }>;
}

describe("--stage master 산출물: admin_legal_dong_crossref.json (11-2 1차-7)", () => {
  it("파일이 존재", () => {
    expect(existsSync(MASTER_PATHS.crossref)).toBe(true);
  });

  it("_meta.stage='master', source='demo:fixture-etl', datasetCategory='G'", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    expect(content._meta.stage).toBe("master");
    expect(content._meta.source).toBe("demo:fixture-etl");
    expect(content._meta.datasetCategory).toBe("G");
  });

  it("records.length === 10 (sigunguCode union of region/admin/legalDong)", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    expect(content.records.length).toBe(10);
  });

  it("issues.length === 6 (1 admin-only orphan + 5 region-only)", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    expect(content.issues.length).toBe(6);
  });

  it("11680 record가 3-way 매칭이며 legalDongRecordCount === 2", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    const rec = content.records.find((r) => r.sigunguCode === "11680");
    expect(rec, "crossref 11680 record should exist").toBeDefined();
    expect(rec?.inRegionMaster).toBe(true);
    expect(rec?.inAdminCodeMaster).toBe(true);
    expect(rec?.inLegalDongMaster).toBe(true);
    expect(rec?.legalDongRecordCount).toBe(2);
  });

  it("11650/11200/11410 records: inRegionMaster=true (Policy A), inAdminCodeMaster=true, inLegalDongMaster=true (11-2 1차-9)", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    for (const code of ["11650", "11200", "11410"]) {
      const rec = content.records.find((r) => r.sigunguCode === code);
      expect(rec, `crossref ${code} record should exist`).toBeDefined();
      // Policy A (1차-9): 1차-7 시점 false였던 inRegionMaster가 union 후 true로 반전.
      expect(rec?.inRegionMaster).toBe(true);
      expect(rec?.inAdminCodeMaster).toBe(true);
      expect(rec?.inLegalDongMaster).toBe(true);
      expect(rec?.legalDongRecordCount).toBe(1);
    }
  });

  it("11440 record: inRegionMaster=true (Policy A), inAdminCodeMaster=true, inLegalDongMaster=false (11-2 1차-9)", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    const rec = content.records.find((r) => r.sigunguCode === "11440");
    expect(rec, "crossref 11440 record should exist").toBeDefined();
    // Policy A (1차-9): 1차-7 시점 false였던 inRegionMaster가 union 후 true로 반전.
    // 단 inLegalDongMaster는 여전히 false (legalDong fixture에 11440 없음).
    expect(rec?.inRegionMaster).toBe(true);
    expect(rec?.inAdminCodeMaster).toBe(true);
    expect(rec?.inLegalDongMaster).toBe(false);
    expect(rec?.legalDongRecordCount).toBe(0);
  });

  it("region-only 5개 (26350/41117/43113/46110/51110)는 inRegionMaster=true, admin/legalDong=false", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    for (const code of ["26350", "41117", "43113", "46110", "51110"]) {
      const rec = content.records.find((r) => r.sigunguCode === code);
      expect(rec, `crossref ${code} record should exist`).toBeDefined();
      expect(rec?.inRegionMaster).toBe(true);
      expect(rec?.inAdminCodeMaster).toBe(false);
      expect(rec?.inLegalDongMaster).toBe(false);
      expect(rec?.legalDongRecordCount).toBe(0);
    }
  });

  it("모든 crossref issue가 severity='info', datasetCategory='G', field='crossref', message에 'crossref' 포함", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    expect(content.issues.length).toBe(6);
    for (const issue of content.issues) {
      expect(issue.severity).toBe("info");
      expect(issue.datasetCategory).toBe("G");
      expect(issue.field).toBe("crossref");
      expect(issue.message).toContain("crossref");
    }
  });

  it("records가 sigunguCode ascending으로 정렬됨", () => {
    const content = readJson<MasterCrossrefFile>(MASTER_PATHS.crossref);
    const codes = content.records.map((r) => r.sigunguCode);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
    // 명시 단언 — 합의 [13] 1번 (a) 정렬 결과
    expect(codes).toEqual([
      "11200",
      "11410",
      "11440",
      "11650",
      "11680",
      "26350",
      "41117",
      "43113",
      "46110",
      "51110",
    ]);
  });
});

describe("master/region_master.json — admin-union 포함 단언 (11-2 1차-3 → 1차-9 polarized)", () => {
  // 1차-3에서는 "CSV-only code 11650/11200/11410/11440이 region_master에 없어야 함"이
  // 회귀 가드였으나, 11-2 1차-9 Option B + Policy A로 region_master를 union하여
  // 4개 코드를 명시적으로 포함하도록 의도가 반전됨. 따라서 본 describe는 1차-3 가드를
  // 폐기하고 정반대 단언으로 전환된 1차-9 보존 가드 역할을 한다.

  it("records.length === 10 (JSON 6 + admin-union 4, Policy A)", () => {
    const content = readJson<{ records: RegionMasterRecordForCsv[] }>(
      MASTER_PATHS.region,
    );
    expect(content.records.length).toBe(10);
  });

  it("records에 admin-union 코드(11650, 11200, 11410, 11440) 모두 포함 (1차-9 polarized)", () => {
    // 1차-3에서는 미포함이 요구되던 코드들. 1차-9에서는 명시적으로 포함되어야 함.
    const content = readJson<{ records: RegionMasterRecordForCsv[] }>(
      MASTER_PATHS.region,
    );
    const adminUnionCodes = ["11650", "11200", "11410", "11440"];
    for (const code of adminUnionCodes) {
      expect(
        content.records.find((r) => r.regionCode === code),
        `region_master should contain admin-union code ${code} after 1차-9`,
      ).toBeDefined();
    }
  });
});

// ─── --stage all ──────────────────────────────────────────────────────────
//
// beforeAll에서 `--stage all`을 단일 child_process로 실행했다는 사실 자체가
// 이 단계 동작 검증이다. beforeAll이 throw하면 후속 it() 자체가 실행되지 않으므로
// 여기 도달했다는 것은 stage 4개가 모두 성공적으로 완료되었음을 의미한다.
// 명시적 가시성을 위해 4 stage 산출물의 동시 존재만 한 번 더 모아서 단언한다.
describe("--stage all 통합 실행", () => {
  it("clean → master → mart → indicator 4단계 산출물이 모두 생성됨", () => {
    // clean (8) + master (7) + mart (1) + indicator (1) = 17 파일이 한 실행으로 생성.
    // (clean 8 = JSON 6 + CSV 2; CSV 2건은 11-2 1차-3 신규.
    //  master 7 = region/demand/school/supportCenter 4 + legalDong 1 + adminCode 1 + crossref 1;
    //  legalDong은 11-2 1차-4 신규, adminCode는 11-2 1차-5 신규, crossref는 11-2 1차-7 신규.)
    expect(existsSync(CLEAN_PATHS.regionCodes)).toBe(true);
    expect(existsSync(CLEAN_PATHS.geocoding)).toBe(true);
    expect(existsSync(CLEAN_PATHS.specialEducation)).toBe(true);
    expect(existsSync(CLEAN_PATHS.disabledPopulation)).toBe(true);
    expect(existsSync(CLEAN_PATHS.schoolBasic)).toBe(true);
    expect(existsSync(CLEAN_PATHS.supportCenter)).toBe(true);
    expect(existsSync(CLEAN_PATHS.adminCodes)).toBe(true);
    expect(existsSync(CLEAN_PATHS.legalDongCodes)).toBe(true);

    expect(existsSync(MASTER_PATHS.region)).toBe(true);
    expect(existsSync(MASTER_PATHS.demand)).toBe(true);
    expect(existsSync(MASTER_PATHS.school)).toBe(true);
    expect(existsSync(MASTER_PATHS.supportCenter)).toBe(true);
    expect(existsSync(MASTER_PATHS.legalDong)).toBe(true);
    expect(existsSync(MASTER_PATHS.adminCode)).toBe(true);
    expect(existsSync(MASTER_PATHS.crossref)).toBe(true);

    expect(existsSync(MART_OUTPUT_PATH)).toBe(true);
    expect(existsSync(INDICATOR_OUTPUT_PATH)).toBe(true);
  });

  it("indicator 산출물이 _meta.stage='indicator', recordCount=10, indicatorVersion='mvp-v1'을 만족 (11-2 1차-9 Policy A)", () => {
    const content = readJson<{
      _meta: {
        stage: string;
        recordCount: number;
        indicatorVersion: string;
      };
      records: Array<{
        indicators?: { transitionGapIndex?: number };
      }>;
    }>(INDICATOR_OUTPUT_PATH);
    expect(content._meta.stage).toBe("indicator");
    expect(content._meta.recordCount).toBe(10);
    expect(content._meta.indicatorVersion).toBe("mvp-v1");
    expect(content.records.length).toBe(10);
    for (const r of content.records) {
      const v = r.indicators?.transitionGapIndex;
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
