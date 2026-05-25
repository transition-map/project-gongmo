/**
 * 11-3 1차-93 — buildRouteCandidates pure builder 회귀 보호.
 *
 * StudentScenario + legacy Recommendation[]을 RouteCandidate[]로 변환한다.
 * 자동 확정 추천이 아닌 검토 후보로 표현. UI 통합은 1차-95+ 별도 단계.
 */

import { describe, expect, it } from "vitest";
import { buildRouteCandidates } from "../buildRouteCandidates";
import * as moduleApi from "../buildRouteCandidates";
import buildRouteCandidatesSource from "../buildRouteCandidates.ts?raw";
import type {
  Recommendation,
  StudentScenario,
} from "../../../types";

const SAMPLE_SCENARIO: StudentScenario = {
  regionCode: "DEMO-SIGUNGU-01",
  sidoCode: "11",
  schoolStage: "demo",
  interests: ["vocationalExperience"],
  commuteLimitMinutes: 30,
  onlineAllowed: false,
  guardianConsultNeeded: false,
};

const SAMPLE_RECS: Recommendation[] = [
  {
    id: "rec-1",
    region: "서울 A권역",
    programName: "강남 진로체험센터 직업체험",
    targetProfile: {
      careerInterest: "직업체험",
      mobilityRange: "대중교통 30분 이내",
      supportLevel: "중간 지원",
    },
    reason: "선택 지역 + 학생 관심 분야 매칭",
    accessibility: "대중교통 20분",
    relatedAgency: "강남 진로체험센터",
    teacherMemo: "사전 협의 필요",
    alternativePath: "온라인 진로탐색 보조",
    evidenceData: ["현재 기준 프로그램 데이터"],
  },
  {
    id: "rec-2",
    region: "서울 A권역",
    programName: "디지털 기초역량 과정",
    targetProfile: {
      careerInterest: "디지털 기초역량",
      mobilityRange: "대중교통 30분 이내",
      supportLevel: "중간 지원",
    },
    reason: "지역 내 디지털 훈련 과정",
    accessibility: "대중교통 30분",
    relatedAgency: "강남 디지털 훈련센터",
    teacherMemo: "출석 일정 확인",
    alternativePath: "온라인 보조",
    evidenceData: ["현재 기준 프로그램 데이터"],
  },
  {
    id: "rec-3",
    region: "서울 A권역",
    programName: "사회서비스 보조 직업체험",
    targetProfile: {
      careerInterest: "사회서비스",
      mobilityRange: "거주지 인근",
      supportLevel: "낮은 지원",
    },
    reason: "지역 내 사회서비스 체험",
    accessibility: "도보 10분",
    relatedAgency: "강남 복지관",
    teacherMemo: "보호자 동행 권장",
    alternativePath: "대안 활동 검토",
    evidenceData: ["현재 기준 프로그램 데이터"],
  },
];

describe("buildRouteCandidates — 기본 출력 구조", () => {
  it("최대 3개 후보 반환", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out.length).toBeGreaterThan(0);
  });

  it("입력 recommendations가 빈 배열이면 빈 RouteCandidate[] 반환", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: [],
    });
    expect(out).toEqual([]);
  });

  it("입력 배열 mutate 0건 (pure function)", () => {
    const recsCopy = JSON.parse(JSON.stringify(SAMPLE_RECS));
    buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    expect(SAMPLE_RECS).toEqual(recsCopy);
  });
});

describe("buildRouteCandidates — 검토 후보 필수 필드", () => {
  it("각 후보가 requiredTeacherCheck 비어있지 않음", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    for (const c of out) {
      expect(c.requiredTeacherCheck.length).toBeGreaterThan(0);
    }
  });

  it("각 후보가 familyDiscussionPoint 비어있지 않음", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    for (const c of out) {
      expect(c.familyDiscussionPoint.length).toBeGreaterThan(0);
    }
  });

  it("각 후보가 limitations 비어있지 않음", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    for (const c of out) {
      expect(c.limitations.length).toBeGreaterThan(0);
    }
  });

  it("officialResourceIds는 배열로 존재 (빈 배열 허용)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    for (const c of out) {
      expect(Array.isArray(c.officialResourceIds)).toBe(true);
    }
  });

  it("regionCode가 scenario.regionCode와 일치", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    for (const c of out) {
      expect(c.regionCode).toBe(SAMPLE_SCENARIO.regionCode);
    }
  });
});

