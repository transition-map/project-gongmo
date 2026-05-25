/**
 * master.test.ts — buildMaster() pure function 테스트.
 *
 * **stage 산출물 폴더에 쓰지 않는다.** Vitest는 테스트 파일을 병렬 실행할 수 있어
 * 여러 테스트가 같은 data/clean·data/master 경로에 동시 쓰면 flaky 위험이 있다.
 * stage 실행과 산출물 검증은 etlStages.test.ts가 단독으로 담당한다.
 *
 * 본 파일은 fixture 6개를 in-memory로 cleaner에 통과시켜 BuildMasterInput을 만들고
 * buildMaster를 직접 호출한다 (testEtlCommands.loadBuildMasterInputFromFixtures).
 * 따라서 child_process / fs.writeFile / data/clean·data/master 의존 0건.
 */

import { describe, expect, it } from "vitest";
import { buildMaster } from "../master/buildMaster";
import { loadBuildMasterInputFromFixtures } from "./testEtlCommands";

describe("buildMaster (in-memory fixture pipeline)", () => {
  it("4개 master record array를 반환", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(Array.isArray(result.regionMaster)).toBe(true);
    expect(Array.isArray(result.demandMaster)).toBe(true);
    expect(Array.isArray(result.schoolMaster)).toBe(true);
    expect(Array.isArray(result.supportCenterMaster)).toBe(true);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("regionMaster에는 5자리 숫자 regionCode만 포함", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.regionMaster.length).toBeGreaterThan(0);
    for (const r of result.regionMaster) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
    }
  });

  it("regionMaster.length === 10 (기존 JSON 6 + admin-union 4, 11-2 1차-9 Policy A)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.regionMaster.length).toBe(10);
  });

  it("regionMaster에 admin-union 신규 4건(11650, 11200, 11410, 11440) 포함 (11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const codes = new Set(result.regionMaster.map((r) => r.regionCode));
    for (const code of ["11650", "11200", "11410", "11440"]) {
      expect(codes.has(code), `region_master should contain admin-union ${code}`).toBe(true);
    }
  });

  it("regionMaster source 필드: 기존 6건은 'json-fixture', 신규 admin-union 4건은 'admin-union' (11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const jsonCodes = ["11680", "26350", "41117", "43113", "46110", "51110"];
    const adminUnionCodes = ["11650", "11200", "11410", "11440"];
    for (const code of jsonCodes) {
      const rec = result.regionMaster.find((r) => r.regionCode === code);
      expect(rec, `json region ${code} should exist`).toBeDefined();
      expect(rec?.source).toBe("json-fixture");
    }
    for (const code of adminUnionCodes) {
      const rec = result.regionMaster.find((r) => r.regionCode === code);
      expect(rec, `admin-union region ${code} should exist`).toBeDefined();
      expect(rec?.source).toBe("admin-union");
    }
  });

  it("regionMaster가 sigunguCode ascending으로 정렬 (11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const codes = result.regionMaster.map((r) => r.regionCode);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  it("비정상 'ABCD'는 regionMaster에 미포함", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(
      result.regionMaster.find((r) => r.regionCode === "ABCD"),
    ).toBeUndefined();
  });

  it("'INVALID' regionCode는 demandMaster에 미포함", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(
      result.demandMaster.find((r) => r.regionCode === "INVALID"),
    ).toBeUndefined();
  });

  it("demandMaster는 A fixture 보유 시군구 6건 기준 (admin-union 4건은 A 데이터 0건이라 무영향)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.demandMaster.length).toBe(6);
  });

  it("schoolMaster.length === 7 (빈 schoolName 차단 후)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.schoolMaster.length).toBe(7);
  });

  it("supportCenterMaster.length === 3", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.supportCenterMaster.length).toBe(3);
  });

  it("schoolMaster의 모든 regionCode가 regionMaster에 존재", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const valid = new Set(result.regionMaster.map((r) => r.regionCode));
    expect(result.schoolMaster.length).toBeGreaterThan(0);
    for (const s of result.schoolMaster) {
      expect(valid.has(s.regionCode)).toBe(true);
    }
  });

  it("supportCenterMaster의 모든 regionCode가 regionMaster에 존재", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const valid = new Set(result.regionMaster.map((r) => r.regionCode));
    expect(result.supportCenterMaster.length).toBeGreaterThan(0);
    for (const c of result.supportCenterMaster) {
      expect(valid.has(c.regionCode)).toBe(true);
    }
  });

  it("issues에 regionCode 관련 warning이 포함됨", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const regionWarnings = result.issues.filter(
      (i) => i.field === "regionCode" && i.severity === "warning",
    );
    expect(regionWarnings.length).toBeGreaterThan(0);
  });

  it("schoolMaster의 모든 record는 schoolName과 schoolId를 가짐", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    for (const s of result.schoolMaster) {
      expect(s.schoolName.length).toBeGreaterThan(0);
      expect(s.schoolId.length).toBeGreaterThan(0);
    }
  });

  // ─── 11-2 1차-4 — legalDongMaster (dimension table) ─────────────────────
  it("legalDongMaster.length === 5 (legalDong CSV 5건 모두 dimension에 보존)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.legalDongMaster.length).toBe(5);
  });

  it("legalDongMaster의 모든 record가 10자리 legalDongCode + sigunguCode === legalDongCode.slice(0, 5)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.legalDongMaster.length).toBeGreaterThan(0);
    for (const r of result.legalDongMaster) {
      expect(/^\d{10}$/.test(r.legalDongCode)).toBe(true);
      expect(r.sigunguCode).toBe(r.legalDongCode.slice(0, 5));
    }
  });

  it("모든 legalDong record는 matchedSigunguRegion === true (Policy A: final region_master 기준, 11-2 1차-9)", () => {
    // Policy A: 1차-9에서 region_master가 admin-union으로 확장된 후,
    // 11650/11200/11410이 최종 region에 포함되어 모든 legalDong이 매칭됨.
    // 1차-4 시점에 false였던 3건이 true로 반전됨.
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.legalDongMaster.length).toBe(5);
    for (const r of result.legalDongMaster) {
      expect(r.matchedSigunguRegion).toBe(true);
    }
  });

  it("legalDong info issue 0건 (Policy A: 모든 sigunguCode가 final region에 매칭됨, 11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const legalDongInfoIssues = result.issues.filter(
      (i) =>
        i.severity === "info" &&
        i.field === "sigunguCode" &&
        i.datasetCategory === "G" &&
        i.message.includes("legalDong"),
    );
    expect(legalDongInfoIssues.length).toBe(0);
  });

  // ─── 11-2 1차-5 — adminCodeMaster (dimension table) ─────────────────────
  it("adminCodeMaster.length === 5 (admin_codes CSV 5건 모두 dimension에 보존)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.adminCodeMaster.length).toBe(5);
  });

  it("adminCodeMaster의 모든 5건이 matchedRegionMaster === true (Policy A: final region_master 기준, 11-2 1차-9)", () => {
    // Policy A: 1차-9에서 region_master가 admin-union으로 확장된 후,
    // 11650/11200/11410/11440이 최종 region에 포함되어 모든 adminCode가 매칭됨.
    // 1차-5 시점에 false였던 4건이 true로 반전됨.
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.adminCodeMaster.length).toBe(5);
    for (const r of result.adminCodeMaster) {
      expect(/^\d{5}$/.test(r.regionCode)).toBe(true);
      expect(r.matchedRegionMaster).toBe(true);
    }
  });

  it("adminCode info issue 0건 (Policy A: 모든 adminCode가 final region에 매칭됨, 11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const adminCodeInfoIssues = result.issues.filter(
      (i) =>
        i.severity === "info" &&
        i.field === "sigunguCode" &&
        i.datasetCategory === "G" &&
        i.message.includes("adminCode"),
    );
    expect(adminCodeInfoIssues.length).toBe(0);
  });
});

