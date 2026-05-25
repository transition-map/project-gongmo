/**
 * buildSchoolMasterReal.test.ts — 11-3 1차-23 B school master.real (G admin lookup).
 *
 * 정책 (사용자 합의값 §1-7):
 * - regionCode 부여는 master 단계의 책임 (CLAUDE.md §4 단방향 5단계 원칙 일관).
 * - school.sidoName + school.sigunguName을 G admin_codes.sidoName + sigunguName과 exact match.
 * - 안전한 정규화만(trim + 내부 공백 collapse). alias / hardcode / fake mapping 금지.
 * - 매칭 실패 record는 master records에서 제외 + warning issue (field: "regionCode").
 * - MasterSchoolRecord schema 무변경 (sidoCode/sigunguCode 필드 추가 X).
 * - mini fixture sigunguName="시연구" 매칭 실패는 정책상 정상.
 */

import { describe, expect, it } from "vitest";
import { buildSchoolMasterReal } from "../master/buildSchoolMasterReal";
import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";

// G admin 271건 중 disambiguation 검증에 필요한 핵심 4건만 sample로 추출.
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
    regionCode: "11500",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11500",
    sidoName: "서울특별시",
    sigunguName: "강서구",
  },
  {
    regionCode: "26440",
    regionCodeType: "sigungu",
    sidoCode: "26",
    sigunguCode: "26440",
    sidoName: "부산광역시",
    sigunguName: "강서구",
  },
  {
    regionCode: "30110",
    regionCodeType: "sigungu",
    sidoCode: "30",
    sigunguCode: "30110",
    sidoName: "대전광역시",
    sigunguName: "동구",
  },
];