describe("buildRouteCandidates — routeType 5종 union", () => {
  it("각 후보의 routeType은 5종 union 내", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    const allowed = [
      "school-based",
      "agency-based",
      "online",
      "official-resource",
      "mixed",
    ];
    for (const c of out) {
      expect(allowed).toContain(c.routeType);
    }
  });

  it("scenario.onlineAllowed=true + interests에 onlineCenter 비슷한 단서 시 'online' route 허용", () => {
    const onlineScenario: StudentScenario = {
      ...SAMPLE_SCENARIO,
      onlineAllowed: true,
      commuteLimitMinutes: "online",
    };
    const out = buildRouteCandidates({
      scenario: onlineScenario,
      recommendations: SAMPLE_RECS,
    });
    // routeType "online"이 후보에 등장할 수 있다 (필수 아님, 출력 가능성 확인)
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("buildRouteCandidates — 금지 표현 회귀", () => {
  it("자동 확정성 표현 0건 (소스 + 출력 모두)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: SAMPLE_RECS,
    });
    const allText = JSON.stringify(out);
    expect(allText).not.toMatch(/자동\s*추천\s*확정/);
    expect(allText).not.toMatch(/AI\s*정책\s*추천/);
    expect(allText).not.toMatch(/최종\s*결정/);
    expect(buildRouteCandidatesSource).not.toMatch(/자동\s*추천\s*확정/);
    expect(buildRouteCandidatesSource).not.toMatch(/AI\s*정책\s*추천/);
    expect(buildRouteCandidatesSource).not.toMatch(/최종\s*결정/);
  });

  it("자동 확정성 helper export 0건", () => {
    const exported = Object.keys(moduleApi);
    const forbidden = [
      "autoRecommendFinal",
      "policyDecision",
      "mustImplement",
      "finalizeRoute",
      "decideRoute",
      "confirmRoute",
    ];
    for (const f of forbidden) {
      expect(exported).not.toContain(f);
    }
  });
});

/**
 * 11-3 1차-159 — recommendation evidence 우선 매칭 회귀 보호.
 *
 * 1차-158 evidence fixture (4 records: office-basic-training / workplace-experience /
 * office-employment-exploration / review-candidate-fallback) 기반 매칭 결과를 검증한다.
 * evidence 매칭 성공 시 whyThisFits / teacherCheck / familyDiscussion / limitations
 * 4종이 evidence 기반 사람 검수 문장으로 채워지고, 매칭 실패 시 DEFAULT_* fallback이
 * 유지되어야 한다. RouteCandidate schema는 무수정 (evidenceId / sourceLabel 등 메타
 * 흘려보내지 않음).
 */
