import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { readJson } from "../io/readJson";
import { cleanRegionCodes } from "../clean/cleanRegionCodes";
import { cleanGeocoding } from "../clean/cleanGeocoding";
import { cleanSpecialEducation } from "../clean/cleanSpecialEducation";
import { cleanDisabledPopulation } from "../clean/cleanDisabledPopulation";
import { cleanSchoolBasic } from "../clean/cleanSchoolBasic";
import { cleanSupportCenter } from "../clean/cleanSupportCenter";
import type { FixtureFile } from "../types";

const FIXTURE_DIR = "data/fixtures";

const FIXTURES = {
  regionCodes: join(FIXTURE_DIR, "G_region_codes_sample.json"),
  geocoding: join(FIXTURE_DIR, "G_geocoding_sample.json"),
  specialEducation: join(FIXTURE_DIR, "A_special_education_sample.json"),
  disabledPopulation: join(FIXTURE_DIR, "A_disabled_population_sample.json"),
  schoolBasic: join(FIXTURE_DIR, "B_school_basic_sample.json"),
  supportCenter: join(FIXTURE_DIR, "B_special_support_center_sample.json"),
} as const;

describe("fixture 파일 로드", () => {
  it("6개 fixture 파일이 모두 존재하고 _meta.source === 'demo'", () => {
    for (const path of Object.values(FIXTURES)) {
      expect(existsSync(path), `missing fixture: ${path}`).toBe(true);
      const fx = readJson<FixtureFile<unknown>>(path);
      expect(fx._meta.source).toBe("demo");
      expect(fx._meta.license).toBe("demo-only");
      expect(Array.isArray(fx.records)).toBe(true);
    }
  });
});

