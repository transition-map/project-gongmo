import { describe, expect, it } from "vitest";
import {
  computeAccessibilityIndex,
  computeDemandIndex,
  computeEmploymentIndex,
  computeSchoolSupportIndex,
  computeTrainingSupplyIndex,
  computeTransitionGapIndex,
  computeWelfareIndex,
  extractRawMetrics,
} from "../calculateIndicators";
import { RAW_KEYS } from "../config";
import type { RawMetrics } from "../../../types";

const ZERO_SCORES = {
  demandIndex: 0,
  schoolSupportIndex: 0,
  trainingSupplyIndex: 0,
  employmentIndex: 0,
  welfareIndex: 0,
  accessibilityIndex: 0,
};

function withinRange(v: number) {
  return v >= 0 && v <= 100 && Number.isInteger(v);
}

describe("computeDemandIndex", () => {
  it("빈 입력에서 0 반환 (throw 없음)", () => {
    expect(() => computeDemandIndex({})).not.toThrow();
    expect(computeDemandIndex({})).toBe(0);
  });

  it("0~100 범위", () => {
    const v = computeDemandIndex({
      [RAW_KEYS.specialEducationStudents]: 500,
      [RAW_KEYS.registeredDisabledYouth]: 2500,
    });
    expect(withinRange(v)).toBe(true);
  });

  it("수요 수치가 클수록 높은 점수", () => {
    const low = computeDemandIndex({
      [RAW_KEYS.specialEducationStudents]: 100,
    });
    const high = computeDemandIndex({
      [RAW_KEYS.specialEducationStudents]: 900,
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe("computeSchoolSupportIndex", () => {
  it("빈 입력에서 0", () => {
    expect(computeSchoolSupportIndex({})).toBe(0);
  });

  it("자원이 많을수록 높은 점수", () => {
    const low = computeSchoolSupportIndex({
      [RAW_KEYS.specialSchools]: 1,
      [RAW_KEYS.specialClasses]: 5,
      [RAW_KEYS.specialEducationTeachers]: 30,
      [RAW_KEYS.supportCenters]: 1,
      [RAW_KEYS.schoolAccessibilityFacilities]: 10,
    });
    const high = computeSchoolSupportIndex({
      [RAW_KEYS.specialSchools]: 5,
      [RAW_KEYS.specialClasses]: 30,
      [RAW_KEYS.specialEducationTeachers]: 200,
      [RAW_KEYS.supportCenters]: 3,
      [RAW_KEYS.schoolAccessibilityFacilities]: 50,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBe(100);
  });
});

describe("computeTrainingSupplyIndex", () => {
  it("빈 입력에서 0", () => {
    expect(computeTrainingSupplyIndex({})).toBe(0);
  });

  it("훈련기관·프로그램 수가 많을수록 높은 점수", () => {
    const low = computeTrainingSupplyIndex({
      [RAW_KEYS.trainingInstitutions]: 1,
      [RAW_KEYS.trainingPrograms]: 5,
    });
    const high = computeTrainingSupplyIndex({
      [RAW_KEYS.trainingInstitutions]: 8,
      [RAW_KEYS.trainingPrograms]: 30,
      [RAW_KEYS.careerExperiencePrograms]: 20,
      [RAW_KEYS.disabilityFocusedTrainingPrograms]: 20,
      [RAW_KEYS.jobCategoryDiversity]: 10,
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe("computeEmploymentIndex", () => {
  it("빈 입력에서 0", () => {
    expect(computeEmploymentIndex({})).toBe(0);
  });

  it("구인·취업성과가 높을수록 높은 점수", () => {
    const low = computeEmploymentIndex({
      [RAW_KEYS.disabledJobPostings]: 5,
      [RAW_KEYS.employmentOutcomes]: 30,
    });
    const high = computeEmploymentIndex({
      [RAW_KEYS.disabledJobPostings]: 50,
      [RAW_KEYS.employmentOutcomes]: 95,
      [RAW_KEYS.majorJobCategoryCount]: 10,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("employmentOutcomes(고용률 %)가 100 초과여도 안전", () => {
    const v = computeEmploymentIndex({
      [RAW_KEYS.employmentOutcomes]: 150,
    });
    expect(withinRange(v)).toBe(true);
  });
});

describe("computeWelfareIndex", () => {
  it("빈 입력에서 0", () => {
    expect(computeWelfareIndex({})).toBe(0);
  });

  it("복지시설·정원·프로그램이 많을수록 높은 점수", () => {
    const low = computeWelfareIndex({
      [RAW_KEYS.welfareCenters]: 1,
      [RAW_KEYS.dayCareFacilities]: 1,
    });
    const high = computeWelfareIndex({
      [RAW_KEYS.welfareCenters]: 5,
      [RAW_KEYS.dayCareFacilities]: 5,
      [RAW_KEYS.vocationalRehabFacilities]: 5,
      [RAW_KEYS.welfareCapacity]: 500,
      [RAW_KEYS.welfareProgramCount]: 30,
    });
    expect(high).toBeGreaterThan(low);
    expect(high).toBe(100);
  });
});

describe("computeAccessibilityIndex", () => {
  it("accessibilityScore가 있으면 그대로 우선 사용", () => {
    const v = computeAccessibilityIndex({
      [RAW_KEYS.accessibilityScore]: 75,
      // 보조 산식 입력은 무시되어야 함
      [RAW_KEYS.lowFloorBusRate]: 10,
      [RAW_KEYS.barrierFreeFacilityCount]: 0,
    });
    expect(v).toBe(75);
  });

  it("accessibilityScore 부재 시 보조 산식 fallback", () => {
    const v = computeAccessibilityIndex({
      [RAW_KEYS.lowFloorBusRate]: 80,
      [RAW_KEYS.accessibleBusStopCount]: 500,
      [RAW_KEYS.specialTransportVehicleCount]: 50,
      [RAW_KEYS.barrierFreeFacilityCount]: 1500,
    });
    expect(v).toBeGreaterThan(0);
    expect(withinRange(v)).toBe(true);
  });

  it("accessibilityScore가 NaN/Infinity면 보조 산식 fallback", () => {
    const v = computeAccessibilityIndex({
      [RAW_KEYS.accessibilityScore]: NaN,
      [RAW_KEYS.lowFloorBusRate]: 60,
      [RAW_KEYS.barrierFreeFacilityCount]: 1000,
    });
    expect(withinRange(v)).toBe(true);
  });

  it("빈 입력에서 0", () => {
    expect(computeAccessibilityIndex({})).toBe(0);
  });
});

describe("computeTransitionGapIndex", () => {
  it("0~100 정수 범위", () => {
    const v = computeTransitionGapIndex(ZERO_SCORES);
    expect(withinRange(v)).toBe(true);
  });

  it("수요 높고 자원 낮을 때 더 높게 나옴", () => {
    const highGap = computeTransitionGapIndex({
      demandIndex: 90,
      schoolSupportIndex: 30,
      trainingSupplyIndex: 30,
      employmentIndex: 30,
      welfareIndex: 30,
      accessibilityIndex: 30,
    });
    const lowGap = computeTransitionGapIndex({
      demandIndex: 30,
      schoolSupportIndex: 90,
      trainingSupplyIndex: 90,
      employmentIndex: 90,
      welfareIndex: 90,
      accessibilityIndex: 90,
    });
    expect(highGap).toBeGreaterThan(lowGap);
  });

  it("모든 입력이 50이면 50 반환 (가중치 합 1.0 검증)", () => {
    // demandIndex 50 + (100-50)*5 가중치 합 = 50*0.4 + 50*0.6 = 50
    const v = computeTransitionGapIndex({
      demandIndex: 50,
      schoolSupportIndex: 50,
      trainingSupplyIndex: 50,
      employmentIndex: 50,
      welfareIndex: 50,
      accessibilityIndex: 50,
    });
    expect(v).toBe(50);
  });

  it("모든 입력 0 → 60 (자원 0이라 (100-0)*0.6 = 60)", () => {
    expect(computeTransitionGapIndex(ZERO_SCORES)).toBe(60);
  });
});

describe("extractRawMetrics", () => {
  const baseInput = {
    region: { regionCode: "TEST-01", regionName: "테스트시" },
    schools: [],
    institutions: [],
    trainingPrograms: [],
    careerExperiencePrograms: [],
    jobPostings: [],
    welfareFacilities: [],
    mobilityAccess: [],
  };

  it("빈 입력에서 throw하지 않고 RawMetrics 반환", () => {
    expect(() => extractRawMetrics(baseInput)).not.toThrow();
    const rm: RawMetrics = extractRawMetrics(baseInput);
    expect(rm[RAW_KEYS.specialEducationStudents]).toBe(0);
    expect(rm[RAW_KEYS.disabledJobPostings]).toBe(0);
  });

  it("schools에서 specialSchools/specialClasses 카운트", () => {
    const rm = extractRawMetrics({
      ...baseInput,
      schools: [
        {
          schoolId: "s1",
          schoolName: "A",
          schoolType: "specialSchool",
        },
        {
          schoolId: "s2",
          schoolName: "B",
          schoolType: "specialClassInGeneralSchool",
        },
        {
          schoolId: "s3",
          schoolName: "C",
          schoolType: "specialSchool",
        },
      ],
    });
    expect(rm[RAW_KEYS.specialSchools]).toBe(2);
    expect(rm[RAW_KEYS.specialClasses]).toBe(1);
  });

  it("jobPostings에서 unique jobCode 카운트 (undefined 제외)", () => {
    const rm = extractRawMetrics({
      ...baseInput,
      jobPostings: [
        { jobPostingId: "j1", jobTitle: "A", jobCode: "DEMO-1" },
        { jobPostingId: "j2", jobTitle: "B", jobCode: "DEMO-1" },
        { jobPostingId: "j3", jobTitle: "C", jobCode: "DEMO-2" },
        { jobPostingId: "j4", jobTitle: "D" }, // jobCode 없음
      ],
    });
    expect(rm[RAW_KEYS.majorJobCategoryCount]).toBe(2);
    expect(rm[RAW_KEYS.disabledJobPostings]).toBe(4);
  });

  it("mobilityAccess에서 selectedBaseYear에 맞는 항목 선택", () => {
    const rm = extractRawMetrics({
      ...baseInput,
      mobilityAccess: [
        {
          regionCode: "TEST-01",
          accessibilityScore: 50,
          meta: { baseYear: 2025 },
        },
        {
          regionCode: "TEST-01",
          accessibilityScore: 80,
          meta: { baseYear: 2026 },
        },
      ],
      selectedBaseYear: 2025,
    });
    expect(rm[RAW_KEYS.accessibilityScore]).toBe(50);
  });

  it("selectedBaseYear 미지정 시 가장 최근 baseYear 자동 선택", () => {
    const rm = extractRawMetrics({
      ...baseInput,
      mobilityAccess: [
        {
          regionCode: "TEST-01",
          accessibilityScore: 50,
          meta: { baseYear: 2025 },
        },
        {
          regionCode: "TEST-01",
          accessibilityScore: 80,
          meta: { baseYear: 2026 },
        },
      ],
    });
    expect(rm[RAW_KEYS.accessibilityScore]).toBe(80);
  });
});