describe("buildRouteCandidates — recommendation evidence 매칭 (1차-159)", () => {
  const EVIDENCE_RECS: Recommendation[] = [
    {
      id: "rec-evidence-1",
      region: "서울 A권역",
      programName: "사무보조기초과정 (시연용)",
      targetProfile: {
        careerInterest: "사무보조",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "사무 기본 역량 점검",
      accessibility: "대중교통 30분",
      relatedAgency: "강남 사무보조 훈련센터",
      teacherMemo: "출석 일정 확인",
      alternativePath: "온라인 보조",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
    {
      id: "rec-evidence-2",
      region: "서울 A권역",
      programName: "지역사업장 직업체험 (시연용)",
      targetProfile: {
        careerInterest: "직업체험",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "지역 사업장 체험",
      accessibility: "대중교통 20분",
      relatedAgency: "강남 진로체험센터",
      teacherMemo: "현장 담당자 사전 협의",
      alternativePath: "대안 활동 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
    {
      id: "rec-evidence-3",
      region: "서울 A권역",
      programName: "사무 보조원 (시연용)",
      targetProfile: {
        careerInterest: "사무보조",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "취업 직무 탐색",
      accessibility: "대중교통 30분",
      relatedAgency: "강남 취업지원센터",
      teacherMemo: "근무 조건 점검",
      alternativePath: "직무훈련 우선 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
  ];

  it("사무보조기초과정 → office-basic-training evidence whyThisFits 사용", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-evidence-1");
    expect(card).toBeDefined();
    expect(card?.whyThisFits).toBe(
      "사무보조 직무를 시작하기 전 문서 정리, 일정 보조, 사무기기 활용처럼 초기 직무 적응에 필요한 역량을 점검하는 경로입니다.",
    );
  });

  it("지역사업장 직업체험 → workplace-experience evidence teacherCheck / familyDiscussion / limitations 사용", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-evidence-2");
    expect(card).toBeDefined();
    expect(card?.requiredTeacherCheck).toContain(
      "체험 장소의 접근성, 이동 동선, 보조 인력 필요 여부를 사전에 확인하세요.",
    );
    expect(card?.familyDiscussionPoint).toContain(
      "학생이 낯선 사업장 환경에 부담을 느끼는지 확인하세요.",
    );
    expect(card?.limitations).toContain(
      "현장체험은 실제 근로계약이나 취업 보장을 의미하지 않습니다.",
    );
  });

  it("사무 보조원 → office-employment-exploration evidence whyThisFits 사용", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-evidence-3");
    expect(card).toBeDefined();
    expect(card?.whyThisFits).toBe(
      "사무보조 직무를 실제 취업 후보로 검토하기 위해 업무 난이도, 근무 시간, 지원 필요 수준을 함께 정리하는 경로입니다.",
    );
  });

  it("3 카드 whyThisFits가 서로 다르다 (template 반복 회귀 회피)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    const why = out.map((c) => c.whyThisFits);
    expect(new Set(why).size).toBe(out.length);
  });

  it("evidence keyword + routeType 모두 매칭 실패 시 fallback evidence (review-candidate-fallback) 사용 — 1차-158 fixture는 항상 fallback 보유", () => {
    // programName "원격" + onlineScenario → deriveRouteType returns "online"
    // (1차-158 fixture에 online routeType evidence 0건이라 routeType 매칭도 실패 →
    //  selectRecommendationEvidence가 review-candidate-fallback record 반환).
    // programKeywords 6종(사무보조기초과정/기초과정/훈련/과정/course/training,
    // 지역사업장 직업체험/사업장/체험/현장/workplace/experience,
    // 사무 보조원/보조원/취업/직무/job/employment) 모두 hit 회피 위해 "원격" 사용 —
    // 어떤 evidence record의 programKeywords에도 등장하지 않음.
    const FALLBACK_REC: Recommendation = {
      id: "rec-no-match",
      region: "서울 A권역",
      programName: "원격 진로 탐색 프로그램 xyz123",
      targetProfile: {
        careerInterest: "디지털 기초역량",
        mobilityRange: "온라인 참여 가능",
        supportLevel: "낮은 지원",
      },
      reason: "매칭 없음",
      accessibility: "온라인",
      relatedAgency: "미상",
      teacherMemo: "사전 협의 필요",
      alternativePath: "대안 활동 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    };
    const onlineScenario: StudentScenario = {
      ...SAMPLE_SCENARIO,
      onlineAllowed: true,
      commuteLimitMinutes: "online",
    };
    const out = buildRouteCandidates({
      scenario: onlineScenario,
      recommendations: [FALLBACK_REC],
    });
    expect(out.length).toBe(1);
    expect(out[0].routeType).toBe("online");
    expect(out[0].whyThisFits).toBe(
      "학생 프로필과 지역 시연 데이터를 함께 검토하기 위한 후보 경로입니다.",
    );
  });

  it("officialResourceIds는 모든 후보에서 빈 배열 — 1차-161+ C안 별도", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    for (const c of out) {
      expect(c.officialResourceIds).toEqual([]);
    }
  });

  it("RouteCandidate schema 무수정 — evidenceId / sourceLabel / sourceType 메타 흘려보내지 않음", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    for (const c of out) {
      const keys = Object.keys(c);
      expect(keys).not.toContain("evidenceId");
      expect(keys).not.toContain("sourceLabel");
      expect(keys).not.toContain("sourceType");
      expect(keys).not.toContain("programKeywords");
    }
  });

  it("입력 recommendations / scenario를 mutate하지 않음 (1차-159 회귀)", () => {
    const recsCopy = JSON.parse(JSON.stringify(EVIDENCE_RECS));
    const scenarioCopy = JSON.parse(JSON.stringify(SAMPLE_SCENARIO));
    buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: EVIDENCE_RECS,
    });
    expect(EVIDENCE_RECS).toEqual(recsCopy);
    expect(SAMPLE_SCENARIO).toEqual(scenarioCopy);
  });
});