// ─── 11-2 1차-6 — admin × legalDong cross-reference ────────────────────────
//
// admin_code_master와 legal_dong_master가 공유하는 sigunguCode가 어디서
// 매칭/누락되는지 검증하는 quality check 단언 집합.
// production code 변경 0건 (Option A): buildMaster의 in-memory 결과만 비교.
describe("admin × legalDong cross-reference (11-2 1차-6)", () => {
  it("11680은 region/admin/legalDong 3-way 매칭이며 legalDong 행 2건 (1168010100, 1168010300)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(
      result.regionMaster.find((r) => r.regionCode === "11680"),
    ).toBeDefined();
    expect(
      result.adminCodeMaster.find((r) => r.regionCode === "11680"),
    ).toBeDefined();
    const legalDongFor11680 = result.legalDongMaster.filter(
      (r) => r.sigunguCode === "11680",
    );
    expect(legalDongFor11680.length).toBe(2);
    const legalDongCodes = new Set(
      legalDongFor11680.map((r) => r.legalDongCode),
    );
    expect(legalDongCodes).toEqual(new Set(["1168010100", "1168010300"]));
  });

  it("11650 / 11200 / 11410은 region/admin/legalDong 3-way 매칭 (Policy A: union 후 region에도 포함, 11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const triCodes = ["11650", "11200", "11410"];
    for (const code of triCodes) {
      expect(
        result.adminCodeMaster.find((r) => r.regionCode === code),
        `adminCode ${code} should exist`,
      ).toBeDefined();
      expect(
        result.legalDongMaster.find((r) => r.sigunguCode === code),
        `legalDong with sigunguCode ${code} should exist`,
      ).toBeDefined();
      // Policy A (1차-9): union 후 region에도 포함됨 (admin-union source)
      expect(
        result.regionMaster.find((r) => r.regionCode === code),
        `regionMaster ${code} should EXIST after Policy A`,
      ).toBeDefined();
    }
  });

  it("11440은 region+admin에 있고 legalDong에는 없음 (Policy A: union 후 region에 포함, 11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(
      result.adminCodeMaster.find((r) => r.regionCode === "11440"),
    ).toBeDefined();
    expect(
      result.legalDongMaster.find((r) => r.sigunguCode === "11440"),
    ).toBeUndefined();
    // Policy A (1차-9): union 후 region에도 포함됨
    expect(
      result.regionMaster.find((r) => r.regionCode === "11440"),
    ).toBeDefined();
  });

  it("legalDong record-level → admin coverage 5/5 = 100%", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const adminSigungus = new Set(
      result.adminCodeMaster.map((r) => r.regionCode),
    );
    expect(result.legalDongMaster.length).toBe(5);
    const allCovered = result.legalDongMaster.every((r) =>
      adminSigungus.has(r.sigunguCode),
    );
    expect(allCovered).toBe(true);
  });

  it("legalDong distinct sigunguCode → admin coverage 4/4 = 100%", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const adminSigungus = new Set(
      result.adminCodeMaster.map((r) => r.regionCode),
    );
    const legalDongDistinct = new Set(
      result.legalDongMaster.map((r) => r.sigunguCode),
    );
    expect(legalDongDistinct.size).toBe(4);
    const allCovered = Array.from(legalDongDistinct).every((s) =>
      adminSigungus.has(s),
    );
    expect(allCovered).toBe(true);
  });

  it("admin → legalDong coverage 4/5 = 80%", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const legalDongSigungus = new Set(
      result.legalDongMaster.map((r) => r.sigunguCode),
    );
    const covered = result.adminCodeMaster.filter((r) =>
      legalDongSigungus.has(r.regionCode),
    );
    expect(result.adminCodeMaster.length).toBe(5);
    expect(covered.length).toBe(4);
  });

  it("admin에서 legalDong에 없는 sigunguCode 집합 === {\"11440\"}", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const legalDongSigungus = new Set(
      result.legalDongMaster.map((r) => r.sigunguCode),
    );
    const adminMinusLegalDong = new Set(
      result.adminCodeMaster
        .map((r) => r.regionCode)
        .filter((c) => !legalDongSigungus.has(c)),
    );
    expect(adminMinusLegalDong).toEqual(new Set(["11440"]));
  });

  it("Orphan-from-region triangle === empty Set (Policy A 후 admin/legalDong이 final region에 포함되어 orphan 없음, 11-2 1차-9)", () => {
    // 사용자 합의 14번: orphan-from-region 테스트는 삭제하지 않고 empty Set 단언으로 유지.
    // Policy A 후 union으로 admin/legalDong의 모든 sigunguCode가 final region에 포함되므로
    // "admin+legalDong에는 있지만 region에 없는" 조건을 충족하는 코드가 0건이 된다.
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const regionSigungus = new Set(
      result.regionMaster.map((r) => r.regionCode),
    );
    const adminSigungus = new Set(
      result.adminCodeMaster.map((r) => r.regionCode),
    );
    const legalDongSigungus = new Set(
      result.legalDongMaster.map((r) => r.sigunguCode),
    );
    const orphanFromRegion = new Set(
      Array.from(adminSigungus).filter(
        (c) => legalDongSigungus.has(c) && !regionSigungus.has(c),
      ),
    );
    expect(orphanFromRegion).toEqual(new Set());
  });

  it("region 10개 중 admin+legalDong 양쪽에 존재 === {11200,11410,11650,11680}; region-only === {26350,41117,43113,46110,51110} (Policy A, 11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const adminSigungus = new Set(
      result.adminCodeMaster.map((r) => r.regionCode),
    );
    const legalDongSigungus = new Set(
      result.legalDongMaster.map((r) => r.sigunguCode),
    );

    // Policy A: region 10개 중 admin+legalDong 양쪽에 모두 포함되는 코드 = 4건
    // (11200/11410/11650/11680). 11440은 admin에는 있지만 legalDong에는 없음.
    const regionInBoth = result.regionMaster.filter(
      (r) =>
        adminSigungus.has(r.regionCode) && legalDongSigungus.has(r.regionCode),
    );
    expect(new Set(regionInBoth.map((r) => r.regionCode))).toEqual(
      new Set(["11200", "11410", "11650", "11680"]),
    );

    // 그 외 region 5개 코드(26350/41117/43113/46110/51110)는 admin/legalDong 모두 부재.
    // 11440은 admin은 있지만 legalDong은 없으므로 region-only 아님.
    const regionOnlyCodes = ["26350", "41117", "43113", "46110", "51110"];
    for (const code of regionOnlyCodes) {
      expect(
        adminSigungus.has(code),
        `admin should NOT contain ${code}`,
      ).toBe(false);
      expect(
        legalDongSigungus.has(code),
        `legalDong should NOT contain ${code}`,
      ).toBe(false);
    }
  });
});

