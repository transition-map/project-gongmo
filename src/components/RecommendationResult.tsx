import { useState } from "react";
import {
  MapPin,
  Building2,
  StickyNote,
  Route,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Database,
  UserCheck,
  Circle,
  ShieldCheck,
} from "lucide-react";
import Badge from "./Badge";
import type {
  Recommendation,
  RegionData,
  RouteCandidate,
  StudentProfile,
} from "../types";

interface RecommendationResultProps {
  recommendations: Recommendation[];
  selectedRegion: RegionData;
  studentProfile: StudentProfile;
  /**
   * 11-3 1차-101 — App.tsx에서 buildRouteCandidates로 파생한 RouteCandidate[].
   * 기존 추천 카드(legacy Recommendation)와 1:1 매칭 (`candidateId === rec.id`).
   * 매칭된 후보에 한해 카드 내부에 "검토 후보 보강 정보" 영역 표시.
   * optional이라 legacy 호출자(routeCandidates 미주입)에서도 호환된다.
   */
  routeCandidates?: RouteCandidate[];
  /**
   * 11-3 1차-167 — StudentProfile 3단계 cascading select에서 lift-up된 상세 지역
   * 표시 라벨 (예: "전라남도 목포시 산정동"). 카드 상단 region 표시와 "반영된 학생
   * 프로필 입력값" 카드의 거주 지역 라벨에만 반영하는 **표시 동기화 전용**.
   *
   * **추천 산출 결과 / routeCandidates / evidence / displayHints는 변경되지 않으며,
   * 기존 시연용 권역 기준으로 동작한다**. 상세 지역의 분석지표가 실제 연결 완료된
   * 것처럼 표현하지 않는다. 미주입 시 `rec.region` / `profile.region`으로 자연 fallback
   * (legacy 호출자 호환).
   */
  detailedRegionLabel?: string;
  /**
   * 11-3 1차-183 — StudentProfile 3단계 cascading select에서 lift-up된 상세 지역
   * context (region 매칭용). `detailedRegionLabel`(표시 라벨)과 별도로, "기관 후보
   * (시연용)" 섹션이 institutionHints를 선택 상세 지역 기준으로 **필터링**하기 위해
   * 사용한다 (사용자가 "충청북도 청주시 흥덕구"를 골랐는데 강남구·해운대구·수원시
   * 기관이 카드에 표시되던 부자연스러움 해소).
   *
   * **표시 동기화 + region 필터링 전용** — `profile.region` / `selectedRegion` /
   * `studentScenario` / `routeCandidates` / `buildRouteCandidates` / 추천 산출 로직
   * 변경 0건. `data/*.real` / API 연결 / 좌표 / 거리 계산 모두 도입하지 않음 (이번
   * 단계는 sidoName + sigunguName 일치 필터만). 미주입 시 기존 institutionHints 그대로
   * 표시 (legacy 호출자 호환).
   */
  detailedRegionContext?: {
    sidoName: string;
    sigunguName: string | null;
    thirdLevelName: string;
    sigunguCode: string | null;
    thirdLevelCode: string | null;
  };
}

interface MatchCheck {
  label: string;
  profileValue: string;
  recValue: string;
}

function buildMatchChecks(
  rec: Recommendation,
  profile: StudentProfile,
): MatchCheck[] {
  return [
    {
      label: "관심 진로 분야",
      profileValue: profile.careerInterest,
      recValue: rec.targetProfile.careerInterest,
    },
    {
      label: "이동 가능 범위",
      profileValue: profile.mobilityRange,
      recValue: rec.targetProfile.mobilityRange,
    },
    {
      label: "필요한 지원 수준",
      profileValue: profile.supportLevel,
      recValue: rec.targetProfile.supportLevel,
    },
  ];
}

