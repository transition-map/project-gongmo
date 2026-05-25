import { describe, expect, it } from "vitest";
import { toLegacyRecommendations } from "../recommendationAdapter";
import type {
  Recommendation,
  RecommendationCandidate,
  RecommendationResult as RecommendationResultData,
} from "../../../types";

const sampleCandidate1: RecommendationCandidate = {
  candidateId: "training:demo:p1",
  candidateType: "trainingProgram",
  candidateName: "디지털 기초역량 과정",
  regionCode: "R-01",
  matchScore: 78,
  matchReasons: ["거주 권역 내", "관심 분야 일치"],
  reason: "학생의 관심 분야와 권역 내 자원을 결합한 추천입니다.",
  caution: "참여 전 모집 상태 확인",
  evidence: [
    { label: "현재 기준 프로그램 데이터", value: "active", source: "demo:HRD-Net" },
    { label: "현재 공백 유형", value: "공백지수 중간" },
  ],
};

const sampleCandidate2: RecommendationCandidate = {
  candidateId: "inst:welfareCenter:demo:wc1",
  candidateType: "institution",
  candidateName: "지역장애인복지관 (시연용)",
  regionCode: "R-01",
  matchScore: 64,
  reason: "복지관 직업적응 프로그램 연계",
};

const sampleResult: RecommendationResultData = {
  generatedAt: "2026-05-11T00:00:00+09:00",
  candidates: [sampleCandidate1, sampleCandidate2],
  context: {
    regionCode: "R-01",
    preferredJobCodes: ["DEMO-S-101"],
    mobilityNeeds: ["휠체어 동선"],
  },
  indicatorVersion: "demo-v0",
};

const legacyFallback: Recommendation[] = [
  {
    id: "legacy-1",
    region: "legacy 권역",
    programName: "legacy 프로그램",
    targetProfile: { careerInterest: "x", mobilityRange: "x", supportLevel: "x" },
    reason: "legacy reason",
    accessibility: "legacy",
    relatedAgency: "legacy",
    teacherMemo: "legacy",
    alternativePath: "",
    evidenceData: [],
  },
];

describe("toLegacyRecommendations", () => {
  it("candidates를 legacy Recommendation[]으로 변환", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "테스트시",
    });
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("training:demo:p1");
    expect(out[0].programName).toBe("디지털 기초역량 과정");
  });

  it("변환된 모든 Recommendation.region이 selectedRegionName과 일치", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "강남구 (시연용)",
    });
    for (const r of out) {
      expect(r.region).toBe("강남구 (시연용)");
    }
  });

  it("candidate.reason이 reason으로 들어감", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[0].reason).toBe(sampleCandidate1.reason);
  });

  it("candidate.caution이 teacherMemo로 반영", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[0].teacherMemo).toBe(sampleCandidate1.caution);
  });

  it("candidate.caution 부재 시 default '교사 검토 후 ...' 문구", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[1].teacherMemo).toContain("교사 검토 후");
  });

  it("evidence가 evidenceData 문자열 배열로 변환", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[0].evidenceData).toEqual([
      "현재 기준 프로그램 데이터: active",
      "현재 공백 유형: 공백지수 중간",
    ]);
  });

  it("evidence 부재 시 evidenceData = []", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[1].evidenceData).toEqual([]);
  });

  it("institution 타입 candidate은 relatedAgency = candidateName", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[1].relatedAgency).toBe(sampleCandidate2.candidateName);
  });

  it("recommendation undefined → legacyFallback 반환", () => {
    const out = toLegacyRecommendations({
      recommendation: undefined,
      selectedRegionName: "x",
      legacyFallback,
    });
    expect(out).toBe(legacyFallback);
  });

  it("candidates 빈 배열 → legacyFallback 반환", () => {
    const out = toLegacyRecommendations({
      recommendation: { ...sampleResult, candidates: [] },
      selectedRegionName: "x",
      legacyFallback,
    });
    expect(out).toBe(legacyFallback);
  });

  it("legacyFallback 부재 + recommendation 부재 → 빈 배열", () => {
    const out = toLegacyRecommendations({
      recommendation: undefined,
      selectedRegionName: "x",
    });
    expect(out).toEqual([]);
  });

  it("targetProfile.careerInterest는 context.preferredJobCodes[0] 사용", () => {
    const out = toLegacyRecommendations({
      recommendation: sampleResult,
      selectedRegionName: "x",
    });
    expect(out[0].targetProfile.careerInterest).toBe("DEMO-S-101");
  });
});