function school(overrides: Partial<{
  schoolId: string;
  neisSchoolCode: string | null;
  schoolName: string;
  schoolLevel: string;
  schoolType: string | null;
  establishmentType: string | null;
  address: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  latitude: number | null;
  longitude: number | null;
}> = {}) {
  return {
    schoolId: "school:test:001",
    neisSchoolCode: null,
    schoolName: "테스트학교",
    schoolLevel: "elementary",
    schoolType: null,
    establishmentType: null,
    address: null,
    sidoName: null,
    sigunguName: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

describe("buildSchoolMasterReal — 매칭 성공 (11-3 1차-23)", () => {
  it("school sidoName + sigunguName이 admin에 있으면 regionCode 부여 + record 포함", () => {
    const input = {
      schools: [
        school({
          schoolId: "s1",
          schoolName: "강남초등학교",
          sidoName: "서울특별시",
          sigunguName: "강남구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(1);
    expect(result.records[0].regionCode).toBe("11680");
    expect(result.records[0].regionCodeType).toBe("sigungu");
    expect(result.issues).toEqual([]);
  });

  it("MasterSchoolRecord 필드 보존 (schoolId / neisSchoolCode / schoolName / schoolType / address / sidoName / sigunguName)", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-keep",
          neisSchoolCode: "B000000001",
          schoolName: "강남고",
          schoolType: "general",
          address: "서울특별시 강남구 어딘가 1",
          sidoName: "서울특별시",
          sigunguName: "강남구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records[0]).toMatchObject({
      schoolId: "s-keep",
      neisSchoolCode: "B000000001",
      schoolName: "강남고",
      schoolType: "general",
      regionCode: "11680",
      regionCodeType: "sigungu",
      address: "서울특별시 강남구 어딘가 1",
      sidoName: "서울특별시",
      sigunguName: "강남구",
    });
  });

  it("MasterSchoolRecord에는 sidoCode/sigunguCode 필드를 추가하지 않는다 (1차-23 schema 무변경)", () => {
    const input = {
      schools: [
        school({ sidoName: "서울특별시", sigunguName: "강남구" }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records[0]).not.toHaveProperty("sidoCode");
    expect(result.records[0]).not.toHaveProperty("sigunguCode");
  });
});

describe("buildSchoolMasterReal — sidoName disambiguation (11-3 1차-23)", () => {
  it("서울 강서구 → regionCode 11500 (부산 강서구와 disambiguation)", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-seoul-gangseo",
          sidoName: "서울특별시",
          sigunguName: "강서구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records[0].regionCode).toBe("11500");
    expect(result.issues).toEqual([]);
  });

  it("부산 강서구 → regionCode 26440 (서울 강서구와 disambiguation)", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-busan-gangseo",
          sidoName: "부산광역시",
          sigunguName: "강서구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records[0].regionCode).toBe("26440");
    expect(result.issues).toEqual([]);
  });
});

describe("buildSchoolMasterReal — 매칭 실패 (11-3 1차-23)", () => {
  it("sigunguName이 admin set에 없음 → record 제외 + warning issue", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-fail",
          sidoName: "서울특별시",
          sigunguName: "없는구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].datasetCategory).toBe("B");
    expect(result.issues[0].field).toBe("regionCode");
    expect(result.issues[0].message).toContain("없는구");
    expect(result.issues[0].message).toContain("서울특별시");
  });

  it("sidoName이 admin set에 없음 → record 제외 + warning issue", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-fail-sido",
          sidoName: "없는도",
          sigunguName: "강남구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("regionCode");
    expect(result.issues[0].message).toContain("없는도");
  });

  it("sidoName null → record 제외 + warning", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-null-sido",
          sidoName: null,
          sigunguName: "강남구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("regionCode");
  });

  it("sigunguName null → record 제외 + warning", () => {
    const input = {
      schools: [
        school({
          schoolId: "s-null-sigungu",
          sidoName: "서울특별시",
          sigunguName: null,
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("regionCode");
  });

  it("sidoName 빈 문자열 → record 제외 + warning", () => {
    const input = {
      schools: [school({ sidoName: "", sigunguName: "강남구" })],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
  });

  it("admin codes 빈 배열 → 모든 school 매칭 실패", () => {
    const input = {
      schools: [
        school({ sidoName: "서울특별시", sigunguName: "강남구" }),
      ],
      adminCodes: [],
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
  });
});

describe("buildSchoolMasterReal — 정규화 (11-3 1차-23)", () => {
  it("school sidoName/sigunguName trim 후 매칭 성공", () => {
    const input = {
      schools: [
        school({
          sidoName: "  서울특별시  ",
          sigunguName: "  강남구  ",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(1);
    expect(result.records[0].regionCode).toBe("11680");
  });

  it("school sidoName 내부 다중 공백 collapse 후 매칭", () => {
    const input = {
      schools: [
        school({
          sidoName: "서울   특별시",
          sigunguName: "강남구",
        }),
      ],
      adminCodes: [
        {
          regionCode: "11680",
          regionCodeType: "sigungu",
          sidoCode: "11",
          sigunguCode: "11680",
          sidoName: "서울 특별시",
          sigunguName: "강남구",
        } as CleanedRegionCodeRecord,
      ],
    };
    const result = buildSchoolMasterReal(input);
    // "서울   특별시" → "서울 특별시" → admin "서울 특별시" 매칭
    expect(result.records.length).toBe(1);
  });
});

describe("buildSchoolMasterReal — edge cases (11-3 1차-23)", () => {
  it("빈 school 배열 → records=[], issues=[]", () => {
    const result = buildSchoolMasterReal({
      schools: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("여러 school 일부 성공 + 일부 실패 (혼합)", () => {
    const input = {
      schools: [
        school({
          schoolId: "ok-1",
          sidoName: "서울특별시",
          sigunguName: "강남구",
        }),
        school({
          schoolId: "fail-1",
          sidoName: "서울특별시",
          sigunguName: "없는구",
        }),
        school({
          schoolId: "ok-2",
          sidoName: "대전광역시",
          sigunguName: "동구",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    };
    const result = buildSchoolMasterReal(input);
    expect(result.records.length).toBe(2);
    expect(result.records.map((r) => r.schoolId).sort()).toEqual([
      "ok-1",
      "ok-2",
    ]);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].message).toContain("없는구");
  });
});

describe("buildSchoolMasterReal — mini fixture 시나리오 (11-3 1차-23)", () => {
  // B_schools_mini.json 3건은 모두 sigunguName="시연구"로 가공된 demo 데이터.
  // 실 G admin 271건에는 "시연구"가 없으므로 매칭 실패가 **정상**.
  // 실 raw 학교알리미/NEIS 데이터 도입 시 실 sidoName/sigunguName이 들어와 매칭 성공 예정.
  it("mini fixture sigunguName='시연구' 3건 → records=0 + issues=3 (정책상 정상)", () => {
    const miniFixtureSchools = [
      school({
        schoolId: "school:demo:seoul-elem-a",
        schoolName: "서울시연초등학교 A",
        sidoName: "서울특별시",
        sigunguName: "시연구",
      }),
      school({
        schoolId: "school:demo:busan-mid-b",
        schoolName: "부산시연중학교 B",
        sidoName: "부산광역시",
        sigunguName: "시연구",
      }),
      school({
        schoolId: "school:demo:daejeon-special-c",
        schoolName: "대전시연특수학교 C",
        sidoName: "대전광역시",
        sigunguName: "시연구",
      }),
    ];
    const result = buildSchoolMasterReal({
      schools: miniFixtureSchools,
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(3);
    // 모든 issue가 regionCode field + warning severity
    for (const issue of result.issues) {
      expect(issue.field).toBe("regionCode");
      expect(issue.severity).toBe("warning");
      expect(issue.datasetCategory).toBe("B");
      expect(issue.message).toContain("시연구");
    }
  });
});