function selectRecommendations(
  all: Recommendation[],
  regionName: string,
  profile: StudentProfile,
): Recommendation[] {
  const score = (r: Recommendation) => {
    let s = 0;
    if (r.region === regionName) s += 100;
    else if (r.region === "전체") s += 30;
    if (r.targetProfile.careerInterest === profile.careerInterest) s += 20;
    if (r.targetProfile.mobilityRange === profile.mobilityRange) s += 10;
    if (r.targetProfile.supportLevel === profile.supportLevel) s += 5;
    return s;
  };

  return [...all].sort((a, b) => score(b) - score(a)).slice(0, 3);
}

/**
 * 11-3 1차-152 — 카드 상단 "경로 유형 요약" pure helper.
 *
 * programName / matchedRoute.routeType의 한국어·영어 키워드를 안전하게 매칭하여
 * 카드별 차별화된 라벨·제목·설명을 산출한다. fetch / env / storage 접근 0건.
 * data.mart.real / data.master.real / data.indicator.real / data.raw.api / officialResources
 * import 0건. 실제 데이터 연결 완료처럼 단정하지 않으며, 시연용 검토 후보 톤을 유지한다.
 *
 * 매칭 우선순위(중복 키워드 회피):
 * 1. 체험 / 사업장 / workplace / experience → "현장체험 중심 경로"
 * 2. 과정 / 훈련 / training / course → "훈련 중심 경로"
 * 3. 보조원 / 직무 / 취업 / job / employment → "취업탐색 중심 경로"
 * 4. fallback → "검토 후보 경로"
 *
 * routeType이 "agency-based" / "official-resource" / "online" / "mixed" 등일 때도
 * programName 키워드가 더 신뢰성 있다고 판단하여 programName 우선 매칭.
 */
type RecommendationSummary = {
  badgeLabel: string;
  title: string;
  description: string;
  tone: "info" | "success" | "demo" | "neutral";
};

function getRecommendationSummary(
  rec: Recommendation,
  matchedRoute: RouteCandidate | undefined,
): RecommendationSummary {
  const programName = rec.programName?.toLowerCase() ?? "";
  const routeType = matchedRoute?.routeType ?? "";
  const haystack = `${programName} ${routeType}`.toLowerCase();

  if (
    /체험|사업장|workplace|experience/.test(haystack) ||
    routeType === "school-based"
  ) {
    return {
      badgeLabel: "현장체험 중심 경로",
      title: "지역 사업장 체험 경로",
      description:
        "실제 사업장 환경을 경험하며 이동 가능 범위와 현장 적응 가능성을 함께 확인하는 경로입니다.",
      tone: "success",
    };
  }
  if (/과정|훈련|training|course/.test(haystack)) {
    return {
      badgeLabel: "훈련 중심 경로",
      title: "기초 사무역량 훈련 경로",
      description:
        "사무보조 직무를 시작하기 전 필요한 기본 업무 이해와 적응을 점검하는 경로입니다.",
      tone: "info",
    };
  }
  if (/보조원|직무|취업|job|employment/.test(haystack)) {
    return {
      badgeLabel: "취업탐색 중심 경로",
      title: "취업 직무 탐색 경로",
      description:
        "사무보조 직무를 실제 취업 후보로 검토하기 위해 필요한 지원 수준과 상담 포인트를 정리하는 경로입니다.",
      tone: "demo",
    };
  }
  return {
    badgeLabel: "검토 후보 경로",
    title: "맞춤 경로 검토 후보",
    description:
      "학생 프로필과 지역 시연 데이터를 함께 검토하기 위한 후보 경로입니다.",
    tone: "neutral",
  };
}