/**
 * 11-3 1차-163 — RouteCandidate displayHints 회귀 보호.
 *
 * 1차-158 evidence fixture 4 records (office-basic-training / workplace-experience /
 * office-employment-exploration / review-candidate-fallback) 각각에 매칭된 후보에
 * displayHints (accessibility / relatedAgency / teacherMemo / alternativePath 4 키)가
 * 채워지는지 검증한다. RecommendationResult dl 4 필드(접근성 / 관련 기관 / 교사 상담 메모 /
 * 대체 경로)가 카드별로 차별화되도록 보조 정보 layer를 추가하는 단계.
 *
 * **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** — 시연용 검토 정보.
 * officialResourceIds는 여전히 빈 배열 (1차-161+ C안 별도).
 */
describe("buildRouteCandidates — displayHints (1차-163)", () => {
  const DISPLAY_RECS: Recommendation[] = [
    {
      id: "rec-display-1",
      region: "서울 A권역",
      programName: "사무보조기초과정 (시연용)",
      targetProfile: {
        careerInterest: "사무보조",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "사무 기본 역량 점검",
      accessibility: "대중교통 30분",
      relatedAgency: "강남 사무보조 훈련센터",
      teacherMemo: "출석 일정 확인",
      alternativePath: "온라인 보조",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
    {
      id: "rec-display-2",
      region: "서울 A권역",
      programName: "지역사업장 직업체험 (시연용)",
      targetProfile: {
        careerInterest: "직업체험",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "지역 사업장 체험",
      accessibility: "대중교통 20분",
      relatedAgency: "강남 진로체험센터",
      teacherMemo: "현장 담당자 사전 협의",
      alternativePath: "대안 활동 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
    {
      id: "rec-display-3",
      region: "서울 A권역",
      programName: "사무 보조원 (시연용)",
      targetProfile: {
        careerInterest: "사무보조",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "취업 직무 탐색",
      accessibility: "대중교통 30분",
      relatedAgency: "강남 취업지원센터",
      teacherMemo: "근무 조건 점검",
      alternativePath: "직무훈련 우선 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
  ];

  it("office-basic-training → displayHints.accessibility에 훈련 / 출석 / 이동 시간 키워드 포함", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-display-1");
    expect(card?.displayHints).toBeDefined();
    expect(card?.displayHints?.accessibility).toContain("훈련");
    expect(card?.displayHints?.accessibility).toContain("이동");
  });

  it("workplace-experience → displayHints.relatedAgency에 사업장 담당자 / 현장실습 담당교사 포함", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-display-2");
    expect(card?.displayHints).toBeDefined();
    expect(card?.displayHints?.relatedAgency).toBe(
      "사업장 담당자 / 현장실습 담당교사 확인 필요",
    );
  });

  it("office-employment-exploration → displayHints.teacherMemo에 직무 난이도 / 근무 시간 / 지원 인력 포함", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-display-3");
    expect(card?.displayHints).toBeDefined();
    expect(card?.displayHints?.teacherMemo).toContain("직무 난이도");
    expect(card?.displayHints?.teacherMemo).toContain("근무 시간");
    expect(card?.displayHints?.teacherMemo).toContain("지원 인력");
  });

  it("매칭 evidence 없는 케이스 → review-candidate-fallback evidence에 대응되는 displayHints 보유", () => {
    const FALLBACK_REC: Recommendation = {
      id: "rec-display-fallback",
      region: "서울 A권역",
      programName: "원격 진로 탐색 프로그램 xyz123",
      targetProfile: {
        careerInterest: "디지털 기초역량",
        mobilityRange: "온라인 참여 가능",
        supportLevel: "낮은 지원",
      },
      reason: "매칭 없음",
      accessibility: "온라인",
      relatedAgency: "미상",
      teacherMemo: "사전 협의 필요",
      alternativePath: "대안 활동 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    };
    const onlineScenario: StudentScenario = {
      ...SAMPLE_SCENARIO,
      onlineAllowed: true,
      commuteLimitMinutes: "online",
    };
    const out = buildRouteCandidates({
      scenario: onlineScenario,
      recommendations: [FALLBACK_REC],
    });
    expect(out.length).toBe(1);
    expect(out[0].routeType).toBe("online");
    expect(out[0].displayHints).toBeDefined();
    expect(out[0].displayHints?.relatedAgency).toBe(
      "담당 교사 / 지역 지원기관 확인 필요",
    );
    expect(out[0].displayHints?.alternativePath).toContain("부담이 낮은 단계");
  });

  it("displayHints는 항상 4 키(accessibility / relatedAgency / teacherMemo / alternativePath)를 모두 보유", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    for (const card of out) {
      expect(card.displayHints).toBeDefined();
      const keys = Object.keys(card.displayHints ?? {});
      expect(keys).toContain("accessibility");
      expect(keys).toContain("relatedAgency");
      expect(keys).toContain("teacherMemo");
      expect(keys).toContain("alternativePath");
      expect(keys.length).toBe(4);
    }
  });

  it("commuteLimitMinutes 30 시 displayHints.accessibility에 commute hint(대중교통 30분) 추가됨", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-display-1");
    expect(card?.displayHints?.accessibility).toContain("대중교통 30분");
  });

  it("officialResourceIds는 모든 후보에서 빈 배열 유지 — 1차-163은 displayHints만 추가, 공식자료 매칭은 별도", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    for (const card of out) {
      expect(card.officialResourceIds).toEqual([]);
    }
  });

  it("입력 recommendations / scenario를 mutate하지 않음 (1차-163 회귀)", () => {
    const recsCopy = JSON.parse(JSON.stringify(DISPLAY_RECS));
    const scenarioCopy = JSON.parse(JSON.stringify(SAMPLE_SCENARIO));
    buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: DISPLAY_RECS,
    });
    expect(DISPLAY_RECS).toEqual(recsCopy);
    expect(SAMPLE_SCENARIO).toEqual(scenarioCopy);
  });
});

