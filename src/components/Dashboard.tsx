import {
  Activity,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import StatCard from "./StatCard";
import Badge from "./Badge";
import { getFeaturedOfficialResources } from "../data/officialResources";
import type { RegionData, Recommendation } from "../types";

// 11-3 1차-55 — official resource evidence cards.
// 11-3 1차-57 — registry 국가기관 중심 재정렬 후 getFeaturedOfficialResources()로
// 대표 카드 목록 조회 (featuredOrder가 정의된 record만, 오름차순). 성과지표 매뉴얼·
// 경기교육연구원 보고서는 fixture에서 제거되어 본 helper 결과에 포함 0건.
const OFFICIAL_RESOURCE_PREVIEW_COUNT = 6;

interface DashboardProps {
  regions: RegionData[];
  selectedRegion: RegionData;
  onSelectRegion: (region: string) => void;
  recommendations: Recommendation[];
}

export default function Dashboard({
  regions,
  selectedRegion,
  onSelectRegion,
  recommendations,
}: DashboardProps) {
  const matchingRecommendations = recommendations.filter(
    (r) => r.region === selectedRegion.region || r.region === "전체",
  );

  const trendTone =
    selectedRegion.trendRiskScore >= 70
      ? "danger"
      : selectedRegion.trendRiskScore >= 60
        ? "warn"
        : "success";

  const gapTone =
    selectedRegion.currentGapIndex >= 75
      ? "danger"
      : selectedRegion.currentGapIndex >= 65
        ? "warn"
        : "success";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">대시보드</h2>
          <p className="mt-1 text-sm text-slate-600">
            선택한 지역의 현재 공백지수, 추세위험도, 현재 공백 유형, 추천 가능
            경로 수를 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="region-select-dashboard"
            className="text-sm font-medium text-slate-700"
          >
            지역 선택
          </label>
          <select
            id="region-select-dashboard"
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

      {/* 11-2 1차-11 — partial/skeletal region 안내 badge.
          partialRegionFlag=true(예: DEMO-SIGUNGU-07-PARTIAL)일 때만 표시.
          색상은 muted slate + Info 아이콘 — 공모전 시연 컨텍스트에서 부정적 인상 회피. */}
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

      {/* 11-3 1차-46 — ETL 모드 partial indicator 안내 badge.
          precomputedIndicatorPartial=true (App.tsx에서 VITE_DATA_SOURCE=etl + precomputed 있음
          시 주입)일 때만 표시. indicator.real이 A demand / B school / B-4 supportCenter만 반영하고
          C/D/E/F 도메인(훈련공급·고용·복지·이동권) 부재 partial 산출물임을 사용자에게 안내.
          mock 모드(default)에서는 미표시 — 시연 회귀 0. partialRegionFlag badge와 별도 표시
          (둘이 동시 활성화될 수 있으나 의미가 다름: partialRegionFlag=지역 단위 결손,
          precomputedIndicatorPartial=indicator 산식 도메인 결손). 색상은 muted slate 동일. */}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          variant="primary"
          label="현재 공백지수 (주지표)"
          value={selectedRegion.currentGapIndex}
          unit="/100"
          icon={<Activity className="h-5 w-5" />}
          caption="현재 기준 학생 수요 대비 자원·접근성·상담·연계의 부족 정도. 값이 높을수록 공백이 큼."
        />
        <StatCard
          variant="secondary"
          label="추세위험도 (보조지표)"
          value={selectedRegion.trendRiskScore}
          unit="/100"
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          trend={{ value: selectedRegion.supportChange, label: "최근 5년" }}
          caption="최근 연도별 지원 변화가 악화되는 지역을 보조적으로 탐지하는 지표."
        />
        <StatCard
          variant="secondary"
          label="현재 공백 유형"
          value={
            <span className="text-2xl font-bold text-slate-900">
              {selectedRegion.gapType}
            </span>
          }
          icon={<Layers className="h-5 w-5 text-slate-500" />}
          caption="현재 기준 데이터 기반 분류. 교사 상담·학생 추천에 활용."
        />
        <StatCard
          variant="secondary"
          label="추천 가능 경로 수"
          value={matchingRecommendations.length}
          unit="건"
          icon={<Sparkles className="h-5 w-5 text-slate-500" />}
          caption={`${selectedRegion.region} 및 광역 공통 경로 합계 (시연용)`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 text-slate-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                지표 안내
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                <strong className="text-slate-900">현재 공백지수</strong>는 학생
                수요 대비 전환교육 자원, 접근성, 상담지원, 진로연계의 부족
                정도를 나타내는 핵심 지표입니다.{" "}
                <strong className="text-slate-900">추세위험도</strong>는 최근
                연도별 지원 변화가 악화되는 지역을 보조적으로 탐지하는
                지표입니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={gapTone}>
                  공백지수 {selectedRegion.currentGapIndex}
                </Badge>
                <Badge tone={trendTone}>
                  추세위험도 {selectedRegion.trendRiskScore}
                </Badge>
                <Badge tone="neutral">{selectedRegion.gapType}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            선택 지역 요약
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {selectedRegion.mainIssue}
          </p>
          {/* 11-3 1차-50 — free-text fallback 출처 안내 (etl 모드 한정).
              mainIssue / policyUse / teacherUse는 ETL mart.real / indicator.real이 자동 산출한
              문구가 아니며, RegionSummary 1순위 부재 시 legacy fallback (src/data/regions.json,
              광역 4권역)으로 채워질 수 있다. etl 모드 사용자가 ETL 출처로 오해하지 않도록 안내.
              mock 모드(default) 시연 화면은 무변경 (1차-44 / 1차-46 boundary 정책 동형). */}
          {import.meta.env.VITE_DATA_SOURCE === "etl" && (
            <p className="mt-3 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-500">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
              <span>
                정책 해석 문구는 시연용 mock/legacy 출처입니다. ETL 데이터 기반
                자동 생성 문구가 아닙니다.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* 11-3 1차-55 — 관련 공식자료 카드 섹션.
          AI 정책 문구 생성 대신 공식기관·공공기관·연구기관 자료로 링크.
          본문 전문 복제 0건 — 제목·기관·분류·짧은 요약·원문 URL만 노출.
          대표 자료 OFFICIAL_RESOURCE_PREVIEW_COUNT(6)건 표시 (전체 registry는
          src/data/officialResources.ts의 getOfficialResources()).
          region별 매칭 로직은 1차-55 미도입 — 후속 합의. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-4 w-4 text-slate-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              관련 공식자료
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              장애 학생의 전환능력·진로실행력 진단 검사부터 교과연계 전환역량
              프로그램, 담당자 연수까지! —{" "}
              <strong>공식 기관 자료를 한 곳에 정리한 안내</strong>입니다. 본문은
              원문 링크에서 확인하세요.{" "}
              <strong>
                공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의
                종합적인 검토가 필요합니다.
              </strong>
            </p>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {getFeaturedOfficialResources(OFFICIAL_RESOURCE_PREVIEW_COUNT).map(
            (resource) => (
              <li
                key={resource.id}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {resource.title}
                    </p>
                    <p className="mt-0.5 text-slate-600">
                      {resource.organization}
                    </p>
                  </div>
                  <Badge tone="neutral">{resource.category}</Badge>
                </div>
                <p className="mt-2 leading-relaxed text-slate-600">
                  {resource.summary}
                </p>
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900"
                  >
                    원문 보기
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="mt-2 inline-block text-[11px] text-slate-500">
                    {resource.sourceNote ?? "원문 URL 별도 안내"}
                  </span>
                )}
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
