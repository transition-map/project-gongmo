/**
 * 11-3 1차-89 — 비식별 학생 시나리오 + 자료 기반 맞춤 경로 보고서 schema-only.
 *
 * 본 모듈은 schema/type 정의만 제공한다. UI 컴포넌트 통합
 * (StudentProfile / RecommendationResult / GeneratedOutputs)은 1차-91+ 별도 단계.
 *
 * 핵심 정책:
 * - **비식별**: 실명·학교명·상세주소·연락처·생년월일·진단명·장애등급 등 PII 절대 금지.
 *   학교급·관심 영역·이동 범위·온라인 가능 여부·지원 필요 정도만 관리.
 * - **연도별 추세**: trend-ready schema. 실 다년도 raw 부재 시 "unknown" 허용.
 *   실제 없는 추세를 사실처럼 표현 금지.
 * - **맞춤 경로**: 검토 후보. 자동 확정이 아님. requiredTeacherCheck /
 *   familyDiscussionPoint / limitations 필수. officialResourceIds로 공식자료 카드 연결.
 * - **보고서**: teacherSummary / familyGuide / educationOfficeNote 한 구조로 묶기.
 *   현재 단계 generatedBy 기본은 "template" (정책 자동 산출처럼 표현되지 않게 한다).
 *   AI 도입 별도 합의.
 */

/**
 * 비식별 학생 시나리오 입력.
 *
 * 화면 단계 비식별 선호값으로만 사용되며 저장하지 않는다 (localStorage / 서버 / 외부 API 0건).
 *
 * **금지 항목 (PII)**: 이름, 학생 이름, 학교 이름, 상세 주소(읍면동 이하), 연락처, 이메일,
 * 생년월일, 진단명, 장애 등급, 보호자 정보, 사진. 이 필드들은 본 타입에 절대 추가하지 않는다.
 *
 * **장애유형 단정 금지**: 장애유형만으로 직업 가능성을 제한하는 형태의 필드는 만들지
 * 않는다. 환경 보조 필요 라벨은 `supportNeeds`의 일반 카테고리(mobility / communication /
 * counseling / other)로만 표현.
 */
export interface StudentScenario {
  /** KOSTAT 시군구 5자리 또는 시연용 DEMO ID */
  regionCode: string;
  /** 시도 코드 (선택) */
  sidoCode?: string;
  /** 시군구 코드 (선택) */
  sigunguCode?: string;
  /** 학교급 */
  schoolStage: "middle" | "high" | "postsecondary" | "demo";
  /** 관심 영역 (다중 선택) */
  interests: StudentScenarioInterest[];
  /** 이동 가능 범위 (분) 또는 온라인 */
  commuteLimitMinutes?: 30 | 60 | 90 | "online";
  /** 온라인 참여 허용 여부 */
  onlineAllowed: boolean;
  /** 환경 보조 필요 일반 카테고리 (개인 진단정보 아님) */
  supportNeeds?: Array<"mobility" | "communication" | "counseling" | "other">;
  /** 보호자 동행·상담 필요 여부 */
  guardianConsultNeeded: boolean;
  /** 화면 내 식별만 (저장 X). 새로고침 시 초기화 */
  scenarioId?: string;
}

/** 학생 관심 영역 (다중 선택 union) */
export type StudentScenarioInterest =
  | "vocationalExperience"
  | "careerExploration"
  | "employmentPreparation"
  | "trainingCenter";

/**
 * 지역×도메인 단위 공백 추세 신호.
 *
 * trend-ready schema. 실 다년도 raw가 없으면 `trendDirection` / `gapLevel` 모두
 * "unknown" 허용. **실제 없는 추세를 사실처럼 표현 금지**.
 * 단일 연도 데이터로 증가/감소 단정 금지.
 */
export interface GapTrendSignal {
  /** KOSTAT 시군구 또는 시도 코드 */
  regionCode: string;
  /** 데이터 도메인 (CLAUDE.md §3 A~F) */
  domain:
    | "demand"
    | "school"
    | "training"
    | "employment"
    | "welfare"
    | "accessibility";
  /** 기준 연도 (raw 보유 시) */
  baselineYear?: number;
  /** 현재 연도 (raw 보유 시) */
  currentYear?: number;
  /** 추세 방향. raw 부재 또는 baseline 단일 연도 시 "unknown" */
  trendDirection: "improving" | "stable" | "worsening" | "unknown";
  /** 공백 수준. raw 부재 시 "unknown" */
  gapLevel: "low" | "medium" | "high" | "unknown";
  /** 근거 라벨 (예: "KESS 2022~2026 추세", "시연용 fixture") */
  evidenceLabel: string;
  /** 데이터 모드 */
  dataMode: "mock" | "fixture" | "etl";
  /** 한계·주의사항 (단일 연도 / raw 부재 등) */
  limitations: string[];
}

/**
 * 맞춤 경로 후보.
 *
 * **자동 확정 추천 아님 — 검토 후보**. `requiredTeacherCheck` /
 * `familyDiscussionPoint` / `limitations` 필수. 화면 표시 시 "교사 검토 후 활용"
 * 안내 동반.
 *
 * `officialResourceIds`로 공식자료 link-only registry (KEAD / NISE / CareerNet)와 연결.
 */
