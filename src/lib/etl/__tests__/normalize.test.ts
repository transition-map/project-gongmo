import { describe, expect, it } from "vitest";
import {
  normalizeAddress,
  normalizeCoordinate,
  normalizeInstitutionId,
  normalizeJobCode,
  normalizeNcsCode,
  normalizeRegionCode,
  normalizeSchoolId,
} from "../normalize";
import type { DataQualityIssue, IssueCollector } from "../types";

function makeCollector(): {
  collect: IssueCollector;
  issues: DataQualityIssue[];
} {
  const issues: DataQualityIssue[] = [];
  return {
    collect: (issue) => issues.push(issue),
    issues,
  };
}

describe("normalizeRegionCode", () => {
  it("2자리 → sido", () => {
    expect(normalizeRegionCode({ raw: "11" }).regionCodeType).toBe("sido");
  });

  it("5자리 → sigungu", () => {
    const out = normalizeRegionCode({ raw: "11680" });
    expect(out.regionCodeType).toBe("sigungu");
    expect(out.sidoCode).toBe("11");
    expect(out.sigunguCode).toBe("11680");
  });

  it("8자리 → haengjeongDong", () => {
    expect(normalizeRegionCode({ raw: "11680101" }).regionCodeType).toBe(
      "haengjeongDong",
    );
  });

  it("10자리 → legalDong", () => {
    const out = normalizeRegionCode({ raw: "1168010100" });
    expect(out.regionCodeType).toBe("legalDong");
    expect(out.legalDongCode).toBe("1168010100");
  });

  it("선행 0 보존 (string 그대로)", () => {
    const out = normalizeRegionCode({ raw: "01680" });
    expect(out.regionCode).toBe("01680");
  });

  it("비정상 입력 ('abc') → IssueCollector 호출", () => {
    const { collect, issues } = makeCollector();
    normalizeRegionCode({ raw: "abc", collectIssue: collect });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe("regionCode");
  });

  it("expectedLevel mismatch → issue", () => {
    const { collect, issues } = makeCollector();
    normalizeRegionCode({
      raw: "11",
      expectedLevel: "sigungu",
      collectIssue: collect,
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("throw 없음", () => {
    expect(() => normalizeRegionCode({ raw: "" })).not.toThrow();
    expect(() => normalizeRegionCode({ raw: "abc" })).not.toThrow();
  });
});

describe("normalizeSchoolId", () => {
  it("NEIS 코드 우선 → school:neis:{code}", () => {
    const out = normalizeSchoolId({
      neisSchoolCode: "7530001",
      schoolName: "테스트학교",
      source: "neis",
    });
    expect(out.schoolId).toBe("school:neis:7530001");
    expect(out.neisSchoolCode).toBe("7530001");
  });

  it("NEIS 부재 시 source + slug 기반 ID", () => {
    const out = normalizeSchoolId({
      schoolName: "강남특수학교",
      address: "서울특별시 강남구",
      source: "demo",
    });
    expect(out.schoolId).toMatch(/^school:demo:/);
    expect(out.neisSchoolCode).toBeUndefined();
  });

  it("schoolName 빈 문자열 → IssueCollector + unknown id", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeSchoolId({
      schoolName: "",
      source: "demo",
      collectIssue: collect,
    });
    expect(out.schoolId).toBe("school:demo:unknown");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("throw 없음", () => {
    expect(() => normalizeSchoolId({ schoolName: "", source: "x" })).not.toThrow();
  });
});

describe("normalizeInstitutionId", () => {
  it("sourceId 있으면 inst:{type}:{source}:{sourceId}", () => {
    const out = normalizeInstitutionId({
      institutionType: "welfareCenter",
      source: "mohw",
      sourceId: "WC-001",
      institutionName: "X복지관",
    });
    expect(out.institutionId).toBe("inst:welfareCenter:mohw:WC-001");
  });

  it("sourceId 부재 → slug fallback", () => {
    const out = normalizeInstitutionId({
      institutionType: "trainingCenter",
      source: "demo",
      institutionName: "강남훈련센터",
      address: "서울특별시 강남구",
    });
    expect(out.institutionId).toMatch(/^inst:trainingCenter:demo:/);
    expect(out.institutionId).not.toContain("unknown");
  });

  it("institutionName 빈 문자열 → unknown + issue", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeInstitutionId({
      institutionType: "supportCenter",
      source: "demo",
      institutionName: "",
      collectIssue: collect,
    });
    expect(out.institutionId).toBe("inst:supportCenter:demo:unknown");
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("normalizeJobCode", () => {
  it("KECO 4~7자리 → jobCode", () => {
    expect(normalizeJobCode({ raw: "1234" }).jobCode).toBe("1234");
    expect(normalizeJobCode({ raw: "1234567" }).jobCode).toBe("1234567");
  });

  it("preferredSystem='worknet' + KECO 형식 → worknetJobCode", () => {
    const out = normalizeJobCode({
      raw: "1234567",
      preferredSystem: "worknet",
    });
    expect(out.worknetJobCode).toBe("1234567");
    expect(out.jobCode).toBeUndefined();
  });

  it("비KECO 형식 → worknetJobCode + issue", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeJobCode({ raw: "WK-XYZ-001", collectIssue: collect });
    expect(out.worknetJobCode).toBe("WK-XYZ-001");
    expect(out.jobCode).toBeUndefined();
    expect(issues.length).toBeGreaterThan(0);
  });

  it("빈 입력 → 빈 결과", () => {
    expect(normalizeJobCode({ raw: "" })).toEqual({});
  });
});

describe("normalizeNcsCode", () => {
  it("XX-X-XXX-X 형식 검증", () => {
    expect(normalizeNcsCode({ raw: "20-1-001-1" }).ncsCode).toBe("20-1-001-1");
  });

  it("비매칭 → undefined + issue", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeNcsCode({ raw: "INVALID", collectIssue: collect });
    expect(out.ncsCode).toBeUndefined();
    expect(issues.length).toBeGreaterThan(0);
  });

  it("빈 입력 → 빈 결과 (issue 없음)", () => {
    const { collect, issues } = makeCollector();
    expect(normalizeNcsCode({ raw: "", collectIssue: collect })).toEqual({});
    expect(issues).toHaveLength(0);
  });
});

describe("normalizeCoordinate", () => {
  it("정상 좌표 → verified", () => {
    const out = normalizeCoordinate({ rawLat: 37.51, rawLng: 127.06 });
    expect(out.coordinate.lat).toBe(37.51);
    expect(out.coordinate.lng).toBe(127.06);
    expect(out.coordinate.geocodingStatus).toBe("verified");
  });

  it("문자열 입력 → 숫자 변환", () => {
    const out = normalizeCoordinate({ rawLat: "37.51", rawLng: "127.06" });
    expect(out.coordinate.lat).toBe(37.51);
  });

  it("좌표 누락 → geocodingStatus: 'missing'", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeCoordinate({ collectIssue: collect });
    expect(out.coordinate.geocodingStatus).toBe("missing");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("범위 밖 좌표 (북극) → approximate + issue", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeCoordinate({
      rawLat: 89,
      rawLng: 0,
      collectIssue: collect,
    });
    expect(out.coordinate.geocodingStatus).toBe("approximate");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("소수점 6자리 반올림", () => {
    const out = normalizeCoordinate({
      rawLat: 37.5123456789,
      rawLng: 127.0654321987,
    });
    expect(out.coordinate.lat).toBe(37.512346);
    expect(out.coordinate.lng).toBe(127.065432);
  });
});

describe("normalizeAddress", () => {
  it("공백 정리", () => {
    const out = normalizeAddress({ raw: "  서울특별시   강남구   역삼동  " });
    expect(out.address).toBe("서울특별시 강남구 역삼동");
  });

  it("시도명 일부 통일 ('서울시' → '서울특별시')", () => {
    const out = normalizeAddress({ raw: "서울시 강남구" });
    expect(out.address).toBe("서울특별시 강남구");
    expect(out.sidoName).toBe("서울특별시");
  });

  it("토큰 분리 (sido/sigungu/emd)", () => {
    const out = normalizeAddress({ raw: "서울특별시 강남구 역삼동" });
    expect(out.sidoName).toBe("서울특별시");
    expect(out.sigunguName).toBe("강남구");
    expect(out.emdName).toBe("역삼동");
  });

  it("빈 입력 → issue", () => {
    const { collect, issues } = makeCollector();
    const out = normalizeAddress({ raw: "", collectIssue: collect });
    expect(out.address).toBe("");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("throw 없음", () => {
    expect(() => normalizeAddress({ raw: "" })).not.toThrow();
  });
});

describe("모든 normalize 함수 — throw 안 함", () => {
  it("비정상 입력 다양한 케이스에서 throw 없음", () => {
    expect(() => normalizeRegionCode({ raw: "" })).not.toThrow();
    expect(() => normalizeSchoolId({ schoolName: "", source: "" })).not.toThrow();
    expect(() =>
      normalizeInstitutionId({
        institutionType: "supportCenter",
        source: "",
        institutionName: "",
      }),
    ).not.toThrow();
    expect(() => normalizeJobCode({ raw: "" })).not.toThrow();
    expect(() => normalizeNcsCode({ raw: "" })).not.toThrow();
    expect(() =>
      normalizeCoordinate({ rawLat: "abc", rawLng: "xyz" }),
    ).not.toThrow();
    expect(() => normalizeAddress({ raw: "" })).not.toThrow();
  });
});
