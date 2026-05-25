import { useMemo, useState } from "react";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import RegionalAnalysis from "./components/RegionalAnalysis";
import StudentProfile from "./components/StudentProfile";
import RecommendationResult from "./components/RecommendationResult";
import GeneratedOutputs from "./components/GeneratedOutputs";
import EthicsValidation from "./components/EthicsValidation";
import legacyRegionsData from "./data/regions.json";
import legacyRecommendationsData from "./data/recommendations.json";
import optionsData from "./data/studentProfileOptions.json";
import { useRegionList } from "./hooks/useRegionList";
import { useRegionDashboardData } from "./hooks/useRegionDashboardData";
import { toRegionDataList } from "./lib/dashboard/regionAdapter";
import { toLegacyRecommendations } from "./lib/dashboard/recommendationAdapter";
// 11-3 1차-97 — buildScenarioFromProfile derived value 도입.
// legacy StudentProfile state는 그대로 유지하고 StudentScenario는 useMemo로 파생.
import { buildScenarioFromProfile } from "./lib/scenario/buildScenarioFromProfile";
// 11-3 1차-101 — buildRouteCandidates derived value 도입.
// legacy Recommendation[] 흐름은 그대로 유지하고 RouteCandidate[]는 별도 derived layer.
import { buildRouteCandidates } from "./lib/scenario/buildRouteCandidates";
// 11-3 1차-105 — buildGapTrendSignal + buildScenarioReport derived value 도입.
// selectedRegion.yearlySupport → GapTrendSignal[] + scenario+trend+routes → ScenarioReport.
// 기존 3개 TABS body는 유지하고 ScenarioReport는 별도 카드(보고서 근거 및 검토사항)로 표시.
import { buildGapTrendSignal } from "./lib/scenario/buildGapTrendSignal";
import { buildScenarioReport } from "./lib/scenario/buildScenarioReport";
// 11-3 1차-110 — REGION_CATALOG 17 시도 skeleton을 StudentProfile에 전달.
// 정보 카드로만 표시 (클릭 인터랙션 없음). 1차-89 schema-only가 처음 화면에 연결되는 단계.
// REGION_CATALOG는 const 배열이라 ref-stable — useMemo 불필요.
import { REGION_CATALOG } from "./data/regionCatalog";
// 11-3 1차-167 — StudentProfile의 3단계 cascading select 결과를 lift-up 받기 위한 type.
// RecommendationResult 표시 지역 동기화 전용 (B안). buildScenarioFromProfile /
// buildRouteCandidates / 추천 산출 로직은 변경하지 않는다.
import type { RegionHierarchyEntry } from "./data/regionHierarchy";
import type {
  GapTrendSignal,
  RegionData,
  Recommendation,
  RouteCandidate,
  ScenarioReport,
  StudentProfile as StudentProfileType,
  StudentProfileOptions,
  StudentScenario,
  SectionId,
} from "./types";

const legacyRegions = legacyRegionsData as RegionData[];
const legacyRecommendations = legacyRecommendationsData as Recommendation[];
const options = optionsData as StudentProfileOptions;

