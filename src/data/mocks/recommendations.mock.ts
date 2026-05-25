/**
 * RecommendationResult mock (시군구별 1개, 총 6개).
 * 각 결과는 3~5개 candidate를 포함한다.
 *
 * candidate.candidateId는 다른 mock(`schools/institutions/trainingPrograms/
 * careerExperiencePrograms/jobPostings`)에서 lookup하여 ID 일관성을 자동 보장한다.
 *
 * 추천은 항상 후보 제안이며, globalCaution과 candidate.caution으로
 * "교사 검토 후 활용" 문구를 노출한다. 장애유형만으로 직업 가능성을 제한하는
 * 형태의 매칭은 evidence/matchReasons 어디에도 사용하지 않는다.
 */

import type {
  RecommendationCandidate,
  RecommendationResult,
} from "../../types";
import { careerExperiencePrograms } from "./careerExperiencePrograms.mock";
import { institutions } from "./institutions.mock";
import { jobPostings } from "./jobPostings.mock";
import { regions } from "./regions.mock";
import { schools } from "./schools.mock";
import { trainingPrograms } from "./trainingPrograms.mock";
import { DEMO_CALCULATED_AT, DEMO_INDICATOR_VERSION } from "./_shared";

interface RegionContextSeed {
  regionCode: string;
  schoolShortName: string; // local lookup hint
  preferredJobCodes: string[];
  preferredNcsCodes: string[];
  maxDistanceKm: number;
  mobilityNeeds: string[];
  summary: string;
  globalCaution: string;
}

const SEEDS: RegionContextSeed[] = [
  {
    regionCode: "DEMO-SIGUNGU-01",
    schoolShortName: "강남특수학교",
    preferredJobCodes: ["DEMO-S-101", "DEMO-S-102"],
    preferredNcsCodes: ["20-1-001-1"],
    maxDistanceKm: 8,
    mobilityNeeds: ["휠체어 동선"],
    summary:
      "자원이 양호한 권역. 관심 분야 다양화에 따른 인접 자치구 자원과의 결합을 함께 검토.",
    globalCaution:
      "AI 추천은 후보 제안이며, 교사·담당자 검토 후 학생·보호자 상담에 활용해 주세요.",
  },
  {
    regionCode: "DEMO-SIGUNGU-02",
    schoolShortName: "해운대특수학교",
    preferredJobCodes: ["DEMO-S-103"],
    preferredNcsCodes: ["13-1-005-2"],
    maxDistanceKm: 10,
    mobilityNeeds: ["휠체어 동선"],
    summary:
      "중간 수준의 자원·접근성. 권역 내 거점기관 우선 + 인접 자원 보조 안내 권장.",
    globalCaution:
      "AI 추천은 후보 제안이며, 교사·담당자 검토 후 학생·보호자 상담에 활용해 주세요.",
  },
  {
    regionCode: "DEMO-SIGUNGU-03",
    schoolShortName: "영통특수학교",
    preferredJobCodes: ["DEMO-S-101", "DEMO-S-104"],
    preferredNcsCodes: ["20-1-001-1", "20-3-003-1"],
    maxDistanceKm: 12,
    mobilityNeeds: ["휠체어 동선", "수어통역"],
    summary:
      "수요가 빠르게 증가한 권역. 한정 자원 과부하 가능 — 광역·온라인 자원 결합을 우선 검토.",
    globalCaution:
      "AI 추천은 후보 제안이며, 교사·담당자 검토 후 학생·보호자 상담에 활용해 주세요.",
  },
  {
    regionCode: "DEMO-SIGUNGU-04",
    schoolShortName: "흥덕특수학교",
    preferredJobCodes: ["DEMO-S-101"],
    preferredNcsCodes: ["20-1-001-1"],
    maxDistanceKm: 15,
    mobilityNeeds: ["휠체어 동선"],
    summary:
      "복지 자원 부족 권역. 외부 복지기관 연계와 거점 자원 안내를 함께 검토.",
    globalCaution:
      "AI 추천은 후보 제안이며, 교사·담당자 검토 후 학생·보호자 상담에 활용해 주세요.",
  },
  {
    regionCode: "DEMO-SIGUNGU-05",
    schoolShortName: "목포특수학교",
    preferredJobCodes: ["DEMO-S-102", "DEMO-S-104"],
    preferredNcsCodes: ["20-2-002-1", "20-3-003-1"],
    maxDistanceKm: 20,
    mobilityNeeds: ["보호자 동행", "특별교통수단"],
    summary:
      "농산어촌·접근성 취약 권역. 온라인·재택 자원 우선 + 인접 권역 결합 안내 권장.",
    globalCaution:
      "AI 추천은 후보 제안이며, 교사·담당자 검토 후 학생·보호자 상담에 활용해 주세요.",
  },
  {
    regionCode: "DEMO-SIGUNGU-06",
    schoolShortName: "춘천특수학교",
    preferredJobCodes: ["DEMO-S-103"],
    preferredNcsCodes: ["13-1-005-2"],
    maxDistanceKm: 18,
    mobilityNeeds: ["보호자 동행"],
    summary:
      "훈련 공급 자원 매우 적은 권역. 인접 권역 + 온라인 훈련 자원과의 결합 안내 권장.",
    globalCaution:
      "AI 추천은 후보 제안이며, 교사·담당자 검토 후 학생·보호자 상담에 활용해 주세요.",
  },
];

