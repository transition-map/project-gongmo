import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  careerExperienceService,
  employmentOutcomeService,
  institutionService,
  jobPostingService,
  mobilityService,
  recommendationService,
  regionService,
  schoolService,
  trainingService,
  transitionIndexService,
  welfareService,
} from "../index";
import { setDataAdapter } from "../_adapter";
import { mockAdapter } from "../adapters/mockAdapter";
import { httpAdapter } from "../adapters/httpAdapter";

describe("service layer (mockAdapter active)", () => {
  beforeEach(() => {
    setDataAdapter(mockAdapter);
  });

  afterEach(() => {
    setDataAdapter(mockAdapter);
  });

  it("regionService.getRegions() → success:true, 7 regions (11-2 1차-11: +DEMO-SIGUNGU-07-PARTIAL)", async () => {
    const resp = await regionService.getRegions();
    expect(resp.success).toBe(true);
    expect(resp.data?.length).toBe(7);
  });

  it("regionService.getRegions() includes DEMO-SIGUNGU-07-PARTIAL with partialRegionFlag=true (11-2 1차-11)", async () => {
    const resp = await regionService.getRegions();
    expect(resp.success).toBe(true);
    const partial = resp.data?.find(
      (r) => r.regionCode === "DEMO-SIGUNGU-07-PARTIAL",
    );
    expect(partial, "partial region should exist").toBeDefined();
    expect(partial?.partialRegionFlag).toBe(true);
  });

  it("기존 6개 region은 partialRegionFlag undefined 또는 false 유지 (11-2 1차-11)", async () => {
    const resp = await regionService.getRegions();
    expect(resp.success).toBe(true);
    const existingCodes = [
      "DEMO-SIGUNGU-01",
      "DEMO-SIGUNGU-02",
      "DEMO-SIGUNGU-03",
      "DEMO-SIGUNGU-04",
      "DEMO-SIGUNGU-05",
      "DEMO-SIGUNGU-06",
    ];
    for (const code of existingCodes) {
      const rec = resp.data?.find((r) => r.regionCode === code);
      expect(rec, `region ${code} should exist`).toBeDefined();
      expect(rec?.partialRegionFlag ?? false).toBe(false);
    }
  });

  it("transitionIndexService.getTransitionIndexByRegion('DEMO-SIGUNGU-07-PARTIAL') → transitionGapIndex=60 (11-2 1차-11)", async () => {
    const resp = await transitionIndexService.getTransitionIndexByRegion(
      "DEMO-SIGUNGU-07-PARTIAL",
    );
    expect(resp.success).toBe(true);
    expect(resp.data?.indicators?.transitionGapIndex).toBe(60);
  });

  it("regionService.getRegionByCode(existing) → 단일 지역", async () => {
    const resp = await regionService.getRegionByCode("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    expect(resp.data?.regionCode).toBe("DEMO-SIGUNGU-01");
  });

  it("getRegionByCode(nonexistent) → success:true, data:undefined", async () => {
    const resp = await regionService.getRegionByCode("NOT-EXIST");
    expect(resp.success).toBe(true);
    expect(resp.data).toBeUndefined();
  });

  it("schoolService.getSchoolsByRegion → regionCode로 필터링", async () => {
    const resp = await schoolService.getSchoolsByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    expect(resp.data?.length).toBe(2);
    for (const school of resp.data ?? []) {
      expect(school.region?.regionCode).toBe("DEMO-SIGUNGU-01");
    }
  });

  it("institutionService.getInstitutionsByType('welfareCenter') → 4개", async () => {
    const resp = await institutionService.getInstitutionsByType("welfareCenter");
    expect(resp.success).toBe(true);
    expect(resp.data?.length).toBe(4);
  });

  it("mobilityService.getMobilityAccessByRegion(code, 2026) → 2026만", async () => {
    const resp = await mobilityService.getMobilityAccessByRegion(
      "DEMO-SIGUNGU-01",
      2026,
    );
    expect(resp.success).toBe(true);
    expect(resp.data?.length).toBe(1);
    expect(resp.data?.[0].meta?.baseYear).toBe(2026);
  });

  it("mobilityService.getMobilityAccessByRegion(code) → 2025+2026 두 항목", async () => {
    const resp =
      await mobilityService.getMobilityAccessByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    expect(resp.data?.length).toBe(2);
  });

  it("transitionIndexService → demo-v0 반환", async () => {
    const resp =
      await transitionIndexService.getTransitionIndexByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    expect(resp.data?.indicatorVersion).toBe("demo-v0");
  });

  it("recommendationService → RecommendationResult 반환", async () => {
    const resp =
      await recommendationService.getRecommendationsByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    expect(resp.data?.candidates).toBeDefined();
    expect(resp.data?.candidates.length).toBeGreaterThan(0);
  });

  it("trainingService.getTrainingProgramsByRegion → regionCode 필터", async () => {
    const resp =
      await trainingService.getTrainingProgramsByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    for (const t of resp.data ?? []) {
      expect(t.region?.regionCode).toBe("DEMO-SIGUNGU-01");
    }
  });

  it("careerExperienceService → regionCode 필터", async () => {
    const resp =
      await careerExperienceService.getCareerExperienceProgramsByRegion(
        "DEMO-SIGUNGU-01",
      );
    expect(resp.success).toBe(true);
  });

  it("jobPostingService → regionCode 필터", async () => {
    const resp =
      await jobPostingService.getJobPostingsByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
    for (const j of resp.data ?? []) {
      expect(j.region?.regionCode).toBe("DEMO-SIGUNGU-01");
    }
  });

  it("employmentOutcomeService → 시군구 단일 결과", async () => {
    const resp =
      await employmentOutcomeService.getEmploymentOutcomeByRegion(
        "DEMO-SIGUNGU-01",
      );
    expect(resp.success).toBe(true);
    expect(resp.data?.regionCode).toBe("DEMO-SIGUNGU-01");
  });

  it("welfareService → regionCode 필터", async () => {
    const resp =
      await welfareService.getWelfareFacilitiesByRegion("DEMO-SIGUNGU-01");
    expect(resp.success).toBe(true);
  });

  it("mockAdapter shallow copy — 응답 배열 변형이 다음 호출에 영향 없음 (11-2 1차-11: 7 regions)", async () => {
    const r1 = await regionService.getRegions();
    expect(r1.data?.length).toBe(7);
    r1.data?.pop();
    expect(r1.data?.length).toBe(6);

    const r2 = await regionService.getRegions();
    expect(r2.data?.length).toBe(7);
  });

  it("ApiResponse meta가 채워짐", async () => {
    const resp = await regionService.getRegions();
    expect(resp.meta).toBeDefined();
    expect(resp.meta?.source).toBeDefined();
    expect(resp.meta?.regionLevel).toBe("sigungu");
  });
});

describe("service layer (httpAdapter active)", () => {
  beforeEach(() => {
    setDataAdapter(httpAdapter);
  });

  afterEach(() => {
    setDataAdapter(mockAdapter);
  });

  it("httpAdapter throw → service가 success:false ApiResponse로 변환", async () => {
    const resp = await regionService.getRegions();
    expect(resp.success).toBe(false);
    expect(resp.error?.code).toBe("FETCH_FAILED");
  });

  it("httpAdapter throw → service가 절대 throw하지 않음", async () => {
    await expect(
      regionService.getRegionByCode("DEMO-SIGUNGU-01"),
    ).resolves.toBeDefined();
    await expect(
      schoolService.getSchoolsByRegion("DEMO-SIGUNGU-01"),
    ).resolves.toBeDefined();
  });

  it("httpAdapter 활성 시에도 ApiResponse meta는 채워짐", async () => {
    const resp = await regionService.getRegions();
    expect(resp.meta).toBeDefined();
    expect(resp.meta?.source).toBeDefined();
  });
});
