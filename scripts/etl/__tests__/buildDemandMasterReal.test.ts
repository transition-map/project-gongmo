/**
 * buildDemandMasterReal.test.ts — 11-3 1차-36 A demand master.real.
 *
 * 정책 (사용자 합의값):
 * - master 단계 책임 (CLAUDE.md §4 단방향 5단계 원칙).
 * - 기존 `cleanSpecialEducation` / `cleanDisabledPopulation` pure function 재사용 (caller 수준).
 * - 본 wrapper는 두 도메인의 CleanedRecord[] + G admin_codes를 받아 MasterDemandRecord 산출.
 * - regionCode 기준 outer join (special education + disabled population).
 * - regionCode가 admin_codes set에 없으면 제외 + warning issue (field: "regionCode").
 * - 한쪽만 있는 region은 보존 + info issue (field: "partialDemand").
 * - MasterDemandRecord schema 무변경 (master/types.ts 그대로).
 * - Pure function — 입력 array·record 객체 mutate 0건.
 */

import { describe, expect, it } from "vitest";
import { buildDemandMasterReal } from "../master/buildDemandMasterReal";
import type { CleanedSpecialEducationRecord } from "../clean/cleanSpecialEducation";
import type { CleanedDisabledPopulationRecord } from "../clean/cleanDisabledPopulation";
import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";

const SAMPLE_ADMIN_CODES: CleanedRegionCodeRecord[] = [
  {
    regionCode: "11680",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11680",
    sidoName: "서울특별시",
    sigunguName: "강남구",
  },
  {
    regionCode: "26350",
    regionCodeType: "sigungu",
    sidoCode: "26",
    sigunguCode: "26350",
    sidoName: "부산광역시",
    sigunguName: "해운대구",
  },
  {
    regionCode: "41117",
    regionCodeType: "sigungu",
    sidoCode: "41",
    sigunguCode: "41117",
    sidoName: "경기도",
    sigunguName: "수원시 영통구",
  },
];

function specialEd(
  overrides: Partial<CleanedSpecialEducationRecord> = {},
): CleanedSpecialEducationRecord {
  return {
    regionCode: "11680",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11680",
    specialEducationStudentCount: 380,
    year: 2026,
    ...overrides,
  };
}

function disabled(
  overrides: Partial<CleanedDisabledPopulationRecord> = {},
): CleanedDisabledPopulationRecord {
  return {
    regionCode: "11680",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11680",
    registeredDisabledCount: 18400,
    year: 2026,
    ...overrides,
  };
}