/**
 * 11-3 1차-170 — 추천 이유 표시 지역 동기화 helper.
 *
 * **문제**: 1차-167에서 detailedRegionLabel을 카드 상단 region span과
 * "반영된 학생 프로필 입력값" 거주 지역에 반영했으나, "추천 이유" 본문은
 * 여전히 `rec.reason` 원문을 그대로 렌더링하고 있었다. `rec.reason` 안에는
 * 기존 demo region·institution 이름(부산광역시 해운대구 / 해운대장애인민간훈련기관
 * 등)이 hardcoded되어 사용자가 상세 지역(예: 청주시 서원구)을 선택해도 추천 이유에
 * "부산광역시 해운대구의 현재 공백 유형 ..."이 보이는 불일치 발생.
 *
 * **해결**: `detailedRegionLabel`이 있으면 안전한 표시 문구를 생성하여 demo region
 * 노출을 차단. 없으면 `undefined` 반환 → view가 기존 legacy JSX(`rec.reason` 포함)로
 * fallback (legacy 호출자 호환).
 *
 * **pure function 정책 (1차-152 `getRecommendationSummary` 동형)**:
 * - fetch / process.env / localStorage / sessionStorage 접근 0건
 * - `data/mart.real` / `data/master.real` / `data/indicator.real` / `data/raw.api`
 *   직접 import 0건
 * - `officialResources` 모듈 import 0건 (1차-171+ C안 별도)
 * - 입력 mutate 0건 — 새 string 반환
 *
 * **표현 정책**:
 * - "표시 지역" / "검토 맥락" / "시연용 추천 후보" / "기존 시연용 권역 기준" /
 *   "실제 상세 지역 분석지표 연결은 후속 단계" 사용 허용
 * - "상세 지역 분석 완료" / "데이터 기반 분석 결과" / "공식자료 매칭 완료" /
 *   "최종 추천" / "자동 추천 확정" / "AI 정책 추천" 금지 (회귀 grep 검증)
 *
 * **추천 산출 로직 무수정** — `selectRecommendations` / `top3` / `matchedRoute` /
 * `summary` / `routeCandidates` / `evidence` / `displayHints` 모두 그대로.
 * 본 helper는 "추천 이유" 본문 표시 문구만 다룬다.
 *
 * @param input.rec — 시그니처 일관성을 위해 받지만 본 단계에서는 직접 사용하지
 *   않는다 (기존 `rec.reason` 원문은 detailedRegionLabel 부재 시 view에서 fallback
 *   으로만 사용). 후속 단계에서 `rec.programName` 등 일부 안전 필드 인용 검토 가능.
 */
function getDisplayReason(input: {
  rec: Recommendation;
  studentProfile: StudentProfile;
  selectedRegion: RegionData;
  detailedRegionLabel: string | undefined;
}): string | undefined {
  const { studentProfile, selectedRegion, detailedRegionLabel } = input;
  if (!detailedRegionLabel) {
    return undefined;
  }
  const gapTypeNote = selectedRegion.gapType
    ? ` 현재 공백 유형(${selectedRegion.gapType})은 기존 시연용 권역 기준 참고값입니다.`
    : "";
  return (
    `학생이 선택한 ${studentProfile.careerInterest} 분야와 ` +
    `${studentProfile.mobilityRange} 조건, 그리고 ${detailedRegionLabel} 표시 지역을 ` +
    `검토 맥락으로 반영한 시연용 추천 후보입니다.` +
    gapTypeNote +
    ` 추천 산출은 기존 시연용 권역 기준으로 동작하며, 실제 상세 지역 분석지표 연결은 후속 단계입니다.`
  );
}

/**
 * 11-3 1차-183 — institutionHints 상세 지역 필터.
 *
 * 사용자가 StudentProfile 3단계 cascading select에서 "충청북도 청주시 흥덕구"를
 * 골랐는데 4번 "맞춤 경로 추천" 카드의 "기관 후보 (시연용)" 섹션에 강남구 /
 * 해운대구 / 수원시 등 타지역 기관이 표시되던 부자연스러움을 해소.
 *
 * **필터 정책 (sidoName + sigunguName 일치)**:
 * - `detailedRegionContext`가 없으면 입력 institutionHints 그대로 반환 (legacy 호출자
 *   호환).
 * - `detailedRegionContext.sigunguName`이 truthy면 `sidoName` + `sigunguName` 모두
 *   일치하는 후보만 반환.
 * - `detailedRegionContext.sigunguName`이 null이면 (세종 등 시군구 단계 없음)
 *   `sidoName` 일치만 검사.
 * - 일치하는 후보가 없으면 빈 배열 — **타지역 fallback 후보를 보여주지 않는다**.
 *
 * pure function — fetch / process.env / localStorage / sessionStorage 접근 0건 /
 * `data/mart.real` / `data/master.real` / `data/indicator.real` / `data/raw.api` 직접
 * import 0건 / `officialResources` 모듈 import 0건 / 입력 mutate 0건.
 *
 * **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** — 시연용
 * 기관 후보 필터 layer. 좌표·실제 이동시간 API는 후속 단계 (이번 단계 거리 계산 0건).
 */