// ─── 11-2 1차-7 — adminLegalDongCrossref builder ───────────────────────────
//
// 1차-6의 raw master 단언 9 케이스는 그대로 contract test로 유지하고, 본 describe는
// 새 builder `buildAdminLegalDongCrossref`의 출력(result.adminLegalDongCrossref)을
// 직접 단언한다. records는 sigunguCode ascending으로 정렬된 10건이어야 한다.
describe("adminLegalDongCrossref builder (11-2 1차-7)", () => {
  it("result.adminLegalDongCrossref.length === 10 (region/admin/legalDong sigunguCode 합집합)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    expect(result.adminLegalDongCrossref.length).toBe(10);
  });

  it("모든 expected record가 sigunguCode ascending으로 보유 + 4개 필드 값 일치 (Policy A: 모든 inRegionMaster=true, 11-2 1차-9)", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    // Policy A (1차-9): final region_master가 union된 10건이므로 모든 sigunguCode의
    // inRegionMaster=true. inAdminCodeMaster/inLegalDongMaster는 1차-7 그대로.
    const expected = [
      { sigunguCode: "11200", inRegionMaster: true,  inAdminCodeMaster: true,  inLegalDongMaster: true,  legalDongRecordCount: 1 },
      { sigunguCode: "11410", inRegionMaster: true,  inAdminCodeMaster: true,  inLegalDongMaster: true,  legalDongRecordCount: 1 },
      { sigunguCode: "11440", inRegionMaster: true,  inAdminCodeMaster: true,  inLegalDongMaster: false, legalDongRecordCount: 0 },
      { sigunguCode: "11650", inRegionMaster: true,  inAdminCodeMaster: true,  inLegalDongMaster: true,  legalDongRecordCount: 1 },
      { sigunguCode: "11680", inRegionMaster: true,  inAdminCodeMaster: true,  inLegalDongMaster: true,  legalDongRecordCount: 2 },
      { sigunguCode: "26350", inRegionMaster: true,  inAdminCodeMaster: false, inLegalDongMaster: false, legalDongRecordCount: 0 },
      { sigunguCode: "41117", inRegionMaster: true,  inAdminCodeMaster: false, inLegalDongMaster: false, legalDongRecordCount: 0 },
      { sigunguCode: "43113", inRegionMaster: true,  inAdminCodeMaster: false, inLegalDongMaster: false, legalDongRecordCount: 0 },
      { sigunguCode: "46110", inRegionMaster: true,  inAdminCodeMaster: false, inLegalDongMaster: false, legalDongRecordCount: 0 },
      { sigunguCode: "51110", inRegionMaster: true,  inAdminCodeMaster: false, inLegalDongMaster: false, legalDongRecordCount: 0 },
    ];
    expect(result.adminLegalDongCrossref).toEqual(expected);
  });

  it("crossref issue 6건 발생 + 모두 field === 'crossref', severity === 'info', datasetCategory === 'G'", () => {
    const result = buildMaster(loadBuildMasterInputFromFixtures());
    const crossrefIssues = result.issues.filter((i) => i.field === "crossref");
    expect(crossrefIssues.length).toBe(6);
    for (const issue of crossrefIssues) {
      expect(issue.severity).toBe("info");
      expect(issue.datasetCategory).toBe("G");
      expect(issue.message).toContain("crossref");
    }
  });
});