const DEFAULT_PROFILE: StudentProfileType = {
  region: options.regions[0],
  supportNeed: options.supportNeeds[0],
  careerInterest: options.careerInterests[0],
  mobilityRange: options.mobilityRanges[1],
  activityPreference: options.activityPreferences[0],
  supportLevel: options.supportLevels[1],
};

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  // 사용자가 명시적으로 선택한 시군구 코드만 state로 보관.
  // 화면에서 사용할 selectedRegionCode는 serviceRegions와 함께 useMemo로 파생한다
  // (useEffect + setState 패턴 회피 → react-hooks/set-state-in-effect 규칙 준수).
  const [userSelectedRegionCode, setUserSelectedRegionCode] =
    useState<string>("");
  const [studentProfile, setStudentProfile] =
    useState<StudentProfileType>(DEFAULT_PROFILE);
  // 11-3 1차-167 — StudentProfile 3단계 cascading select에서 lift-up 받은 상세 지역
  // entry. RecommendationResult 카드 상단·"반영된 학생 프로필 입력값" 거주 지역
  // 라벨에만 반영하는 표시 동기화 전용 (B안). profile.region / selectedRegion /
  // studentScenario / routeCandidates / 추천 산출 로직은 변경하지 않는다.
  // 미선택 시 null — RecommendationResult가 rec.region / profile.region으로 자동 fallback.
  const [selectedDetailedRegion, setSelectedDetailedRegion] =
    useState<RegionHierarchyEntry | null>(null);

  // 7-1. 지역 목록 (service)
  const { regions: serviceRegions } = useRegionList();

  // 7-2. selectedRegionCode를 derived value로 계산.
  // - 사용자가 선택한 코드가 serviceRegions에 존재하면 그 값을 사용
  // - 그렇지 않으면 첫 시군구 코드로 fallback (serviceRegions 로딩 전엔 빈 문자열)
  const defaultRegionCode = serviceRegions[0]?.regionCode ?? "";
  const selectedRegionCode = useMemo(() => {
    if (
      userSelectedRegionCode.length > 0 &&
      serviceRegions.some(
        (region) => region.regionCode === userSelectedRegionCode,
      )
    ) {
      return userSelectedRegionCode;
    }
    return defaultRegionCode;
  }, [defaultRegionCode, serviceRegions, userSelectedRegionCode]);

  // 7-3. 선택 지역의 도메인 데이터 + mvp-v1 계산
  const dashboardData = useRegionDashboardData(selectedRegionCode);

  // 11-3 1차-97 — legacy studentProfile을 비식별 StudentScenario로 파생.
  // 1차-93 buildScenarioFromProfile pure mapper 호출. 입력 변경 시 자동 재계산.
  // RouteCandidate / GapTrendSignal / ScenarioReport 진입은 1차-99 / 1차-101 별도 단계.
  const studentScenario = useMemo<StudentScenario>(
    () => buildScenarioFromProfile(studentProfile),
    [studentProfile],
  );

  // 7-4. displayedRegions: serviceRegions이 있으면 adapter 변환, 없으면 legacy
  // 11-3 1차-42 — dashboardData.demoTransitionIndex를 selectedRegionPrecomputed로 전달.
  // 11-3 1차-44 — VITE_DATA_SOURCE === "etl"일 때만 전달. mock 모드는 undefined → mock 회귀 0.
  // 1차-44 정책: etl 모드 + precomputed 있음 시 regionAdapter가 precomputed를 currentGapIndex
  //   1순위로 사용. mock 모드는 기존 4단계 우선순위 그대로 (selectedRegionPrecomputed 미주입).
  // 11-3 1차-46 — etl 모드 + precomputed 있음 시 selectedRegionPrecomputedPartial=true 전달.
  //   indicator.real은 C/D/E/F 도메인 부재 partial 산출물이라 Dashboard에 partial badge를
  //   표시해 사용자에게 정직성 강화. mock 모드는 undefined → badge 미표시 (시연 회귀 0).
  // 환경변수는 App.tsx에서만 검사 — regionAdapter는 pure function 유지.
  const isEtlMode = import.meta.env.VITE_DATA_SOURCE === "etl";
  const isPrecomputedActive =
    isEtlMode && dashboardData.demoTransitionIndex !== undefined;
  const displayedRegions = useMemo<RegionData[]>(() => {
    if (serviceRegions.length === 0) {
      return legacyRegions;
    }
    return toRegionDataList({
      regions: serviceRegions,
      selectedRegionCode,
      selectedRegionCalculated: dashboardData.calculatedTransitionIndex,
      selectedRegionPrecomputed: isEtlMode
        ? dashboardData.demoTransitionIndex
        : undefined,
      selectedRegionPrecomputedPartial: isPrecomputedActive ? true : undefined,
      legacyFallbackRegions: legacyRegions,
    });
  }, [
    serviceRegions,
    selectedRegionCode,
    dashboardData.calculatedTransitionIndex,
    dashboardData.demoTransitionIndex,
    isEtlMode,
    isPrecomputedActive,
  ]);

  // 7-5. selectedRegion: displayedRegions에서 selectedRegionCode로 lookup.
  //      toRegionDataList가 이미 selectedRegionCalculated를 적용해 mvp-v1 override를
  //      반영했으므로, 추가 변환 없이 그대로 찾는다. legacy fallback도 일관됨.
  const selectedRegion = useMemo<RegionData>(() => {
    const found = displayedRegions.find(
      (r) => r.regionCode === selectedRegionCode,
    );
    return found ?? displayedRegions[0] ?? legacyRegions[0];
  }, [displayedRegions, selectedRegionCode]);

  // 7-6. selectedRegionName 파생 (별도 상태 아님)
  const selectedRegionName = selectedRegion.region;

  // 7-7. 추천 데이터 (service 우선, 없으면 legacy fallback)
  const displayedRecommendations = useMemo<Recommendation[]>(
    () =>
      toLegacyRecommendations({
        recommendation: dashboardData.recommendation,
        selectedRegionName,
        selectedRegionCode,
        legacyFallback: legacyRecommendations,
      }),
    [dashboardData.recommendation, selectedRegionName, selectedRegionCode],
  );

  // 11-3 1차-101 — 1차-93 buildRouteCandidates pure builder 호출.
  // displayedRecommendations(legacy Recommendation[])를 RouteCandidate[]로 변환.
  // legacy 흐름은 그대로 유지하고, RecommendationResult에 별도 prop으로 전달하여
  // 각 카드 내부에 "검토 후보 보강 정보" 영역을 렌더할 수 있게 한다.
  // candidateId = legacy rec.id 이므로 카드별 매칭은 단순 find()로 처리.
  const routeCandidates = useMemo<RouteCandidate[]>(
    () =>
      buildRouteCandidates({
        scenario: studentScenario,
        recommendations: displayedRecommendations,
      }),
    [studentScenario, displayedRecommendations],
  );

  // 11-3 1차-105 — 1차-93 buildGapTrendSignal pure builder 호출.
  // selectedRegion.yearlySupport 시계열을 GapTrendSignal[]로 변환.
  // yearlySupport 2건+ → first/last delta로 trendDirection 추론, dataMode "mock".
  // yearlySupport 1건/빈 배열 → "unknown" + limitations 필수. 실제 없는 연도별
  // 추세를 사실처럼 표현하지 않도록 1차-93 정직성 정책 그대로.
  const gapTrendSignals = useMemo<GapTrendSignal[]>(
    () => buildGapTrendSignal(selectedRegion),
    [selectedRegion],
  );

  // 11-3 1차-167 — 상세 지역 표시 라벨 derivation. selectedDetailedRegion이 있으면
  // "시도 시군구 3단계" 형태로 합성, 없으면 undefined (RecommendationResult가 자동
  // rec.region / profile.region fallback). 표시 전용이라 추천 산출 / scenario / route
  // candidate 흐름에는 미반영.
  const selectedDetailedRegionLabel = selectedDetailedRegion
    ? [
        selectedDetailedRegion.sidoName,
        selectedDetailedRegion.sigunguName,
        selectedDetailedRegion.thirdLevelName,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" ")
    : undefined;

  // 11-3 1차-105 — 1차-93 buildScenarioReport pure assembler 호출.
  // studentScenario + gapTrendSignals + routeCandidates → ScenarioReport.
  // generatedBy: "template" 고정 (AI 도입은 별도 합의). 1차-57 follow-up
  // 통일 안전 문구가 reviewChecklist 1번 자리에 포함.
  // GeneratedOutputs에 별도 prop으로 전달하여 "보고서 근거 및 검토사항" 카드를
  // 자료 기반 시연용 초안 카드 직후·데이터·AI 검증 현황 카드 직전에 렌더.
  const scenarioReport = useMemo<ScenarioReport>(
    () =>
      buildScenarioReport({
        scenario: studentScenario,
        trendSignals: gapTrendSignals,
        routeCandidates,
      }),
    [studentScenario, gapTrendSignals, routeCandidates],
  );

  // 7-8. 컴포넌트가 regionName 문자열을 onChange로 넘김 → regionCode 매핑
  const handleSelectRegion = (regionName: string) => {
    const matched = displayedRegions.find((r) => r.region === regionName);
    if (matched) {
      setUserSelectedRegionCode(matched.regionCode);
    }
  };

  // 7-9. 학생 프로필의 거주 지역 변경 시도. service 6시군구와 legacy 4권역의
  //      이름이 매칭되지 않으면 selectedRegionCode는 변경되지 않음 (의도된 7단계 한계).
  const handleProfileChange = (next: StudentProfileType) => {
    setStudentProfile(next);
    if (next.region !== selectedRegionName) {
      const matched = displayedRegions.find((r) => r.region === next.region);
      if (matched) setUserSelectedRegionCode(matched.regionCode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {activeSection === "dashboard" && (
          <Dashboard
            regions={displayedRegions}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
            recommendations={displayedRecommendations}
          />
        )}
        {activeSection === "regional" && (
          <RegionalAnalysis
            regions={displayedRegions}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
          />
        )}
        {activeSection === "profile" && (
          <StudentProfile
            options={options}
            profile={studentProfile}
            onChange={handleProfileChange}
            onGoToRecommendation={setActiveSection}
            scenario={studentScenario}
            regionCatalog={REGION_CATALOG}
            onDetailedRegionChange={setSelectedDetailedRegion}
          />
        )}
        {activeSection === "recommendation" && (
          <RecommendationResult
            recommendations={displayedRecommendations}
            selectedRegion={selectedRegion}
            studentProfile={studentProfile}
            routeCandidates={routeCandidates}
            detailedRegionLabel={selectedDetailedRegionLabel}
            detailedRegionContext={
              selectedDetailedRegion
                ? {
                    sidoName: selectedDetailedRegion.sidoName,
                    sigunguName: selectedDetailedRegion.sigunguName,
                    thirdLevelName: selectedDetailedRegion.thirdLevelName,
                    sigunguCode: selectedDetailedRegion.sigunguCode,
                    thirdLevelCode: selectedDetailedRegion.thirdLevelCode,
                  }
                : undefined
            }
          />
        )}
        {activeSection === "ai-outputs" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                AI 산출물 및 검증
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                AI 초안 산출물과 검증 절차, 윤리·개인정보 체크리스트를 함께 확인합니다.
              </p>
            </div>
            <GeneratedOutputs scenarioReport={scenarioReport} />
            <EthicsValidation />
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-4 text-xs text-slate-500">
          본 웹 프로토타입은 15쪽 발표자료 전체를 대체하지 않으며, 발표자료 중
          실제 서비스 제공 화면을 시연하기 위한 작동형 예시입니다. 모든 수치는
          시연용 더미 데이터입니다.
        </div>
      </footer>
    </div>
  );
}

export default App;