describe("cleanRegionCodes (G)", () => {
  it("regionCode와 regionCodeType을 생성", () => {
    const fx = readJson<FixtureFile<{ regionCode: string }>>(
      FIXTURES.regionCodes,
    );
    const result = cleanRegionCodes(
      fx.records as Parameters<typeof cleanRegionCodes>[0],
    );
    expect(result.records.length).toBe(fx.records.length);
    // 정상 5자리 입력은 sigungu로 추론
    const valid = result.records.filter((r) => /^\d{5}$/.test(r.regionCode));
    expect(valid.length).toBeGreaterThan(0);
    for (const r of valid) {
      expect(r.regionCodeType).toBe("sigungu");
    }
  });

  it("비정상 regionCode에서 issues 누적", () => {
    const fx = readJson<FixtureFile<{ regionCode: string }>>(
      FIXTURES.regionCodes,
    );
    const result = cleanRegionCodes(
      fx.records as Parameters<typeof cleanRegionCodes>[0],
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("cleanGeocoding (G)", () => {
  it("address와 coordinate를 생성", () => {
    const fx = readJson<FixtureFile<{ address: string }>>(FIXTURES.geocoding);
    const result = cleanGeocoding(
      fx.records as Parameters<typeof cleanGeocoding>[0],
    );
    expect(result.records.length).toBe(fx.records.length);
    for (const r of result.records) {
      expect(r.coordinate).toBeDefined();
    }
  });

  it("좌표 누락·범위 밖 입력에서 issues 누적", () => {
    const fx = readJson<FixtureFile<{ address: string }>>(FIXTURES.geocoding);
    const result = cleanGeocoding(
      fx.records as Parameters<typeof cleanGeocoding>[0],
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("cleanSpecialEducation (A)", () => {
  it("regionCode와 specialEducationStudentCount를 생성", () => {
    const fx = readJson<
      FixtureFile<{ regionCode: string; specialEducationStudentCount: number }>
    >(FIXTURES.specialEducation);
    const result = cleanSpecialEducation(
      fx.records as Parameters<typeof cleanSpecialEducation>[0],
    );
    expect(result.records.length).toBe(fx.records.length);
    for (const r of result.records.filter((x) =>
      /^\d{5}$/.test(x.regionCode),
    )) {
      expect(r.specialEducationStudentCount).toBeGreaterThan(0);
      expect(r.regionCodeType).toBe("sigungu");
    }
  });

  it("비정상 regionCode에서 issues 누적", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.specialEducation);
    const result = cleanSpecialEducation(
      fx.records as Parameters<typeof cleanSpecialEducation>[0],
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("cleanDisabledPopulation (A)", () => {
  it("regionCode와 registeredDisabledCount를 생성", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.disabledPopulation);
    const result = cleanDisabledPopulation(
      fx.records as Parameters<typeof cleanDisabledPopulation>[0],
    );
    expect(result.records.length).toBe(fx.records.length);
    for (const r of result.records) {
      expect(r.registeredDisabledCount).toBeGreaterThan(0);
    }
  });
});

describe("cleanSchoolBasic (B)", () => {
  it("schoolId와 regionCode를 생성", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.schoolBasic);
    const result = cleanSchoolBasic(
      fx.records as Parameters<typeof cleanSchoolBasic>[0],
    );
    expect(result.records.length).toBe(fx.records.length);
    for (const r of result.records) {
      expect(r.schoolId).toBeTruthy();
    }
  });

  it("NEIS 코드 있으면 school:neis:{code} 생성", () => {
    const fx = readJson<FixtureFile<{ neisSchoolCode?: string }>>(
      FIXTURES.schoolBasic,
    );
    const result = cleanSchoolBasic(
      fx.records as Parameters<typeof cleanSchoolBasic>[0],
    );
    const withNeis = result.records.filter((r) =>
      r.schoolId.startsWith("school:neis:"),
    );
    expect(withNeis.length).toBeGreaterThan(0);
  });

  it("NEIS 코드 없으면 source+slug 기반 ID 생성", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.schoolBasic);
    const result = cleanSchoolBasic(
      fx.records as Parameters<typeof cleanSchoolBasic>[0],
    );
    const withSlug = result.records.filter((r) =>
      r.schoolId.startsWith("school:demo-school:"),
    );
    expect(withSlug.length).toBeGreaterThan(0);
  });

  it("빈 학교명 입력에서 issues 누적", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.schoolBasic);
    const result = cleanSchoolBasic(
      fx.records as Parameters<typeof cleanSchoolBasic>[0],
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("cleanSupportCenter (B)", () => {
  it("institutionId와 regionCode를 생성", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.supportCenter);
    const result = cleanSupportCenter(
      fx.records as Parameters<typeof cleanSupportCenter>[0],
    );
    expect(result.records.length).toBe(fx.records.length);
    for (const r of result.records) {
      expect(r.institutionId).toMatch(/^inst:supportCenter:demo-support:/);
      expect(r.institutionType).toBe("supportCenter");
    }
  });

  it("sourceId 부재 시 slug fallback (unknown 아님)", () => {
    const fx = readJson<FixtureFile<unknown>>(FIXTURES.supportCenter);
    const result = cleanSupportCenter(
      fx.records as Parameters<typeof cleanSupportCenter>[0],
    );
    // sourceId가 ""인 레코드도 institutionName + address slug로 fallback
    for (const r of result.records) {
      expect(r.institutionId).not.toMatch(/:unknown$/);
    }
  });
});

describe("data/clean 산출물 — npm run etl:fixture 후 존재 검증", () => {
  it("산출물 파일이 존재하면 _meta.stage === 'clean'을 만족", () => {
    const outputs = [
      "data/clean/G/region_codes.clean.json",
      "data/clean/G/geocoding.clean.json",
      "data/clean/A/special_education.clean.json",
      "data/clean/A/disabled_population.clean.json",
      "data/clean/B/school_basic.clean.json",
      "data/clean/B/support_center.clean.json",
    ];
    for (const path of outputs) {
      // 산출물 파일이 없을 수 있음(테스트만 단독 실행 시).
      // 존재하면 _meta.stage 검증, 없으면 skip.
      if (!existsSync(path)) continue;
      const content = JSON.parse(readFileSync(path, "utf-8")) as {
        _meta?: { stage?: string; source?: string };
      };
      expect(content._meta?.stage).toBe("clean");
      expect(content._meta?.source).toBe("demo");
    }
  });
});