describe("buildDemandMasterReal — outer join (11-3 1차-36)", () => {
  it("동일 regionCode의 special education + disabled population을 한 master record로 합친다", () => {
    const result = buildDemandMasterReal({
      specialEducation: [specialEd({ regionCode: "11680", specialEducationStudentCount: 380 })],
      disabledPopulation: [disabled({ regionCode: "11680", registeredDisabledCount: 18400 })],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({
      regionCode: "11680",
      regionCodeType: "sigungu",
      specialEducationStudentCount: 380,
      registeredDisabledCount: 18400,
    });
  });

  it("MasterDemandRecord schema — year 전파", () => {
    const result = buildDemandMasterReal({
      specialEducation: [specialEd({ regionCode: "11680", year: 2026 })],
      disabledPopulation: [disabled({ regionCode: "11680", year: 2026 })],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records[0].year).toBe(2026);
  });

  it("여러 region — regionCode 기준 group-by 결과", () => {
    const result = buildDemandMasterReal({
      specialEducation: [
        specialEd({ regionCode: "11680", specialEducationStudentCount: 380 }),
        specialEd({ regionCode: "26350", specialEducationStudentCount: 295 }),
        specialEd({ regionCode: "41117", specialEducationStudentCount: 510 }),
      ],
      disabledPopulation: [
        disabled({ regionCode: "11680", registeredDisabledCount: 18400 }),
        disabled({ regionCode: "26350", registeredDisabledCount: 16700 }),
        disabled({ regionCode: "41117", registeredDisabledCount: 12900 }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(3);
    const codes = result.records.map((r) => r.regionCode).sort();
    expect(codes).toEqual(["11680", "26350", "41117"]);
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.specialEducationStudentCount).toBe(380);
    expect(gangnam?.registeredDisabledCount).toBe(18400);
  });
});

describe("buildDemandMasterReal — partial demand (11-3 1차-36)", () => {
  it("special education만 있고 disabled population 없는 region — 보존 + info issue (field: \"partialDemand\")", () => {
    const result = buildDemandMasterReal({
      specialEducation: [specialEd({ regionCode: "11680", specialEducationStudentCount: 380 })],
      disabledPopulation: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({
      regionCode: "11680",
      specialEducationStudentCount: 380,
    });
    expect(result.records[0].registeredDisabledCount).toBeUndefined();
    const partialIssues = result.issues.filter(
      (i) => i.field === "partialDemand",
    );
    expect(partialIssues.length).toBe(1);
    expect(partialIssues[0]).toMatchObject({
      severity: "info",
      datasetCategory: "A",
      field: "partialDemand",
    });
  });

  it("disabled population만 있고 special education 없는 region — 보존 + info issue", () => {
    const result = buildDemandMasterReal({
      specialEducation: [],
      disabledPopulation: [disabled({ regionCode: "11680", registeredDisabledCount: 18400 })],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({
      regionCode: "11680",
      registeredDisabledCount: 18400,
    });
    expect(result.records[0].specialEducationStudentCount).toBeUndefined();
    const partialIssues = result.issues.filter(
      (i) => i.field === "partialDemand",
    );
    expect(partialIssues.length).toBe(1);
  });

  it("양쪽 모두 있는 region은 partialDemand issue 없음", () => {
    const result = buildDemandMasterReal({
      specialEducation: [specialEd({ regionCode: "11680" })],
      disabledPopulation: [disabled({ regionCode: "11680" })],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    const partialIssues = result.issues.filter(
      (i) => i.field === "partialDemand",
    );
    expect(partialIssues.length).toBe(0);
  });
});

describe("buildDemandMasterReal — invalid regionCode 처리 (11-3 1차-36)", () => {
  it("admin_codes set에 없는 regionCode (special education) → record 제외 + warning issue (field: \"regionCode\")", () => {
    const result = buildDemandMasterReal({
      specialEducation: [
        specialEd({ regionCode: "11680", specialEducationStudentCount: 380 }),
        specialEd({ regionCode: "99999", specialEducationStudentCount: 100 }),
      ],
      disabledPopulation: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].regionCode).toBe("11680");
    const regionWarnings = result.issues.filter(
      (i) => i.severity === "warning" && i.field === "regionCode",
    );
    expect(regionWarnings.length).toBe(1);
    expect(regionWarnings[0]).toMatchObject({
      severity: "warning",
      datasetCategory: "A",
      field: "regionCode",
    });
    expect(regionWarnings[0].message).toContain("99999");
  });

  it("admin_codes set에 없는 regionCode (disabled population) → record 제외 + warning issue", () => {
    const result = buildDemandMasterReal({
      specialEducation: [],
      disabledPopulation: [
        disabled({ regionCode: "11680", registeredDisabledCount: 18400 }),
        disabled({ regionCode: "99999", registeredDisabledCount: 100 }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0].regionCode).toBe("11680");
    const regionWarnings = result.issues.filter(
      (i) => i.severity === "warning" && i.field === "regionCode",
    );
    expect(regionWarnings.length).toBe(1);
  });

  it("\"INVALID\" 문자열 regionCode → admin set 외라 제외 + warning issue (fixture invalid 시나리오)", () => {
    const result = buildDemandMasterReal({
      specialEducation: [
        specialEd({ regionCode: "INVALID", specialEducationStudentCount: 100 }),
      ],
      disabledPopulation: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(0);
    const regionWarnings = result.issues.filter(
      (i) => i.severity === "warning" && i.field === "regionCode",
    );
    expect(regionWarnings.length).toBe(1);
  });
});

describe("buildDemandMasterReal — edge cases (11-3 1차-36)", () => {
  it("두 입력 모두 빈 배열 → records=[], issues=[]", () => {
    const result = buildDemandMasterReal({
      specialEducation: [],
      disabledPopulation: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("빈 adminCodes → 모든 input record가 admin set 외라 제외 + warning issues", () => {
    const result = buildDemandMasterReal({
      specialEducation: [specialEd({ regionCode: "11680" })],
      disabledPopulation: [disabled({ regionCode: "11680" })],
      adminCodes: [],
    });
    expect(result.records.length).toBe(0);
    const regionWarnings = result.issues.filter(
      (i) => i.severity === "warning" && i.field === "regionCode",
    );
    expect(regionWarnings.length).toBe(2); // special education 1 + disabled population 1
  });

  it("입력 specialEducation 배열을 변형하지 않는다 (pure)", () => {
    const input = [specialEd({ regionCode: "11680" })];
    const snapshot = JSON.parse(JSON.stringify(input));
    buildDemandMasterReal({
      specialEducation: input,
      disabledPopulation: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(input).toEqual(snapshot);
  });

  it("입력 disabledPopulation 배열을 변형하지 않는다 (pure)", () => {
    const input = [disabled({ regionCode: "11680" })];
    const snapshot = JSON.parse(JSON.stringify(input));
    buildDemandMasterReal({
      specialEducation: [],
      disabledPopulation: input,
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(input).toEqual(snapshot);
  });
});

describe("buildDemandMasterReal — fixture proxy 시나리오 (11-3 1차-36)", () => {
  // data/fixtures/A_special_education_sample.json — 7 records (6 valid KOSTAT + 1 "INVALID")
  // data/fixtures/A_disabled_population_sample.json — 6 records (모두 valid KOSTAT)
  // adminCodes는 6건 모두 보유 가정.
  // expected: records=6 (6 valid KOSTAT region), warning issues=1 ("INVALID"만)
  //   + partialDemand issues=0 (6 region 모두 양쪽 보유)
  it("fixture 시나리오 — INVALID 1건 제외 + 6 valid region 모두 양쪽 보유 → records=6 / issues=1", () => {
    const adminAll: CleanedRegionCodeRecord[] = [
      { regionCode: "11680", regionCodeType: "sigungu" },
      { regionCode: "26350", regionCodeType: "sigungu" },
      { regionCode: "41117", regionCodeType: "sigungu" },
      { regionCode: "43113", regionCodeType: "sigungu" },
      { regionCode: "46110", regionCodeType: "sigungu" },
      { regionCode: "51110", regionCodeType: "sigungu" },
    ];
    const specialEdAll: CleanedSpecialEducationRecord[] = [
      specialEd({ regionCode: "11680", specialEducationStudentCount: 380 }),
      specialEd({ regionCode: "26350", specialEducationStudentCount: 295 }),
      specialEd({ regionCode: "41117", specialEducationStudentCount: 510 }),
      specialEd({ regionCode: "43113", specialEducationStudentCount: 240 }),
      specialEd({ regionCode: "46110", specialEducationStudentCount: 180 }),
      specialEd({ regionCode: "51110", specialEducationStudentCount: 210 }),
      specialEd({ regionCode: "INVALID", specialEducationStudentCount: 100 }),
    ];
    const disabledAll: CleanedDisabledPopulationRecord[] = [
      disabled({ regionCode: "11680", registeredDisabledCount: 18400 }),
      disabled({ regionCode: "26350", registeredDisabledCount: 16700 }),
      disabled({ regionCode: "41117", registeredDisabledCount: 12900 }),
      disabled({ regionCode: "43113", registeredDisabledCount: 13500 }),
      disabled({ regionCode: "46110", registeredDisabledCount: 11800 }),
      disabled({ regionCode: "51110", registeredDisabledCount: 12200 }),
    ];
    const result = buildDemandMasterReal({
      specialEducation: specialEdAll,
      disabledPopulation: disabledAll,
      adminCodes: adminAll,
    });
    expect(result.records.length).toBe(6);
    const codes = result.records.map((r) => r.regionCode).sort();
    expect(codes).toEqual(["11680", "26350", "41117", "43113", "46110", "51110"]);
    for (const r of result.records) {
      expect(r.specialEducationStudentCount).toBeGreaterThan(0);
      expect(r.registeredDisabledCount).toBeGreaterThan(0);
    }
    const regionWarnings = result.issues.filter(
      (i) => i.severity === "warning" && i.field === "regionCode",
    );
    expect(regionWarnings.length).toBe(1);
    expect(regionWarnings[0].message).toContain("INVALID");
    const partialIssues = result.issues.filter(
      (i) => i.field === "partialDemand",
    );
    expect(partialIssues.length).toBe(0);
  });
});
