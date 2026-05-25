import { useEffect, useMemo, useState } from "react";
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Globe,
  Database,
  AlertCircle,
} from "lucide-react";
import Badge from "./Badge";
import type { RegionCatalogEntry } from "../data/regionCatalog";
import {
  getSidoList,
  getSigunguBySido,
  getThirdLevelBySigungu,
  getThirdLevelForSidoWithoutSigungu,
  getEntryByThirdLevelCode,
} from "../data/regionHierarchy";
import type {
  ReadinessStatus,
  RegionHierarchyEntry,
  ThirdLevelType,
} from "../data/regionHierarchy";
import type {
  StudentProfile as StudentProfileType,
  StudentProfileOptions,
  StudentScenario,
  SectionId,
} from "../types";

interface StudentProfileProps {
  options: StudentProfileOptions;
  profile: StudentProfileType;
  onChange: (profile: StudentProfileType) => void;
  onGoToRecommendation: (section: SectionId) => void;
  /**
   * 11-3 1차-97 — App.tsx에서 buildScenarioFromProfile로 파생한 비식별 StudentScenario.
   * 기존 입력 UI(profile)와 별도 layer — 비식별 코드 기반 요약 표시 전용.
   * optional이라 legacy 호출자(scenario 미주입)에서도 호환된다.
   */
  scenario?: StudentScenario;
  /**
   * 11-3 1차-110 — App.tsx에서 전달한 1차-89 REGION_CATALOG 17 시도 skeleton.
   *
   * **1차-141 변경**: 3단계 cascading select(1차-136 fixture + 1차-137 helper)
   * 도입으로 UI 직접 활용은 없음. App.tsx prop 시그니처 변경 회피를 위해
   * interface에는 유지 (1차-110 그대로) — App.tsx 무수정 정책 일관. 후속 단계
   * (예: 통계·안내 카드)에서 다시 활용 가능.
   */
  regionCatalog?: ReadonlyArray<RegionCatalogEntry>;
  /**
   * 11-3 1차-167 — 3단계 cascading select에서 선택된 상세 지역 entry를
   * App.tsx로 lift-up하기 위한 callback. selectedHierarchyEntry가 변경될 때마다
   * (시도/시군구/3단계 변경 또는 초기화) 호출된다. 미선택 시 null.
   *
   * **이번 단계는 표시 지역 동기화 전용** — RecommendationResult 카드 상단·
   * "반영된 학생 프로필 입력값" 카드의 거주 지역 라벨에만 반영. `profile.region` /
   * `buildScenarioFromProfile` / `buildRouteCandidates` / 추천 산출 로직은
   * 변경하지 않으며, 실제 분석지표 연결이 완료된 것처럼 표현하지 않는다.
   *
   * optional이라 legacy 호출자(callback 미주입)에서도 호환된다.
   */
  onDetailedRegionChange?: (entry: RegionHierarchyEntry | null) => void;
}

/**
 * 11-3 1차-110 / 1차-130 / 1차-141 일관 — readinessStatus 4-union → 화면 표시 라벨.
 *
 * 1차-141에서 3단계 cascade 결과 카드의 `readinessStatus` 표시에 재사용.
 * regionHierarchy의 `ReadinessStatus` type과 RegionCatalog의 `RegionReadinessStatus`
 * type은 동일한 4-union 문자열 — 라벨 그대로 호환된다.
 */
const READINESS_LABEL: Record<ReadinessStatus, string> = {
  dataReady: "분석 가능",
  partial: "일부 시군구 시연 지표 보유",
  codeOnly: "행정구역 코드 연결 완료 · 분석지표 미연결",
  unavailable: "자료 준비 중",
};

/**
 * 11-3 1차-141 — readinessStatus 4-union → Badge tone 매핑.
 *
 * 1차-110 패턴 동형 — dataReady success / partial info / 그 외 neutral.
 * 공모전 시연 컨텍스트에서 부정 인상 회피.
 */
function readinessTone(
  status: ReadinessStatus,
): "info" | "success" | "neutral" {
  if (status === "dataReady") return "success";
  if (status === "partial") return "info";
  return "neutral";
}

/**
 * 11-3 1차-141 — thirdLevelType 4-union → 화면 표시 라벨.
 */
const THIRD_LEVEL_TYPE_LABEL: Record<ThirdLevelType, string> = {
  legalDong: "법정동",
  adminDong: "행정동",
  adminGu: "일반구",
  none: "단계 없음",
};

