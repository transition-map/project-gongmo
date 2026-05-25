/**
 * 11-3 1차-93 — buildScenarioFromProfile pure mapper 회귀 보호.
 *
 * legacy StudentProfile(한국어 6 필드)을 1차-89 비식별 StudentScenario로 변환한다.
 * UI 통합은 1차-95+ 별도 단계. 본 단계는 pure helper layer만 정착.
 */

import { describe, expect, it } from "vitest";
import { buildScenarioFromProfile } from "../buildScenarioFromProfile";
import * as moduleApi from "../buildScenarioFromProfile";
import type { StudentProfile } from "../../../types";

const DEFAULT_PROFILE: StudentProfile = {
  region: "서울 A권역",
  supportNeed: "진로탐색 지원",
  careerInterest: "직업체험",
  mobilityRange: "대중교통 30분 이내",
  activityPreference: "현장 체험",
  supportLevel: "중간 지원",
};

describe("buildScenarioFromProfile — region 매핑", () => {
  it("서울 A권역 → regionCode DEMO-SIGUNGU-01 + sidoCode 11", () => {
    const out = buildScenarioFromProfile(DEFAULT_PROFILE);
    expect(out.regionCode).toBe("DEMO-SIGUNGU-01");
    expect(out.sidoCode).toBe("11");
  });

  it("부산 B권역 → DEMO-SIGUNGU-02 + sidoCode 26", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      region: "부산 B권역",
    });
    expect(out.regionCode).toBe("DEMO-SIGUNGU-02");
    expect(out.sidoCode).toBe("26");
  });

  it("충청 C권역 → DEMO-SIGUNGU-03 + sidoCode 43", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      region: "충청 C권역",
    });
    expect(out.regionCode).toBe("DEMO-SIGUNGU-03");
    expect(out.sidoCode).toBe("43");
  });

  it("전남 D권역 → DEMO-SIGUNGU-04 + sidoCode 46", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      region: "전남 D권역",
    });
    expect(out.regionCode).toBe("DEMO-SIGUNGU-04");
    expect(out.sidoCode).toBe("46");
  });

  it("알려지지 않은 region은 안전한 default DEMO-SIGUNGU-01로 fallback", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      region: "알수없는 지역명",
    });
    expect(out.regionCode).toBe("DEMO-SIGUNGU-01");
  });
});

describe("buildScenarioFromProfile — careerInterest → interests 매핑", () => {
  it("'직업체험' → interests에 'vocationalExperience' 포함", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      careerInterest: "직업체험",
    });
    expect(out.interests).toContain("vocationalExperience");
  });

  it("'사무보조' → interests에 'employmentPreparation' 포함", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      careerInterest: "사무보조",
    });
    expect(out.interests).toContain("employmentPreparation");
  });

  it("'디지털 기초역량' / '사회서비스' / '문화예술' → careerExploration", () => {
    for (const c of ["디지털 기초역량", "사회서비스", "문화예술"]) {
      const out = buildScenarioFromProfile({
        ...DEFAULT_PROFILE,
        careerInterest: c,
      });
      expect(out.interests).toContain("careerExploration");
    }
  });

  it("interests는 비어 있지 않다 (default fallback)", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      careerInterest: "알수없는 관심분야",
    });
    expect(out.interests.length).toBeGreaterThan(0);
  });
});

describe("buildScenarioFromProfile — mobilityRange / onlineAllowed", () => {
  it("'온라인 참여 가능' → onlineAllowed true + commuteLimitMinutes 'online'", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      mobilityRange: "온라인 참여 가능",
    });
    expect(out.onlineAllowed).toBe(true);
    expect(out.commuteLimitMinutes).toBe("online");
  });

  it("'대중교통 30분 이내' → 30 + onlineAllowed false", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      mobilityRange: "대중교통 30분 이내",
    });
    expect(out.commuteLimitMinutes).toBe(30);
    expect(out.onlineAllowed).toBe(false);
  });

  it("'대중교통 1시간 이내' → 60", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      mobilityRange: "대중교통 1시간 이내",
    });
    expect(out.commuteLimitMinutes).toBe(60);
  });

  it("'거주지 인근' → 30 + onlineAllowed false", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      mobilityRange: "거주지 인근",
    });
    expect(out.commuteLimitMinutes).toBe(30);
    expect(out.onlineAllowed).toBe(false);
  });
});

describe("buildScenarioFromProfile — guardianConsultNeeded", () => {
  it("supportLevel '높은 지원' → guardianConsultNeeded true", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      supportLevel: "높은 지원",
    });
    expect(out.guardianConsultNeeded).toBe(true);
  });

  it("supportLevel '낮은 지원' → guardianConsultNeeded false", () => {
    const out = buildScenarioFromProfile({
      ...DEFAULT_PROFILE,
      supportLevel: "낮은 지원",
    });
    expect(out.guardianConsultNeeded).toBe(false);
  });
});

describe("buildScenarioFromProfile — PII 회귀 보호", () => {
  it("출력 StudentScenario에 PII 키가 없다", () => {
    const out = buildScenarioFromProfile(DEFAULT_PROFILE);
    const keys = Object.keys(out);
    const forbiddenKeys = [
      "name",
      "studentName",
      "schoolName",
      "addressDetail",
      "phone",
      "email",
      "birthday",
      "disabilityType",
      "disabilityGrade",
    ];
    for (const forbidden of forbiddenKeys) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("schoolStage는 'demo'로 안전 default (StudentProfile에 schoolStage 부재)", () => {
    const out = buildScenarioFromProfile(DEFAULT_PROFILE);
    expect(out.schoolStage).toBe("demo");
  });
});

describe("buildScenarioFromProfile — 자동 추천 helper 미등장 회귀", () => {
  it("자동 확정성 / PII helper export 0건", () => {
    const exported = Object.keys(moduleApi);
    const forbidden = [
      "autoRecommendFinal",
      "policyDecision",
      "mustImplement",
      "decideRoute",
      "readStudentName",
      "extractStudentName",
    ];
    for (const f of forbidden) {
      expect(exported).not.toContain(f);
    }
  });
});