export interface RouteCandidate {
  candidateId: string;
  title: string;
  /** 경로 분류 */
  routeType:
    | "school-based"
    | "agency-based"
    | "online"
    | "official-resource"
    | "mixed";
  /** 시나리오 입력 + 지역 신호 결합 설명 */
  whyThisFits: string;
  /** 교사 확인 필요 항목 */
  requiredTeacherCheck: string[];
  /** 보호자 상담 포인트 */
  familyDiscussionPoint: string[];
  /** 공식자료 registry id 참조 (id 매칭) */
  officialResourceIds: string[];
  /** 한계·주의사항 (실 신청 가능 시기·요건은 원문 확인 등) */
  limitations: string[];
  /** 시군구 또는 시도 (지도 표시 / 필터용, 선택) */
  regionCode?: string;
  /**
   * 11-3 1차-163 — 화면 표시용 보조 정보 (optional).
   *
   * RecommendationResult dl 4 필드(접근성 / 관련 기관 / 교사 상담 메모 / 대체 경로)가
   * 카드별 evidence에 따라 차별화되도록 buildRouteCandidates가 evidence 기반으로 생성.
   * **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** — 시연용 검토
   * 정보. 매칭 evidence가 없으면 undefined로 fallback (legacy 호출자 호환 — view에서
   * `rec.accessibility` / `rec.relatedAgency` / `rec.teacherMemo` / `rec.alternativePath`로
   * 자동 fallback).
   *
   * 1차-149 `requiredTeacherCheck` / `familyDiscussionPoint` / `limitations`와는 별도
   * 정보 layer — displayHints는 dl 4 필드(접근성·관련 기관·교사 상담 메모·대체 경로)
   * 전용, sub-section은 evidence.teacherCheck / familyDiscussion / limitations 활용.
   */
  displayHints?: {
    accessibility: string;
    relatedAgency: string;
    teacherMemo: string;
    alternativePath: string;
  };
  /**
   * 11-3 1차-178 — 추천 카드 "기관 후보" 영역 표시용 (optional).
   *
   * 1차-175 `recommendationInstitution` fixture 기반 사람 검수 후보를
   * buildRouteCandidates가 `selectInstitutionsForCandidate({routeType, regionCode,
   * evidenceId, limit})` 우선순위 cascade(regionCode+evidenceId → regionCode+routeType
   * → evidenceId → routeType)로 매칭해 최대 3건까지 채움.
   *
   * **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** — 시연용
   * 검토 후보. 실제 참여 가능 여부는 사용자가 기관 페이지에서 직접 확인 필요.
   * 매칭 0건 시 undefined로 fallback (legacy 호출자 호환 — view에서 섹션 미렌더).
   *
   * `displayHints` (1차-163, 카테고리·역할 안내 4 필드 — dl)와 별도 layer.
   * displayHints는 "관련 기관" 카테고리 안내, institutionHints는 사람 검수 기관명 후보 목록.
   * 두 layer 의미 분리 — 화면 통합은 1차-180+ 별도 단계 (`RecommendationResult.tsx`
   * "기관 후보 (시연용)" 섹션 신규).
   *
   * **view 도달 7 키 only** — `supportedRouteTypes` / `supportedEvidenceIds` /
   * `institutionType` / `regionCode` 등 매칭 raw 메타는 RouteCandidate에 흘려보내지
   * 않는다 (1차-159 단방향 정합 정책 일관).
   */
  institutionHints?: Array<{
    institutionId: string;
    name: string;
    role: string;
    sidoName: string;
    sigunguName: string;
    sourceLabel: string;
    caution: string;
  }>;
}

/** ScenarioReport.dataEvidence 1건의 license 분류 */
export type ScenarioReportLicense =
  | "demo-only"
  | "unknown"
  | "공공누리 1유형"
  | "link-only"
  | "human-curated";

/**
 * 시나리오 보고서. 3개 청중별 출력물을 한 구조로 묶음.
 *
 * - teacherSummary: 교사 상담 요약 초안
 * - familyGuide: 학생·학부모 안내 초안
 * - educationOfficeNote: 교육청 정책 참고문 초안
 *
 * **generatedBy 기본은 "template"**. AI 도입은 별도 합의 후 "ai-assisted",
 * 사람 검수 완료 후 "human-curated"로 표기. 자동 정책 산출처럼 표현되지 않게 한다.
 */
export interface ScenarioReport {
  reportId?: string;
  /** ISO 8601 KST (예: "2026-05-23T00:00:00+09:00") */
  generatedAt: string;
  /** 입력 시나리오 요약 */
  scenarioSummary: StudentScenario;
  /** 지역×도메인 추세 신호 */
  trendSignals: GapTrendSignal[];
  /** 검토 후보 경로 (자동 확정 아님) */
  routeCandidates: RouteCandidate[];
  /** 교사 상담 요약 초안 */
  teacherSummary: string;
  /** 학생·학부모 안내 초안 */
  familyGuide: string;
  /** 교육청 정책 참고문 초안 */
  educationOfficeNote: string;
  /** 사용 데이터·라이선스·기준연도 명시 */
  dataEvidence: Array<{
    source: string;
    license: ScenarioReportLicense;
    referenceYear?: number;
    note?: string;
  }>;
  /** 사람 검수 필수 항목 체크리스트 */
  reviewChecklist: string[];
  /** 보고서 전체 한계·주의사항 */
  limitations: string[];
  /** 보고서 생성 방식. 현재 단계 기본은 "template" */
  generatedBy: "template" | "ai-assisted" | "human-curated";
}