/**
 * 11-3 1차-141 — martCoverage 3-union → 결과 카드 안내 문구 (정직성 강화).
 *
 * **fake numeric 표기 금지** — "schoolCount > 0"도 N건 숫자가 아닌 카테고리 문구로만
 * 표시. 1차-136 fixture는 schoolCount 슬롯 자체가 부재이며, mart.real의 정확 수치는
 * 결과 카드에서 노출하지 않는다 (5번 탭 "NEIS 학교기본정보 OpenAPI 검증 결과" 카드는
 * 별도 layer로 100건 분량 수치 표시 유지).
 */
const MART_COVERAGE_LABEL = {
  "schoolCount > 0": "시연용 학교 데이터 매칭 확인",
  "분석지표 미연결": "분석지표 미연결",
  "행정구역 코드만 확인": "행정구역 코드만 확인",
} as const;

/**
 * martCoverage별 사용자 친화 본문 안내.
 * 내부 개발 용어("verified subset fixture" / "mart.real" / "별도 layer" 등)는 화면에
 * 노출하지 않는다. 추천/보고서가 거주 지역 권역 기준으로 동작한다는 정직성 안내는
 * 3종 모두 일관 유지한다.
 */
const MART_COVERAGE_BODY = {
  "schoolCount > 0":
    "선택한 지역은 로컬 ETL 검증 데이터에서 학교정보가 확인된 지역입니다. 다만 추천 결과와 보고서는 기존 시연용 권역 기준으로 표시됩니다.",
  "분석지표 미연결":
    "선택한 지역의 행정구역 코드는 확인되었습니다. 아직 이 상세 지역의 분석지표는 연결되지 않았기 때문에, 추천 결과와 보고서는 기존 시연용 권역 기준으로 표시됩니다. NEIS 학교정보 API 검증 결과는 5번 탭에서 확인할 수 있습니다.",
  "행정구역 코드만 확인":
    "선택한 지역은 행정구역 코드 기준으로 확인되었습니다. 현재 시연 화면에서는 이 지역의 분석지표가 아직 연결되지 않았습니다. 추천 결과와 보고서는 기존 시연용 권역 기준으로 표시됩니다.",
} as const;

const FIELD_LABELS: Record<keyof StudentProfileType, string> = {
  region: "거주 지역",
  supportNeed: "지원 필요 영역",
  careerInterest: "관심 진로 분야",
  mobilityRange: "이동 가능 범위",
  activityPreference: "선호 활동",
  supportLevel: "필요한 지원 수준",
};

