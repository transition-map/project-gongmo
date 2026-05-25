/**
 * 11-3 1차-93 — buildScenarioFromProfile pure mapper.
 *
 * legacy `StudentProfile` (한국어 6 필드)을 1차-89 비식별 `StudentScenario`로 변환한다.
 *
 * **순수 함수 원칙**:
 * - fetch / process.env / localStorage / sessionStorage 접근 0건
 * - mock data / service / UI 컴포넌트 import 0건
 * - 입력 mutate 0건
 *
 * **PII 회피**:
 * - 출력 `StudentScenario`에 이름·학교명·상세주소·연락처·생년월일·진단명·장애등급 슬롯 0건
 *   (`StudentScenario` 1차-89 schema가 schema 단에서 강제).
 *
 * UI 통합은 1차-95+ 별도 단계. 본 단계는 pure helper layer만 정착.
 */

import type {
  StudentProfile,
  StudentScenario,
  StudentScenarioInterest,
} from "../../types";

/**
 * 4 광역 권역 한국어 표시명 → DEMO regionCode + sidoCode.
 * 미지정/미일치 시 DEMO-SIGUNGU-01 (서울 A권역)로 안전 fallback.
 */
const REGION_TO_CODE: Record<string, { regionCode: string; sidoCode: string }> =
  {
    "서울 A권역": { regionCode: "DEMO-SIGUNGU-01", sidoCode: "11" },
    "부산 B권역": { regionCode: "DEMO-SIGUNGU-02", sidoCode: "26" },
    "충청 C권역": { regionCode: "DEMO-SIGUNGU-03", sidoCode: "43" },
    "전남 D권역": { regionCode: "DEMO-SIGUNGU-04", sidoCode: "46" },
  };

/**
 * 한국어 careerInterest → StudentScenarioInterest 4-union 매핑.
 * 미일치 시 "careerExploration"으로 안전 fallback.
 */
const CAREER_INTEREST_MAP: Record<string, StudentScenarioInterest> = {
  직업체험: "vocationalExperience",
  "디지털 기초역량": "careerExploration",
  사회서비스: "careerExploration",
  문화예술: "careerExploration",
  사무보조: "employmentPreparation",
};

/**
 * 한국어 mobilityRange → (commuteLimitMinutes, onlineAllowed) 매핑.
 */
function deriveMobility(mobilityRange: string): {
  commuteLimitMinutes: StudentScenario["commuteLimitMinutes"];
  onlineAllowed: boolean;
} {
  switch (mobilityRange) {
    case "온라인 참여 가능":
      return { commuteLimitMinutes: "online", onlineAllowed: true };
    case "대중교통 1시간 이내":
      return { commuteLimitMinutes: 60, onlineAllowed: false };
    case "거주지 인근":
    case "대중교통 30분 이내":
    default:
      return { commuteLimitMinutes: 30, onlineAllowed: false };
  }
}

/**
 * legacy `StudentProfile` → 비식별 `StudentScenario` 변환.
 *
 * - 4 광역 권역 한국어 표시명을 DEMO regionCode + sidoCode로 안전 매핑
 * - careerInterest → StudentScenarioInterest 4-union 매핑
 * - mobilityRange → commuteLimitMinutes + onlineAllowed 파생
 * - supportLevel "높은 지원" → guardianConsultNeeded true
 * - schoolStage 기본값 "demo" (StudentProfile에 학교급 슬롯 부재)
 *
 * **PII 슬롯 0건** — 출력에 name / studentName / schoolName / addressDetail / phone /
 * email / birthday / disabilityType / disabilityGrade 등 필드 부재
 * (`StudentScenario` 1차-89 schema가 schema 단에서 강제).
 */
export function buildScenarioFromProfile(
  profile: StudentProfile,
): StudentScenario {
  const regionMapping =
    REGION_TO_CODE[profile.region] ?? REGION_TO_CODE["서울 A권역"];
  const interest =
    CAREER_INTEREST_MAP[profile.careerInterest] ?? "careerExploration";
  const { commuteLimitMinutes, onlineAllowed } = deriveMobility(
    profile.mobilityRange,
  );
  const guardianConsultNeeded = profile.supportLevel === "높은 지원";

  return {
    regionCode: regionMapping.regionCode,
    sidoCode: regionMapping.sidoCode,
    schoolStage: "demo",
    interests: [interest],
    commuteLimitMinutes,
    onlineAllowed,
    guardianConsultNeeded,
  };
}