function gapTypeLabelOf(regionCode: string): string {
  const r = regions.find((x) => x.regionCode === regionCode);
  const gap = r?.indicators?.indicators?.transitionGapIndex;
  if (gap === undefined) return "현재 기준 통합 지표";
  if (gap >= 70) return "공백지수 높음 (보완 필요)";
  if (gap >= 50) return "공백지수 중간";
  return "공백지수 낮음 (자원 양호)";
}

function buildCandidates(seed: RegionContextSeed): RecommendationCandidate[] {
  const cs: RecommendationCandidate[] = [];
  const gapLabel = gapTypeLabelOf(seed.regionCode);

  // 1. TrainingProgram (자기 권역 우선, 없으면 첫 번째 가용 권역)
  const localTraining = trainingPrograms.find(
    (t) => t.region?.regionCode === seed.regionCode,
  );
  const training = localTraining ?? trainingPrograms[0];
  const trainingIsLocal = !!localTraining;
  cs.push({
    candidateId: training.trainingProgramId,
    candidateType: "trainingProgram",
    candidateName: training.programName,
    regionCode: training.region?.regionCode,
    matchScore: trainingIsLocal ? 78 : 56,
    matchReasons: trainingIsLocal
      ? ["거주 권역 내", "선호 직업 코드와 부분 일치"]
      : ["선호 직업 코드와 부분 일치", "인접 권역 자원"],
    reason: trainingIsLocal
      ? `${training.institutionName ?? ""}의 직업훈련 과정 후보입니다.`
      : `자기 권역 훈련 자원이 부족하여 인접 권역(${training.region?.regionName ?? "-"}) 과정을 후보로 제안합니다.`,
    caution:
      "참여 전 모집 상태·시작일·이동 시간(최대 거리 한도)과 보호자 동행 여부 확인 필요.",
    evidence: [
      {
        label: "현재 기준 프로그램 데이터",
        value: `${training.programName} (status: ${training.applicationStatus ?? "n/a"})`,
        source: training.source,
      },
      { label: "현재 공백 유형", value: gapLabel },
      {
        label: "선호 직업 코드",
        value: seed.preferredJobCodes.join(", "),
      },
    ],
  });

  // 2. CareerExperienceProgram
  const localCareer = careerExperiencePrograms.find(
    (c) => c.region?.regionCode === seed.regionCode,
  );
  const career = localCareer ?? careerExperiencePrograms[0];
  const careerIsLocal = !!localCareer;
  cs.push({
    candidateId: career.programId,
    candidateType: "careerProgram",
    candidateName: career.programName,
    regionCode: career.region?.regionCode,
    matchScore: careerIsLocal ? 72 : 50,
    matchReasons: careerIsLocal
      ? ["거주 권역 내", "이동 가능 범위 적합"]
      : ["인접 권역 자원", "온라인 참여 가능 여부 확인 필요"],
    reason: careerIsLocal
      ? `${career.institutionName ?? ""}의 진로체험 프로그램 후보입니다.`
      : `자기 권역 진로체험 자원이 부족하여 인접 권역(${career.region?.regionName ?? "-"}) 프로그램을 후보로 제안합니다.`,
    caution:
      "체험 전 안전·이동 동선·접근성 보조 가용 여부를 사전 점검해 주세요.",
    evidence: [
      {
        label: "현재 기준 프로그램 데이터",
        value: `${career.programName} (type: ${career.experienceType ?? "n/a"})`,
        source: career.source,
      },
      { label: "현재 공백 유형", value: gapLabel },
      {
        label: "이동 가능 최대 거리",
        value: `${seed.maxDistanceKm}km`,
      },
    ],
  });

  // 3. JobPosting (자기 권역)
  const localJob = jobPostings.find(
    (j) => j.region?.regionCode === seed.regionCode,
  );
  if (localJob) {
    cs.push({
      candidateId: localJob.jobPostingId,
      candidateType: "jobPosting",
      candidateName: localJob.jobTitle,
      regionCode: localJob.region?.regionCode,
      matchScore: 68,
      matchReasons: ["거주 권역 내", "장애인 친화 구인"],
      reason: `${localJob.employerName ?? "사업장"}의 구인 정보 후보입니다.`,
      caution:
        "지원 전 모집 마감일과 근무 환경(접근성)을 사업장과 직접 확인하세요.",
      evidence: [
        {
          label: "현재 기준 구인 데이터",
          value: `${localJob.jobTitle} (vacancy: ${localJob.vacancyCount ?? "n/a"})`,
          source: localJob.source,
        },
        { label: "현재 공백 유형", value: gapLabel },
        {
          label: "이동 가능 최대 거리",
          value: `${seed.maxDistanceKm}km`,
        },
      ],
    });
  }

  // 4. Institution (welfareCenter 우선, 없으면 supportCenter)
  const localWelfare = institutions.find(
    (i) =>
      i.region?.regionCode === seed.regionCode &&
      i.institutionType === "welfareCenter",
  );
  const localSupport = institutions.find(
    (i) =>
      i.region?.regionCode === seed.regionCode &&
      i.institutionType === "supportCenter",
  );
  const inst = localWelfare ?? localSupport;
  if (inst) {
    cs.push({
      candidateId: inst.institutionId,
      candidateType: "institution",
      candidateName: inst.institutionName,
      regionCode: inst.region?.regionCode,
      matchScore: 64,
      matchReasons:
        inst.institutionType === "welfareCenter"
          ? ["거주 권역 내", "복지 자원 보완"]
          : ["거주 권역 내", "전환교육 상담 가능"],
      reason:
        inst.institutionType === "welfareCenter"
          ? `${inst.institutionName}의 직업적응·여가 프로그램 연계 후보입니다.`
          : `${inst.institutionName}의 전환교육 상담·연계 후보입니다.`,
      caution: "방문 전 운영시간·예약 가능 여부 확인 필요.",
      evidence: [
        {
          label: "현재 기준 기관 데이터",
          value: `${inst.institutionName} (type: ${inst.institutionType})`,
          source: inst.source,
        },
        { label: "현재 공백 유형", value: gapLabel },
      ],
    });
  }

  // 5. School (자기 권역, 5번째 candidate — 모든 시군구가 갖도록 보장)
  const localSchool = schools.find((s) =>
    s.schoolName.startsWith(seed.schoolShortName),
  );
  if (localSchool) {
    cs.push({
      candidateId: localSchool.schoolId,
      candidateType: "school",
      candidateName: localSchool.schoolName,
      regionCode: localSchool.region?.regionCode,
      matchScore: 60,
      matchReasons: ["거주 권역 내 학교", "특수교육 지원 가능"],
      reason: `${localSchool.schoolName}의 특수교육 지원 자원을 학내·학외 자원과 결합 활용할 수 있습니다.`,
      caution:
        "본 후보는 학생의 소속 학교 지원 활용 권고이며, 전학·진학 권유가 아닙니다.",
      evidence: [
        {
          label: "현재 기준 학교 데이터",
          value: `${localSchool.schoolName} (type: ${localSchool.schoolType ?? "n/a"})`,
          source: localSchool.meta?.source,
        },
        { label: "현재 공백 유형", value: gapLabel },
      ],
    });
  }

  return cs;
}

export const recommendations: RecommendationResult[] = SEEDS.map((seed) => ({
  recommendationId: `rec:demo:${seed.regionCode}`,
  generatedAt: DEMO_CALCULATED_AT,
  context: {
    regionCode: seed.regionCode,
    schoolType: "specialSchool",
    preferredJobCodes: seed.preferredJobCodes,
    preferredNcsCodes: seed.preferredNcsCodes,
    maxDistanceKm: seed.maxDistanceKm,
    mobilityNeeds: seed.mobilityNeeds,
    additionalPreferences: {
      includeOnlinePrograms: true,
    },
  },
  candidates: buildCandidates(seed),
  summary: seed.summary,
  globalCaution: seed.globalCaution,
  indicatorVersion: DEMO_INDICATOR_VERSION,
}));