export default function StudentProfile({
  options,
  profile,
  onChange,
  onGoToRecommendation,
  scenario,
  onDetailedRegionChange,
}: StudentProfileProps) {
  // 11-3 1차-141 — 3단계 cascading select local state.
  // StudentProfile 내부에서만 관리 — App.tsx까지 lift 안 함. profile.region / App.tsx
  // selectedRegion / 추천 / 보고서 / scenario 흐름 변경 0건 (1차-115 / 1차-130 정책 일관).
  const [selectedHierarchySidoCode, setSelectedHierarchySidoCode] =
    useState<string>("");
  const [selectedHierarchySigunguCode, setSelectedHierarchySigunguCode] =
    useState<string | null>("");
  const [
    selectedHierarchyThirdLevelCode,
    setSelectedHierarchyThirdLevelCode,
  ] = useState<string>("");

  // 11-3 1차-141 — 1차-137 helper 기반 derived values.
  // 1단계: 시도 목록 (1차-136 fixture 기준 7 시도, sidoCode 오름차순).
  const sidoList = useMemo(() => getSidoList(), []);
  // 2단계: 선택한 시도의 시군구 목록.
  const sigunguList = useMemo(
    () =>
      selectedHierarchySidoCode
        ? getSigunguBySido(selectedHierarchySidoCode)
        : [],
    [selectedHierarchySidoCode],
  );
  // 3단계: 읍/면/동/일반구 목록 — 세종(36)은 직접 helper로 노출.
  const thirdLevelList = useMemo(() => {
    if (!selectedHierarchySidoCode) return [];
    if (selectedHierarchySidoCode === "36") {
      return getThirdLevelForSidoWithoutSigungu("36");
    }
    return selectedHierarchySigunguCode
      ? getThirdLevelBySigungu(selectedHierarchySigunguCode)
      : [];
  }, [selectedHierarchySidoCode, selectedHierarchySigunguCode]);
  // 선택된 3단계 entry — 결과 카드 표시용. 미선택 시 undefined.
  const selectedHierarchyEntry = useMemo(
    () =>
      getEntryByThirdLevelCode(selectedHierarchyThirdLevelCode || null),
    [selectedHierarchyThirdLevelCode],
  );

  // 11-3 1차-167 — selectedHierarchyEntry 변경 시 App.tsx로 lift-up.
  // RecommendationResult 카드 상단·"반영된 학생 프로필 입력값"의 거주 지역 라벨에만
  // 반영하기 위한 표시 동기화 전용. profile.region / 추천 산출 / scenario 흐름은
  // 변경하지 않는다 (1차-141 정책 일관). 미선택 시 null로 전달.
  useEffect(() => {
    onDetailedRegionChange?.(selectedHierarchyEntry ?? null);
  }, [onDetailedRegionChange, selectedHierarchyEntry]);

  // 11-3 1차-141 — 시도 변경 시 하위 선택 초기화 + 세종 분기.
  const handleSidoChange = (sidoCode: string) => {
    setSelectedHierarchySidoCode(sidoCode);
    setSelectedHierarchyThirdLevelCode("");
    if (sidoCode === "36") {
      // 세종은 시군구 단위가 없음 — sigunguCode=null로 표시 (1차-136 정직성 정책 일관).
      // 임시 행정코드 생성 0건. getThirdLevelForSidoWithoutSigungu("36") 분기 활성화.
      setSelectedHierarchySigunguCode(null);
    } else {
      setSelectedHierarchySigunguCode("");
    }
  };
  // 11-3 1차-141 — 시군구 변경 시 3단계 초기화.
  const handleSigunguChange = (sigunguCode: string) => {
    setSelectedHierarchySigunguCode(sigunguCode);
    setSelectedHierarchyThirdLevelCode("");
  };

  const handleChange = (key: keyof StudentProfileType, value: string) => {
    onChange({ ...profile, [key]: value });
  };

  // 11-3 1차-141 — region 외 5 필드는 기존 2-col grid 유지. region은 별도 cascading
  // 카드로 분리 (전체 너비, 1차-115 4권역 select + 17 시도 확인 select 대체).
  const nonRegionFields: {
    key: Exclude<keyof StudentProfileType, "region">;
    options: string[];
    type: "select" | "radio";
  }[] = [
    { key: "supportNeed", options: options.supportNeeds, type: "select" },
    {
      key: "careerInterest",
      options: options.careerInterests,
      type: "select",
    },
    { key: "mobilityRange", options: options.mobilityRanges, type: "radio" },
    {
      key: "activityPreference",
      options: options.activityPreferences,
      type: "radio",
    },
    { key: "supportLevel", options: options.supportLevels, type: "radio" },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">학생 프로필 입력</h2>
        <p className="mt-1 text-sm text-slate-600">
          입력값은 맞춤 경로 추천 예시를 생성하기 위한 화면 내 상태값으로만 사용됩니다.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 text-amber-700" />
          <p className="text-sm leading-relaxed text-amber-900">
            <strong>본 화면은 시연용이며 개인정보를 저장하지 않습니다.</strong>{" "}
            입력값은 맞춤 경로 추천 예시를 생성하기 위한 화면 내 상태값으로만
            사용되며, 새로고침 시 초기화됩니다.
          </p>
        </div>
      </div>

      {/* 11-3 1차-141 — 거주 지역 3단계 cascading select 카드 (전체 너비).
          1차-115 거주 지역 카드 안 17 시도 확인 select + 1차-110 17 시도 목록 / 4-col status
          grid / getRegionCatalogGuidance 안내문 + 1차-89 REGION_CATALOG 직접 활용을 본
          cascading UI가 대체한다.

          단, `profile.region` 값은 default ("서울 A권역") 그대로 유지 — 추천/보고서/scenario
          흐름은 1차-115 / 1차-130 정책 일관 demo fallback 기준 동작 (App.tsx
          `selectedRegion` / `buildScenarioFromProfile` 모두 무수정). 본 cascading 결과는
          결과 카드에만 표시되며 추천/보고서를 변경하지 않는다 — 정직성 강화.

          fake numeric 0건 (schoolCount / currentGapIndex 등 슬롯 부재). 임시 행정코드 생성
          0건 (세종 sigunguCode=null 정직 표시). */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Globe className="mt-0.5 h-5 w-5 text-slate-700" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                거주 지역 — 시/도 · 시/군/구 · 읍/면/동 선택
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                전국 행정구역 코드 기반 verified subset(1차-136 fixture, 27 entries / 7 시도)에서
                계층형으로 선택합니다.{" "}
                <strong>
                  추천 결과와 보고서는 본 선택과 별개로 시연용 권역 기준(기본값)으로 동작합니다.
                </strong>
              </p>
            </div>
          </div>
          <Badge tone="demo">시연용 예시</Badge>
        </div>

        {/* 3단계 cascading select grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* 1단계: 시/도 */}
          <div>
            <label
              htmlFor="hierarchy-sido"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              1. 시/도
            </label>
            <select
              id="hierarchy-sido"
              value={selectedHierarchySidoCode}
              onChange={(e) => handleSidoChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">시도를 선택하세요</option>
              {sidoList.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2단계: 시/군/구 — 세종(36)은 disabled + 안내 */}
          <div>
            <label
              htmlFor="hierarchy-sigungu"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              2. 시/군/구
            </label>
            <select
              id="hierarchy-sigungu"
              value={selectedHierarchySigunguCode ?? ""}
              onChange={(e) => handleSigunguChange(e.target.value)}
              disabled={
                !selectedHierarchySidoCode ||
                selectedHierarchySidoCode === "36"
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {selectedHierarchySidoCode === "36"
                  ? "세종은 시군구 단계 없음"
                  : !selectedHierarchySidoCode
                    ? "시도를 먼저 선택"
                    : "시군구를 선택하세요"}
              </option>
              {selectedHierarchySidoCode !== "36" &&
                sigunguList.map((s) => (
                  <option key={s.code ?? ""} value={s.code ?? ""}>
                    {s.name}
                    {s.isIlbangu ? " (일반구 보유)" : ""}
                  </option>
                ))}
            </select>
          </div>

          {/* 3단계: 읍/면/동/일반구 */}
          <div>
            <label
              htmlFor="hierarchy-third"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              3. 읍/면/동/일반구
            </label>
            <select
              id="hierarchy-third"
              value={selectedHierarchyThirdLevelCode}
              onChange={(e) =>
                setSelectedHierarchyThirdLevelCode(e.target.value)
              }
              disabled={
                !selectedHierarchySidoCode ||
                (selectedHierarchySidoCode !== "36" &&
                  !selectedHierarchySigunguCode)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {!selectedHierarchySidoCode
                  ? "시도를 먼저 선택"
                  : selectedHierarchySidoCode !== "36" &&
                      !selectedHierarchySigunguCode
                    ? "시군구를 먼저 선택"
                    : "읍/면/동/일반구를 선택하세요"}
              </option>
              {thirdLevelList.map((t) => (
                <option key={t.code ?? ""} value={t.code ?? ""}>
                  {t.name} ({THIRD_LEVEL_TYPE_LABEL[t.type]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 결과 카드 — selectedHierarchyEntry 있을 때만.
            정직성 정책: fake numeric 0건 / 학교명·주소·raw code·API key 0건 /
            martCoverage는 카테고리 문구만 (N건 숫자 금지). */}
        {selectedHierarchyEntry && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center gap-1.5">
              <Database className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">
                상세 지역 매칭 상태
              </p>
              <Badge tone="demo">시연용 예시</Badge>
            </div>

            {/* 선택 지역 표시 — 세종처럼 sigunguName null이면 생략 */}
            <p className="mt-2 text-sm text-slate-700">
              <strong>선택 지역:</strong>{" "}
              {selectedHierarchyEntry.sidoName}
              {selectedHierarchyEntry.sigunguName
                ? ` › ${selectedHierarchyEntry.sigunguName}`
                : ""}
              {" › "}
              {selectedHierarchyEntry.thirdLevelName}
            </p>

            <dl className="mt-3 grid grid-cols-1 gap-y-1 text-xs leading-relaxed md:grid-cols-2 md:gap-x-6">
              <div className="flex justify-between gap-2 border-b border-slate-200 py-1">
                <dt className="text-slate-500">시도 코드</dt>
                <dd className="font-mono text-slate-900">
                  {selectedHierarchyEntry.sidoCode}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 py-1">
                <dt className="text-slate-500">시군구 코드</dt>
                <dd className="font-mono text-slate-900">
                  {selectedHierarchyEntry.sigunguCode ?? "시군구 단계 없음"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 py-1">
                <dt className="text-slate-500">3단계 코드</dt>
                <dd className="font-mono text-slate-900">
                  {selectedHierarchyEntry.thirdLevelCode ?? "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 py-1">
                <dt className="text-slate-500">유형</dt>
                <dd className="text-slate-900">
                  {THIRD_LEVEL_TYPE_LABEL[selectedHierarchyEntry.thirdLevelType]}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 py-1 md:col-span-2">
                <dt className="text-slate-500">데이터 준비 상태</dt>
                <dd>
                  <Badge
                    tone={readinessTone(
                      selectedHierarchyEntry.readinessStatus,
                    )}
                  >
                    {READINESS_LABEL[selectedHierarchyEntry.readinessStatus]}
                  </Badge>
                </dd>
              </div>
            </dl>

            {/* martCoverage 카테고리 안내 — fake numeric 0건. 본 선택이 추천/보고서를
                변경하지 않음을 재명시 (정직성 강화). 사용자 친화 본문은
                MART_COVERAGE_BODY 3종에서 제공한다. */}
            <div className="mt-3 flex items-start gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
              <p className="leading-relaxed">
                <strong>
                  {MART_COVERAGE_LABEL[selectedHierarchyEntry.martCoverage]}
                </strong>
                {" — "}
                {MART_COVERAGE_BODY[selectedHierarchyEntry.martCoverage]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 11-3 1차-141 — region 외 5 필드는 2-col grid 유지. region은 위 cascading 카드가 대체. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {nonRegionFields.map(({ key, options: opts, type }) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <label className="mb-3 block text-sm font-semibold text-slate-900">
              {FIELD_LABELS[key]}
            </label>
            {type === "select" ? (
              <select
                value={profile[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {opts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex flex-wrap gap-2">
                {opts.map((opt) => {
                  const checked = profile[key] === opt;
                  return (
                    <label
                      key={opt}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name={key}
                        value={opt}
                        checked={checked}
                        onChange={() => handleChange(key, opt)}
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-900">
              현재 선택된 프로필 요약
            </h3>
          </div>
          <Badge tone="demo">시연용</Badge>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {(Object.keys(FIELD_LABELS) as (keyof StudentProfileType)[]).map(
            (key) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2"
              >
                <dt className="text-slate-500">{FIELD_LABELS[key]}</dt>
                <dd className="font-medium text-slate-900">{profile[key]}</dd>
              </div>
            ),
          )}
        </dl>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onGoToRecommendation("recommendation")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            맞춤 경로 추천 결과 보기
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 11-3 1차-97 — 비식별 시나리오 요약 카드.
          App.tsx의 buildScenarioFromProfile derived value를 표시한다.
          기존 입력 UI / "현재 선택된 프로필 요약" 카드 모두 그대로 유지하고,
          그 아래에 비식별 코드 기반 요약을 추가한다.
          PII 슬롯(이름·학교명·연락처·생년월일·진단명·장애등급)은 StudentScenario
          schema(1차-89)가 schema 단에서 강제 배제한다. */}
      {scenario && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
              <h3 className="text-base font-semibold text-slate-900">
                비식별 시나리오 요약 (검토 후보 입력값)
              </h3>
            </div>
            <Badge tone="demo">시연용 예시</Badge>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">regionCode</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {scenario.regionCode}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">sidoCode</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {scenario.sidoCode ?? "-"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">schoolStage</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {scenario.schoolStage}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">interests</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {scenario.interests.join(", ")}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">commuteLimitMinutes</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {String(scenario.commuteLimitMinutes ?? "-")}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">onlineAllowed</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {String(scenario.onlineAllowed)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
              <dt className="text-slate-500">guardianConsultNeeded</dt>
              <dd className="font-mono text-xs font-medium text-slate-900">
                {String(scenario.guardianConsultNeeded)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            <p className="leading-relaxed">
              본 화면은 비식별 시연용 시나리오 입력입니다. 학생 실명·학교명·연락처·생년월일·진단명을 입력하지 않으며, 입력값은 화면 내 상태로만 사용되어 새로고침 시 초기화됩니다.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
