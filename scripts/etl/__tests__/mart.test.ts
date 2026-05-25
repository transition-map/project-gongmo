/**
 * mart.test.ts — buildRegionSummaryMart() pure function 테스트.
 *
 * **stage 산출물 폴더에 쓰지 않는다.** Vitest는 테스트 파일을 병렬 실행할 수 있어
 * 여러 테스트가 같은 data/clean·data/master·data/mart 경로에 동시 쓰면 flaky
 * 위험이 있다. stage 실행과 산출물 검증은 etlStages.test.ts가 단독으로 담당한다.
 *
 * 본 파일은 fixture → cleaner → buildMaster → buildRegionSummaryMart로 이어지는
 * 파이프라인을 in-memory로 구성해 산출물 폴더 의존을 제거한다.
 */

import { describe, expect, it } from "vitest";
import { buildMaster, type BuildMasterInput } from "../master/buildMaster";
import { buildRegionSummaryMart } from "../mart/buildRegionSummaryMart";
import type { MasterBuildResult } from "../master/types";
import { loadBuildMasterInputFromFixtures } from "./testEtlCommands";

/**
 * fixture에서 in-memory로 master 산출물을 구성한다.
 * mart 입력에 필요한 4개 array만 추출한다.
 */
function buildMasterFromFixtures(): MasterBuildResult {
  const masterInput: BuildMasterInput = loadBuildMasterInputFromFixtures();
  return buildMaster(masterInput);
}

describe("buildRegionSummaryMart (in-memory fixture pipeline)", () => {
  it("records와 issues array를 반환", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    expect(Array.isArray(result.records)).toBe(true);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("records 수가 regionMaster 수와 동일 (1:1 base, 11-2 1차-9 Policy A 후 10건)", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    expect(result.records.length).toBe(m.regionMaster.length);
    expect(result.records.length).toBe(10);
  });

  it("모든 record의 regionCode가 5자리 숫자", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    for (const r of result.records) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("regionCode 집합이 regionMaster의 regionCode 집합과 동일", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    const martCodes = new Set(result.records.map((r) => r.regionCode));
    const regionCodes = new Set(m.regionMaster.map((r) => r.regionCode));
    expect(martCodes).toEqual(regionCodes);
  });

  it("demand 결합: specialEducationStudentCount/registeredDisabledCount가 demandMaster와 일치", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    const demandByRegion = new Map(
      m.demandMaster.map((d) => [d.regionCode, d]),
    );
    for (const r of result.records) {
      const expected = demandByRegion.get(r.regionCode);
      expect(r.specialEducationStudentCount).toBe(
        expected?.specialEducationStudentCount,
      );
      expect(r.registeredDisabledCount).toBe(expected?.registeredDisabledCount);
    }
  });

  it("schoolCount = 해당 regionCode의 schoolMaster record 수", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    for (const r of result.records) {
      const expected = m.schoolMaster.filter(
        (s) => s.regionCode === r.regionCode,
      ).length;
      expect(r.schoolCount).toBe(expected);
    }
  });

  it("specialSchoolCount/specialClassCount가 schoolType별 카운트와 일치", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    for (const r of result.records) {
      const schools = m.schoolMaster.filter(
        (s) => s.regionCode === r.regionCode,
      );
      const expectedSpecial = schools.filter(
        (s) => s.schoolType === "specialSchool",
      ).length;
      const expectedClass = schools.filter(
        (s) => s.schoolType === "specialClassInGeneralSchool",
      ).length;
      expect(r.specialSchoolCount).toBe(expectedSpecial);
      expect(r.specialClassCount).toBe(expectedClass);
    }
  });

  it("supportCenterCount = 해당 regionCode의 supportCenterMaster record 수", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    for (const r of result.records) {
      const expected = m.supportCenterMaster.filter(
        (c) => c.regionCode === r.regionCode,
      ).length;
      expect(r.supportCenterCount).toBe(expected);
    }
  });

  it("C/D/E/F 카운트는 모두 0 (도메인 부재)", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    for (const r of result.records) {
      expect(r.trainingInstitutionCount).toBe(0);
      expect(r.careerExperienceCenterCount).toBe(0);
      expect(r.welfareFacilityCount).toBe(0);
      expect(r.jobPostingCount).toBe(0);
    }
  });

  it("regionName이 sidoName + sigunguName 합성 (또는 fallback)", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    for (const r of result.records) {
      if (r.sidoName && r.sigunguName) {
        expect(r.regionName).toBe(`${r.sidoName} ${r.sigunguName}`);
      } else {
        expect(r.regionName).toBeDefined();
        expect(r.regionName!.length).toBeGreaterThan(0);
      }
    }
  });

  it("partialRegionFlag: 신규 admin-union 4건 true, 기존 json-fixture 6건 false (11-2 1차-9)", () => {
    const m = buildMasterFromFixtures();
    const result = buildRegionSummaryMart({
      regionMaster: m.regionMaster,
      demandMaster: m.demandMaster,
      schoolMaster: m.schoolMaster,
      supportCenterMaster: m.supportCenterMaster,
    });
    const adminUnionCodes = ["11200", "11410", "11440", "11650"];
    const jsonCodes = ["11680", "26350", "41117", "43113", "46110", "51110"];
    for (const code of adminUnionCodes) {
      const rec = result.records.find((r) => r.regionCode === code);
      expect(rec, `mart record ${code} should exist`).toBeDefined();
      expect(rec?.partialRegionFlag).toBe(true);
    }
    for (const code of jsonCodes) {
      const rec = result.records.find((r) => r.regionCode === code);
      expect(rec, `mart record ${code} should exist`).toBeDefined();
      expect(rec?.partialRegionFlag).toBe(false);
    }
  });
});