/**
 * 11-3 1차-178 — RouteCandidate.institutionHints 회귀 보호.
 *
 * 1차-175 recommendationInstitution fixture(6 records: 강남 trainingCenter / 강남
 * supportCenter / 해운대 employer / 수원 publicAgency / 청주 trainingCenter / 목포
 * supportCenter)를 buildRouteCandidates가 selectInstitutionsForCandidate cascade로
 * 매칭해 RouteCandidate.institutionHints(7 키 only — institutionId / name / role /
 * sidoName / sigunguName / sourceLabel / caution)에 채우는지 검증한다.
 *
 * SAMPLE_SCENARIO.regionCode="DEMO-SIGUNGU-01"이라 tier 1+2(regionCode 매칭) 0건,
 * tier 3(evidenceId) / tier 4(routeType)에서 매칭. 정상 동작.
 *
 * **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** — 시연용 검토
 * 후보. officialResourceIds는 여전히 빈 배열 (1차-179+ C안 별도).
 */
describe("buildRouteCandidates — institutionHints (1차-178)", () => {
  const INSTITUTION_RECS: Recommendation[] = [
    {
      id: "rec-inst-1",
      region: "서울 A권역",
      programName: "사무보조기초과정 (시연용)",
      targetProfile: {
        careerInterest: "사무보조",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "사무 기본 역량 점검",
      accessibility: "대중교통 30분",
      relatedAgency: "강남 사무보조 훈련센터",
      teacherMemo: "출석 일정 확인",
      alternativePath: "온라인 보조",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
    {
      id: "rec-inst-2",
      region: "서울 A권역",
      programName: "지역사업장 직업체험 (시연용)",
      targetProfile: {
        careerInterest: "직업체험",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "지역 사업장 체험",
      accessibility: "대중교통 20분",
      relatedAgency: "강남 진로체험센터",
      teacherMemo: "현장 담당자 사전 협의",
      alternativePath: "대안 활동 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
    {
      id: "rec-inst-3",
      region: "서울 A권역",
      programName: "사무 보조원 (시연용)",
      targetProfile: {
        careerInterest: "사무보조",
        mobilityRange: "대중교통 30분 이내",
        supportLevel: "중간 지원",
      },
      reason: "취업 직무 탐색",
      accessibility: "대중교통 30분",
      relatedAgency: "강남 취업지원센터",
      teacherMemo: "근무 조건 점검",
      alternativePath: "직무훈련 우선 검토",
      evidenceData: ["현재 기준 프로그램 데이터"],
    },
  ];

  it("사무보조기초과정 candidate가 institutionHints를 가진다 (office-basic-training evidence 매칭)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-inst-1");
    expect(card?.institutionHints).toBeDefined();
    expect(card?.institutionHints?.length).toBeGreaterThan(0);
  });

  it("institutionHints[0]는 view 도달 7 키(institutionId / name / role / sidoName / sigunguName / sourceLabel / caution)만 보유", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-inst-1");
    expect(card?.institutionHints).toBeDefined();
    const first = card?.institutionHints?.[0];
    expect(first).toBeDefined();
    const keys = Object.keys(first ?? {}).sort();
    expect(keys).toEqual(
      [
        "caution",
        "institutionId",
        "name",
        "role",
        "sidoName",
        "sigunguName",
        "sourceLabel",
      ].sort(),
    );
  });

  it("institutionHints의 name에는 '시연용'이 포함된다 (정직성 표기 contract)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    for (const card of out) {
      for (const h of card.institutionHints ?? []) {
        expect(h.name).toMatch(/시연용/);
      }
    }
  });

  it("office-basic-training (사무보조기초과정) 후보에는 직업훈련기관 또는 특수교육지원센터가 포함된다", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-inst-1");
    const roles = card?.institutionHints?.map((h) => h.role) ?? [];
    expect(
      roles.some((r) => r.includes("직업훈련기관") || r.includes("특수교육지원센터")),
    ).toBe(true);
  });

  it("workplace-experience (지역사업장 직업체험) 후보에는 현장체험 사업장이 포함된다", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-inst-2");
    const roles = card?.institutionHints?.map((h) => h.role) ?? [];
    expect(roles.some((r) => r.includes("현장체험"))).toBe(true);
  });

  it("office-employment-exploration (사무 보조원) 후보에는 고용지원기관 또는 직업훈련기관이 포함된다", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    const card = out.find((c) => c.candidateId === "rec-inst-3");
    const roles = card?.institutionHints?.map((h) => h.role) ?? [];
    expect(
      roles.some((r) => r.includes("고용지원기관") || r.includes("직업훈련기관")),
    ).toBe(true);
  });

  it("institutionHints는 최대 3개 (limit=3 contract)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    for (const card of out) {
      expect((card.institutionHints?.length ?? 0)).toBeLessThanOrEqual(3);
    }
  });

  it("institutionHints가 있어도 officialResourceIds는 여전히 빈 배열 — 1차-178은 institutionHints만 추가, 공식자료 매칭은 1차-179+ 별도", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    for (const card of out) {
      expect(card.officialResourceIds).toEqual([]);
    }
  });

  it("RouteCandidate에 institution raw 매칭 메타(supportedRouteTypes / supportedEvidenceIds / institutionType) 흘려보내지 않음 (1차-159 단방향 정합 정책)", () => {
    const out = buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    for (const card of out) {
      const cardKeys = Object.keys(card);
      expect(cardKeys).not.toContain("supportedRouteTypes");
      expect(cardKeys).not.toContain("supportedEvidenceIds");
      expect(cardKeys).not.toContain("institutionType");
      for (const h of card.institutionHints ?? []) {
        const hintKeys = Object.keys(h);
        expect(hintKeys).not.toContain("supportedRouteTypes");
        expect(hintKeys).not.toContain("supportedEvidenceIds");
        expect(hintKeys).not.toContain("institutionType");
        expect(hintKeys).not.toContain("regionCode");
      }
    }
  });

  it("입력 recommendations / scenario를 mutate하지 않음 (1차-178 회귀)", () => {
    const recsCopy = JSON.parse(JSON.stringify(INSTITUTION_RECS));
    const scenarioCopy = JSON.parse(JSON.stringify(SAMPLE_SCENARIO));
    buildRouteCandidates({
      scenario: SAMPLE_SCENARIO,
      recommendations: INSTITUTION_RECS,
    });
    expect(INSTITUTION_RECS).toEqual(recsCopy);
    expect(SAMPLE_SCENARIO).toEqual(scenarioCopy);
  });
});