type InstitutionHint = NonNullable<RouteCandidate["institutionHints"]>[number];

interface InstitutionFilterContext {
  sidoName: string;
  sigunguName: string | null;
  thirdLevelName: string;
  sigunguCode: string | null;
  thirdLevelCode: string | null;
}

function getDisplayInstitutionHints(input: {
  institutionHints: InstitutionHint[] | undefined;
  detailedRegionContext: InstitutionFilterContext | undefined;
}): InstitutionHint[] {
  const { institutionHints, detailedRegionContext } = input;
  if (!institutionHints) return [];
  if (!detailedRegionContext) return institutionHints;
  return institutionHints.filter((h) => {
    if (h.sidoName !== detailedRegionContext.sidoName) return false;
    if (detailedRegionContext.sigunguName === null) return true;
    return h.sigunguName === detailedRegionContext.sigunguName;
  });
}

export default function RecommendationResult({
  recommendations,
  selectedRegion,
  studentProfile,
  routeCandidates,
  detailedRegionLabel,
  detailedRegionContext,
}: RecommendationResultProps) {
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setOpenEvidence((prev) => ({ ...prev, [id]: !prev[id] }));

  const top3 = selectRecommendations(
    recommendations,
    selectedRegion.region,
    studentProfile,
  );

  // 11-3 1차-186 — "추천 근거 보기" 펼침 영역 지역 라벨 동기화.
  // detailedRegionLabel이 있으면 첫 항목을 "표시 지역" + "추천 산출 기준" 2개로
  // 분리해 사용자가 카드 상단·"반영된 학생 프로필 입력값"·추천 이유 본문과 동일하게
  // 상세 지역명을 인식할 수 있도록 한다. 없으면 기존 "현재 기준 프로그램 데이터:
  // selectedRegion.region · year년 기준 (시연용)" fallback 유지 (legacy 호출자 호환 +
  // mock 모드 default 시연 회귀 0).
  // **자동 확정 추천이 아니며, 실제 상세 지역 분석지표 연결을 의미하지 않는다** —
  // "추천 산출 기준: 기존 시연용 권역 기준"으로 산출 기준이 변경되지 않았음을 명시.
  // 1차-167 카드 footer 안내문 박스("실제 분석지표 연결은 후속 단계")와 일관 정합.
  const evidenceItems = [
    ...(detailedRegionLabel !== undefined
      ? [
          {
            label: "표시 지역",
            value: detailedRegionLabel,
          },
          {
            label: "추천 산출 기준",
            value: "기존 시연용 권역 기준",
          },
        ]
      : [
          {
            label: "현재 기준 프로그램 데이터",
            value: `${selectedRegion.region} · ${selectedRegion.currentYear}년 기준 (시연용)`,
          },
        ]),
    {
      label: "선택 지역의 현재 공백 유형",
      value: selectedRegion.gapType,
    },
    {
      label: "학생 관심 진로 분야",
      value: studentProfile.careerInterest,
    },
    {
      label: "이동 가능 범위",
      value: studentProfile.mobilityRange,
    },
    {
      label: "필요한 지원 수준",
      value: studentProfile.supportLevel,
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">맞춤 경로 추천 결과</h2>
        <p className="mt-1 text-sm text-slate-600">
          학생 프로필 입력값과 현재 기준 데이터 기반으로 생성된 시연용 추천 결과입니다.
        </p>
      </div>

      {/* 상단 강조: 현재 기준 데이터 기반 */}
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 flex-none text-blue-700" />
          <div>
            <p className="text-sm font-bold leading-snug text-blue-900">
              본 추천 결과는{" "}
              <span className="underline decoration-blue-700 decoration-2 underline-offset-2">
                현재 기준 데이터({selectedRegion.currentYear}년)
              </span>
              와{" "}
              <span className="underline decoration-blue-700 decoration-2 underline-offset-2">
                학생 프로필 입력값
              </span>
              을 결합해 생성된 시연용 결과입니다.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-blue-800">
              연도별 추세 데이터는 교육청 정책 판단용이며 학생 추천에는 사용하지
              않습니다. 모든 추천은 AI 최종 판단이 아니라 교사 검토가 필요한
              초안입니다.
            </p>
          </div>
        </div>
      </div>

      {/* 입력 프로필 컨텍스트 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">
            반영된 학생 프로필 입력값
          </h3>
          <Badge tone="info" className="ml-auto">
            추천 컨텍스트
          </Badge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs md:grid-cols-4">
          <div>
            <dt className="text-slate-500">거주 지역</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {/* 11-3 1차-167 — 상세 지역 선택값 우선 표시. 미선택 시 학생 프로필 거주
                  지역으로 fallback (legacy 흐름 동형). 추천 산출은 기존 시연용 권역
                  기준으로 동작하며, 상세 지역의 분석지표가 실제 연결된 것은 아니다. */}
              {detailedRegionLabel ?? studentProfile.region}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">관심 진로 분야</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {studentProfile.careerInterest}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">이동 가능 범위</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {studentProfile.mobilityRange}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">필요한 지원 수준</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {studentProfile.supportLevel}
            </dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          선택 지역의 현재 공백 유형:{" "}
          <span className="font-medium text-slate-700">
            {selectedRegion.gapType}
          </span>{" "}
          · 추천 결과는 입력값 변경 시 즉시 갱신됩니다.
        </p>
        {/* 11-3 1차-167 — 상세 지역 선택값이 lift-up된 경우에만 표시되는 안내.
            카드 상단·거주 지역 라벨이 상세 지역으로 바뀌는 것이 분석지표 연결을
            의미하는 것이 아님을 사용자에게 명시 (정직성 강화). 미선택 시 (legacy
            default) 미렌더 — 공모 시연 PPT 캡처 회귀 0. */}
        {detailedRegionLabel && (
          <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
            상세 지역 선택값은 화면 표시와 검토 맥락에 반영됩니다. 추천 산출은 기존
            시연용 권역 기준으로 동작하며, 실제 분석지표 연결은 후속 단계입니다.
          </p>
        )}
      </div>

      {/* 추천 카드 3개 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {top3.map((rec, idx) => {
          const checks = buildMatchChecks(rec, studentProfile);
          const matched = checks.filter(
            (c) => c.profileValue === c.recValue,
          );
          const unmatched = checks.filter(
            (c) => c.profileValue !== c.recValue,
          );
          const isOpen = openEvidence[rec.id] ?? false;
          // 11-3 1차-101 — candidateId(=rec.id) 기준 RouteCandidate 매칭.
          // matchedRoute가 있을 때만 카드 내부 "검토 후보 보강 정보" 영역 렌더.
          // optional prop이라 legacy 호출자(routeCandidates 미주입) 호환.
          const matchedRoute = routeCandidates?.find(
            (candidate) => candidate.candidateId === rec.id,
          );
          // 11-3 1차-152 — programName / routeType 기반 카드별 경로 유형 요약.
          // 사용자가 카드 상단에서 바로 차이를 인지하도록 차별화.
          const summary = getRecommendationSummary(rec, matchedRoute);
          // 11-3 1차-170 — 추천 이유 표시 지역 동기화. detailedRegionLabel 있으면
          // 안전 문구를 생성하여 rec.reason 원문 내 demo region(부산광역시 해운대구 등)
          // 노출 차단. 없으면 undefined → view가 legacy JSX(rec.reason 포함)로 fallback.
          const displayReason = getDisplayReason({
            rec,
            studentProfile,
            selectedRegion,
            detailedRegionLabel,
          });
          // 11-3 1차-183 — 기관 후보 상세 지역 필터. detailedRegionContext가 있으면
          // sidoName + sigunguName 일치 후보만 표시 (타지역 fallback 0건). 매칭 0건
          // + institutionHints 보유 + 상세 지역 선택 시점에는 정직한 안내문으로 fallback.
          const displayInstitutionHints = getDisplayInstitutionHints({
            institutionHints: matchedRoute?.institutionHints,
            detailedRegionContext,
          });
          const showInstitutionFallbackNotice =
            detailedRegionContext !== undefined &&
            matchedRoute?.institutionHints !== undefined &&
            matchedRoute.institutionHints.length > 0 &&
            displayInstitutionHints.length === 0;

          return (
            <article
              key={rec.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {/* 카드 상단 라벨 — matchedRoute 있을 때 "검토 후보" / "교사 검토 필요" 안전 라벨 추가 (1차-149 A안). */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="info" icon={<Sparkles className="h-3 w-3" />}>
                  입력 프로필 기반 추천
                </Badge>
                <Badge tone="neutral">추천 {idx + 1}</Badge>
                {matchedRoute && (
                  <>
                    <Badge tone="info">검토 후보</Badge>
                    <Badge tone="neutral">교사 검토 필요</Badge>
                  </>
                )}
                <span className="ml-auto text-xs text-slate-500">
                  {/* 11-3 1차-167 — 상세 지역 선택값 우선 표시 (표시 동기화 전용).
                      미주입 시 legacy rec.region 그대로. 추천 산출은 기존 시연용 권역
                      기준 동작 유지. */}
                  {detailedRegionLabel ?? rec.region}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">
                {rec.programName}
              </h3>

              {/* 11-3 1차-152 — 카드 상단 "경로 유형 요약" 패널.
                  programName / matchedRoute.routeType 기반으로 카드별 라벨·제목·1문장 설명을
                  표시하여 사용자가 카드 상단에서 바로 차이를 인지할 수 있게 한다. helper는
                  pure function이며 data/*.real / officialResources / 외부 fetch 접근 0건. */}
              <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-slate-600" />
                  <Badge tone={summary.tone}>{summary.badgeLabel}</Badge>
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
                  {summary.title}
                </p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  {summary.description}
                </p>
              </div>

              {/* 11-3 1차-149 A안 — "추천 검토 근거" 영역을 카드 상단으로 승격.
                  matchedRoute(=RouteCandidate)의 whyThisFits / requiredTeacherCheck /
                  familyDiscussionPoint / limitations를 카드별로 차별화 노출한다.
                  routeType, candidateId는 1차-93 builder에서 카드별로 다르게 산출되므로
                  3개 카드가 시각적으로 명확히 구분된다. officialResourceIds 연계는
                  후속 검토 단계로 보류 (KEAD / 복지시설 / 교통약자 이동지원 등). */}
              {matchedRoute && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-slate-600" />
                    <span className="font-semibold text-slate-900">
                      추천 검토 근거
                    </span>
                    <Badge tone="neutral">{matchedRoute.routeType}</Badge>
                    <Badge tone="demo" className="ml-auto">
                      시연용 근거
                    </Badge>
                  </div>
                  <p className="mt-2 leading-relaxed text-slate-700">
                    <strong className="text-slate-900">왜 이 경로가 맞는지:</strong>{" "}
                    {matchedRoute.whyThisFits}
                  </p>

                  <div className="mt-3 space-y-2.5">
                    <div>
                      <p className="font-medium text-slate-700">
                        교사 확인 필요
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {matchedRoute.requiredTeacherCheck.map((item) => (
                          <li key={item} className="flex items-start gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-slate-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-slate-700">
                        학생·학부모 상담 포인트
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {matchedRoute.familyDiscussionPoint.map((item) => (
                          <li key={item} className="flex items-start gap-1.5">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-slate-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-slate-700">한계 및 주의</p>
                      <ul className="mt-1 space-y-0.5">
                        {matchedRoute.limitations.map((item) => (
                          <li key={item} className="flex items-start gap-1.5">
                            <Circle className="mt-0.5 h-3 w-3 flex-none text-slate-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="mt-3 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
                    본 후보는 시연용 검토 후보입니다. 자동 확정 추천이 아니며, 교사 검토 후 학생·보호자 상담에 활용해 주세요. 공식자료(KEAD / NISE / 복지시설 / 교통약자 이동지원 등) 연계는 후속 검토 단계입니다.
                  </p>
                </div>
              )}

              {/* 11-3 1차-180 — "기관 후보 (시연용)" 섹션.
                  matchedRoute.institutionHints는 1차-175 recommendationInstitution fixture
                  기반 사람 검수 후보 (1차-178 buildRouteCandidates에서 selectInstitutionsForCandidate
                  cascade로 매칭). matchedRoute가 있고 institutionHints에 후보가 1건 이상일 때만
                  렌더링. 기관 후보 0건 시 미렌더 (legacy 호출자 / 매칭 0건 안전).

                  기존 "관련 기관" dl 필드는 유지 — 두 layer 의미 분리:
                  - "관련 기관" (dl) = 기관 유형·역할 안내 (1차-163 displayHints / rec.relatedAgency)
                  - "기관 후보 (시연용)" = 사람 검수 실제 기관명 후보 목록 (1차-175 fixture)

                  **자동 확정 추천이 아니며, 실제 기관 매칭 완료를 의미하지 않는다** —
                  실제 참여 가능 여부는 사용자가 기관 페이지에서 직접 확인 필요.
                  raw 매칭 메타(institutionType / regionCode / supportedRouteTypes /
                  supportedEvidenceIds)는 view에 도달하지 않음 (1차-178 7 키 only contract). */}
              {/* 11-3 1차-183 — displayInstitutionHints는 detailedRegionContext 기준으로
                  필터된 결과. 상세 지역 미선택 시 institutionHints 그대로. 필터로 0건이
                  되면 fallback notice 표시 (타지역 fallback 후보 0건 정책). */}
              {displayInstitutionHints.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 flex-none text-slate-600" />
                    <span className="font-semibold text-slate-900">
                      기관 후보 (시연용)
                    </span>
                    <Badge tone="demo" className="ml-auto">
                      시연용 기관 후보
                    </Badge>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {displayInstitutionHints.map((h) => (
                      <li
                        key={h.institutionId}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-medium text-slate-900">
                            {h.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {h.sidoName} {h.sigunguName}
                          </span>
                          <Badge tone="neutral" className="ml-auto">
                            {h.role}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {h.sourceLabel} · {h.caution}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
                    실제 참여 가능 여부는 기관에 직접 확인이 필요합니다. 본 후보는 시연용 기관 후보이며, 자동 확정 추천이 아닙니다.
                  </p>
                </div>
              )}

              {/* 11-3 1차-183 — 상세 지역 필터로 후보 0건이 된 경우 정직한 안내. 타지역
                  fallback 후보를 보여주지 않으며, "준비되지 않았습니다" 표현으로 시연용
                  데이터 한계를 사용자에게 명시. */}
              {showInstitutionFallbackNotice && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 flex-none text-slate-600" />
                    <span className="font-semibold text-slate-900">
                      기관 후보 (시연용)
                    </span>
                    <Badge tone="demo" className="ml-auto">
                      시연용 기관 후보
                    </Badge>
                  </div>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    선택 상세 지역(<span className="font-medium text-slate-900">{detailedRegionLabel ?? `${detailedRegionContext?.sidoName ?? ""} ${detailedRegionContext?.sigunguName ?? ""}`.trim()}</span>)의 시연용 기관 후보는 아직 준비되지 않았습니다.
                  </p>
                  <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
                    실제 참여 가능 여부는 지역 기관 또는 담당 교사 확인이 필요합니다. 본 안내는 시연용 자료이며, 자동 확정 추천이 아닙니다.
                  </p>
                </div>
              )}

              {/* 학생 프로필 매칭 — matchedRoute 있을 때는 condensed 모드(matched만, unmatched 상세 생략)로
                  카드 시각 노이즈 감소. matchedRoute 없을 때는 기존 fallback 그대로 유지 (1차-149 A안). */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    학생 프로필 매칭
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {matched.length}/{checks.length} 일치
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {matched.map((m) => (
                    <li
                      key={m.label}
                      className="flex items-start gap-1.5 text-emerald-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none" />
                      <span>
                        {m.label}:{" "}
                        <strong className="text-emerald-800">
                          {m.profileValue}
                        </strong>{" "}
                        (일치)
                      </span>
                    </li>
                  ))}
                  {/* unmatched 상세 — matchedRoute 있을 때 카드 시각 노이즈 감소 위해 생략.
                      RouteCandidate code/시연용 라벨이 반복 노출되는 문제를 해소한다.
                      matchedRoute 없을 때는 fallback으로 기존 unmatched 상세 그대로 표시. */}
                  {!matchedRoute &&
                    unmatched.map((m) => (
                      <li
                        key={m.label}
                        className="flex items-start gap-1.5 text-slate-500"
                      >
                        <Circle className="mt-0.5 h-3 w-3 flex-none" />
                        <span>
                          {m.label}: <em>학생 {m.profileValue}</em> ·{" "}
                          <em>추천 {m.recValue}</em>
                        </span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* 추천 이유 (학생 선택값 자연스럽게 반영).
                  11-3 1차-170 — detailedRegionLabel 있으면 안전 문구로 교체하여
                  rec.reason 원문 내 demo region(부산광역시 해운대구 / 해운대장애인
                  민간훈련기관 등) 노출 차단. 없으면 기존 legacy JSX (rec.reason 포함)
                  fallback 유지 — mock 모드 default 시연 회귀 0. */}
              {displayReason !== undefined ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  <strong className="text-slate-900">추천 이유:</strong>{" "}
                  {displayReason}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-slate-700">
                  <strong className="text-slate-900">추천 이유:</strong>{" "}
                  학생이 선택한{" "}
                  <strong className="text-slate-900">
                    {studentProfile.careerInterest}
                  </strong>{" "}
                  분야와{" "}
                  <strong className="text-slate-900">
                    {studentProfile.mobilityRange}
                  </strong>{" "}
                  조건, 그리고 {selectedRegion.region}의 현재 공백 유형(
                  <strong className="text-slate-900">
                    {selectedRegion.gapType}
                  </strong>
                  )을 고려한 추천입니다. {rec.reason}
                </p>
              )}

              {/* 1차-163 — matchedRoute.displayHints가 있으면 우선 사용, 없으면 rec
                  필드로 자동 fallback (legacy 호출자 호환). 자동 확정 추천이 아니며,
                  실제 기관 매칭 완료를 의미하지 않는다 — 시연용 검토 정보. */}
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-500" />
                  <div>
                    <dt className="font-medium text-slate-500">접근성</dt>
                    <dd className="text-slate-800">
                      {matchedRoute?.displayHints?.accessibility ??
                        rec.accessibility}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-500" />
                  <div>
                    <dt className="font-medium text-slate-500">관련 기관</dt>
                    <dd className="text-slate-800">
                      {matchedRoute?.displayHints?.relatedAgency ??
                        rec.relatedAgency}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-500" />
                  <div>
                    <dt className="font-medium text-slate-500">교사 상담 메모</dt>
                    <dd className="text-slate-800">
                      {matchedRoute?.displayHints?.teacherMemo ??
                        rec.teacherMemo}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Route className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-500" />
                  <div>
                    <dt className="font-medium text-slate-500">대체 경로</dt>
                    <dd className="text-slate-800">
                      {matchedRoute?.displayHints?.alternativePath ??
                        rec.alternativePath}
                    </dd>
                  </div>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => toggle(rec.id)}
                className="mt-4 inline-flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span>추천 근거 보기</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {isOpen ? (
                <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {evidenceItems.map((ev) => (
                    <li key={ev.label} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-emerald-600" />
                      <span>
                        <strong className="text-slate-900">{ev.label}:</strong>{" "}
                        {ev.value}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-auto pt-4">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  교사 검토 후 학생·보호자 상담에 활용
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
