import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Building2,
  GraduationCap,
  Info,
  Megaphone,
  TrendingDown,
} from "lucide-react";
import Badge from "./Badge";
import type { RegionData } from "../types";

interface RegionalAnalysisProps {
  regions: RegionData[];
  selectedRegion: RegionData;
  onSelectRegion: (region: string) => void;
}

const GAP_TYPE_TONE: Record<
  string,
  "danger" | "warn" | "info" | "neutral"
> = {
  "프로그램 부족형": "danger",
  "기관 부족형": "warn",
  "접근성 취약형": "warn",
  "진로연계 약화형": "info",
  "상담지원 부족형": "info",
};

export default function RegionalAnalysis({
  regions,
  selectedRegion,
  onSelectRegion,
}: RegionalAnalysisProps) {
  const chartData = selectedRegion.yearlySupport.map((d) => ({
    year: `${d.year}년`,
    "프로그램 수": d.programCount,
    "연계기관 수": d.agencyCount,
    "접근성 점수": d.accessibilityScore,
  }));

  const gapTypeTone = GAP_TYPE_TONE[selectedRegion.gapType] ?? "neutral";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            지역별 공백 분석: 연도별 지원 변화와 현재 공백 유형
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            연도별 지원 변화는{" "}
            <strong className="text-slate-900">교육청 정책 판단</strong>에 활용하고,
            현재 공백 유형은{" "}
            <strong className="text-slate-900">교사 상담과 학생 맞춤 추천</strong>에
            활용합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="region-select-regional"
            className="text-sm font-medium text-slate-700"
          >
            지역 선택
          </label>
          <select
            id="region-select-regional"
            value={selectedRegion.region}
            onChange={(e) => onSelectRegion(e.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            {regions.map((r) => (
              <option key={r.region} value={r.region}>
                {r.region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 11-3 1차-48 — partial badge 통합 (Dashboard 1차-11 / 1차-46 정책과 일관).
          두 badge의 의미가 다르므로 별도 블록으로 표시:
          - partialRegionFlag (1차-11) = 지역 데이터 자체의 결손 / 부분 지역
            (예: DEMO-SIGUNGU-07-PARTIAL — admin-union 출신, demand/school/supportCenter 부재)
          - precomputedIndicatorPartial (1차-46) = indicator 산식의 도메인 결손
            (etl 모드에서 indicator.real이 C/D/E/F 부재 partial 산출물일 때만 true)
          mock 모드(default)는 둘 다 false/undefined로 미렌더 → 시연 회귀 0.
          색상은 muted slate + Info 아이콘 (Dashboard와 동일 — 공모전 시연 컨텍스트 부정 인상 회피). */}
      {selectedRegion.partialRegionFlag === true && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          <div>
            <span className="font-medium text-slate-700">데이터 부족 — 시연용</span>
            <span className="ml-1 text-slate-500">
              · 이 지역은 demand/school/supportCenter 등 주요 데이터가 부재하므로
              표시 지표는 산식 기본값입니다. 정상 지역과 동일하게 해석하지 마세요.
            </span>
          </div>
        </div>
      )}

      {selectedRegion.precomputedIndicatorPartial === true && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          <div>
            <span className="font-medium text-slate-700">부분 산출 지표 — ETL</span>
            <span className="ml-1 text-slate-500">
              · 현재 ETL 지표는 A 수요·B 학교·B-4 지원센터만 반영합니다. C/D/E/F 도메인
              (훈련공급·고용·복지·이동권) 부재로 공백지수가 보수적으로 산출될 수 있으니
              해석 시 유의하세요.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              최근 5년 지원 변화 그래프
            </h3>
            <Badge tone="info" icon={<TrendingDown className="h-3.5 w-3.5" />}>
              정책 판단용 추세 데이터
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            X축: 연도 / Y축: 항목별 값 (프로그램 수·기관 수는 개수, 접근성 점수는 0~100)
          </p>
          <div className="mt-4 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#475569", fontSize: 12 }}
                  stroke="#cbd5e1"
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 12 }}
                  stroke="#cbd5e1"
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#cbd5e1" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="프로그램 수"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0f172a" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="연계기관 수"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#2563eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="접근성 점수"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#f59e0b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            정책 판단용 연도별 추세 데이터 · 최근 5년({selectedRegion.yearlySupport[0]?.year}~
            {
              selectedRegion.yearlySupport[selectedRegion.yearlySupport.length - 1]
                ?.year
            }
            )
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                주지표 · 현재 공백지수
              </span>
              <Activity className="h-5 w-5 text-slate-300" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-6xl font-bold tracking-tight">
                {selectedRegion.currentGapIndex}
              </span>
              <span className="text-base text-slate-300">/ 100</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              현재 기준 학생 수요 대비 자원·접근성·상담·연계 부족 정도를 종합한
              점수입니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                보조지표 · 추세위험도
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {selectedRegion.trendRiskScore}
              </span>
              <span className="text-sm text-slate-500">/ 100</span>
              <span
                className={`ml-auto text-xs font-medium ${
                  selectedRegion.supportChange < 0
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {selectedRegion.supportChange > 0 ? "▲" : "▼"}{" "}
                {Math.abs(selectedRegion.supportChange).toFixed(1)}% (5년)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500">
              현재 공백 유형
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={gapTypeTone}>{selectedRegion.gapType}</Badge>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-700">
              주요 원인
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {selectedRegion.mainIssue}
            </p>
          </div>
        </div>
      </div>

      {/* 11-3 1차-50 — free-text fallback 출처 안내 (etl 모드 한정).
          본 화면의 mainIssue (우측 카드 "주요 원인") / policyUse (좌측 하단 "교육청 정책 활용 방향") /
          teacherUse (우측 하단 "교사 상담 활용 방향") 3종 free-text 문구는 ETL mart.real /
          indicator.real이 자동 산출한 결과가 아니며, RegionSummary 1순위 부재 시 legacy fallback
          (src/data/regions.json, 광역 4권역)으로 채워질 수 있다. etl 모드 사용자가 ETL 출처로
          오해하지 않도록 통합 1개 안내. mock 모드(default) 화면은 무변경 (1차-44 / 1차-46
          boundary 정책 동형 — import.meta.env.VITE_DATA_SOURCE === "etl" 검사). */}
      {import.meta.env.VITE_DATA_SOURCE === "etl" && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          <div>
            <span className="font-medium text-slate-700">정책 해석 문구 출처 — 시연용</span>
            <span className="ml-1 text-slate-500">
              · 주요 원인 / 교육청 정책 활용 방향 / 교사 상담 활용 방향 문구는 시연용
              mock/legacy 출처입니다. ETL 데이터 기반 자동 생성 문구가 아닙니다.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-700" />
            <h3 className="text-sm font-semibold text-blue-900">
              교육청 정책 활용 방향
            </h3>
            <Badge tone="info" className="ml-auto">
              연도별 추세 기반
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-800">
            {selectedRegion.policyUse}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-700" />
            <h3 className="text-sm font-semibold text-emerald-900">
              교사 상담 활용 방향
            </h3>
            <Badge tone="success" className="ml-auto">
              현재 기준 데이터 기반
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-800">
            {selectedRegion.teacherUse}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <Megaphone className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-slate-500" />
        본 화면은 시연용 더미 데이터로 구성되었습니다. 실제 서비스에서는 교육청·특수교육
        전문가·데이터 전문가 검토를 거친 공식 산식과 기준연도 데이터를 사용해야 합니다.
      </div>
    </section>
  );
}
