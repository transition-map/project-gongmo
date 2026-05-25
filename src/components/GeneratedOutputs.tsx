import { useState } from "react";
import {
  FileText,
  Users,
  Building2,
  AlertCircle,
  ShieldCheck,
  Plug,
  Workflow,
  CheckCircle2,
  BookOpen,
  FileSearch,
  Database,
  TrendingDown,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import Badge from "./Badge";
import type { ScenarioReport } from "../types";

interface GeneratedOutputsProps {
  /**
   * 11-3 1차-105 — App.tsx에서 buildScenarioReport로 파생한 ScenarioReport.
   * `scenarioSummary` / `trendSignals` / `routeCandidates` / `dataEvidence` /
   * `reviewChecklist` / `limitations` / `generatedBy: "template"` 보유.
   * 기존 자료 기반 시연용 초안 카드(1차-71/1차-84) 직후·데이터·AI 검증 현황 카드
   * (1차-81) 직전 위치에 "보고서 근거 및 검토사항" 카드로 표시.
   * optional이라 legacy 호출자(scenarioReport 미주입)에서도 호환된다.
   */
  scenarioReport?: ScenarioReport;
}

type TabId = "teacher" | "student" | "policy";

interface TabContent {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  audience: string;
  body: string;
}

const TABS: TabContent[] = [
  {
    id: "teacher",
    label: "교사용 상담 요약문",
    icon: FileText,
    audience: "교사 상담 자료 초안",
    body: "해당 학생은 직업체험 활동에 관심이 있다고 가정한 시연용 사례이며, 현재 화면 데이터 기준으로는 거주 지역 내 프로그램 선택지가 제한적인 편입니다. 상담 시에는 대중교통 30분 이내로 접근 가능한 기관을 우선 검토하고, 필요한 경우 인접 권역의 온라인 진로탐색 프로그램을 대체 경로로 안내할 수 있습니다. 실제 상담 전에는 학생의 흥미와 참여 의사, 이동 가능 시간과 보호자 동행 가능 여부, 학교 내 지원 인력·예산 상황을 교사가 함께 점검한 뒤 최종 안내 경로를 정리해 두면 도움이 될 수 있습니다. 본 문구는 시연용 초안이므로, 학생 개별 상황은 학교 현장에서 종합적으로 확인하여 안내할 수 있습니다.",
  },
  {
    id: "student",
    label: "학생·학부모 안내문",
    icon: Users,
    audience: "학생 및 보호자 안내 초안",
    body: "이 화면에 보이는 추천 경로는 시연용 예시이며, 실제 결정 자료가 아닙니다. 학생이 평소에 관심 있는 직업체험 방향을 함께 적어 보고, 어디까지 이동할 수 있는지, 참여 가능한 요일과 시간이 어떻게 되는지, 보호자 동행이 필요한 경우인지 미리 살펴 두면 좋습니다. 학교 담당 선생님과 상담을 통해 최종 참여 경로와 준비 사항을 함께 정하면, 학생의 상황에 맞게 보다 안전하게 진행할 수 있습니다. 본 안내문은 시연용 예시이므로, 실제 신청 전에는 담당 선생님의 안내를 함께 확인해 주세요.",
  },
  {
    id: "policy",
    label: "교육청 정책 참고문",
    icon: Building2,
    audience: "교육청 정책 검토 자료 초안",
    body: "본 화면은 특정 지역에 대한 정책 결정 자료가 아니라, 시연용 데이터 기준으로 전환교육 프로그램 선택지와 접근성 정보를 함께 살펴볼 수 있도록 구성한 참고 문구입니다. 최근 연도별 지원 변화와 현재 공백 유형을 함께 검토하면, 일부 권역에서 프로그램 수와 연계기관 수의 변화 흐름을 가늠해 볼 수 있습니다. 실제 정책 검토 시에는 NEIS 학교기본정보 등 공공데이터의 수집·검증 준비 단계 산출물, KEAD·NISE·CareerNet 등 공식자료 링크, 그리고 현장 교사·담당자 의견을 함께 종합적으로 검토할 수 있습니다. 본 참고문은 시연용 초안이며, 실제 자원 배분이나 기관 지정 등의 결정은 별도의 정책 절차와 사람 검수를 거쳐 진행하는 것이 좋습니다.",
  },
];

export default function GeneratedOutputs({
  scenarioReport,
}: GeneratedOutputsProps = {}) {
  const [active, setActive] = useState<TabId>("teacher");
  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="space-y-6">
      {/* 11-3 1차-84 — 자료 기반 시연용 초안을 상단으로 이동. 1차-81에서는 데이터·AI 검증 현황이
          위에 있었으나, 사용자가 우선 보게 되는 시연 내용을 강조하기 위해 순서 교체.
          기존 카드 구조 / 통일 안전 문구 / AlertCircle 박스 모두 유지. TABS 3개 body는
          1차-84에서 더 자세한 설명형 문장으로 확장 (새 사실 생성이 아니라 검토·안내·참고 톤). */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                자료 기반 시연용 초안
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                현재 시연용 데이터, 학생 프로필 예시, 지역 공백 분석 결과를 바탕으로
                구성한 문서 초안 예시입니다.{" "}
                <strong>
                  공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의
                  종합적인 검토가 필요합니다.
                </strong>
              </p>
            </div>
            <Badge tone="demo">시연용 예시</Badge>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Badge tone="info">{current.audience}</Badge>
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {current.body}
          </p>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>
              <strong>
                공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의
                종합적인 검토가 필요합니다.
              </strong>{" "}
              본 문구는 시연용 예시이며, 실제 학생 데이터를 대상으로 생성된 것이 아닙니다.
            </span>
          </div>
        </div>
      </div>

      {/* 11-3 1차-105 — 보고서 근거 및 검토사항 카드 (ScenarioReport 기반).
          기존 자료 기반 시연용 초안 카드(1차-71/1차-84)와 데이터·AI 검증 현황 카드
          (1차-81) 사이에 위치한다. App.tsx가 buildScenarioReport로 파생한
          ScenarioReport 1건을 받아 학생 시나리오 요약 / 지역 공백 신호 / 사용 데이터 /
          검토 체크리스트 / 한계·주의사항을 묶어 표시한다.
          - generatedBy: "template" 고정 (1차-93 정책) — 자동 정책 산출처럼 표현되지 않게 함.
          - GapTrendSignal `"unknown"` 허용 — 실 다년도 raw 미수집 시 unknown 그대로 표시.
          - dataMode "mock" 명시 — 시연용 fixture 기반임을 노출.
          - reviewChecklist 1번 자리에 1차-57 follow-up 통일 안전 문구 포함.
          - 조건부 렌더(`{scenarioReport && ...}`)로 legacy 호출자 호환. */}
      {scenarioReport && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-2">
            <FileSearch className="mt-0.5 h-5 w-5 text-slate-700" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                보고서 근거 및 검토사항
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                본 보고서는 template 기반 시연용 초안입니다. 시연용 시나리오·지역 신호·검토 후보를 함께 정리한 참고 카드입니다.
              </p>
            </div>
            <Badge tone="demo">시연용 예시</Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* 학생 시나리오 (비식별) */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                <p className="font-semibold text-slate-900">
                  학생 시나리오 (비식별)
                </p>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-y-1 leading-relaxed text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt>regionCode</dt>
                  <dd className="font-mono text-slate-900">
                    {scenarioReport.scenarioSummary.regionCode}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>schoolStage</dt>
                  <dd className="font-mono text-slate-900">
                    {scenarioReport.scenarioSummary.schoolStage}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>interests</dt>
                  <dd className="font-mono text-slate-900">
                    {scenarioReport.scenarioSummary.interests.join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>commuteLimitMinutes</dt>
                  <dd className="font-mono text-slate-900">
                    {String(
                      scenarioReport.scenarioSummary.commuteLimitMinutes ?? "-",
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>onlineAllowed</dt>
                  <dd className="font-mono text-slate-900">
                    {String(scenarioReport.scenarioSummary.onlineAllowed)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 지역 공백 신호 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-slate-500" />
                <p className="font-semibold text-slate-900">
                  지역 공백 신호
                </p>
              </div>
              {scenarioReport.trendSignals.length === 0 ? (
                <p className="mt-2 leading-relaxed text-slate-500">
                  추세 신호가 없습니다.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 leading-relaxed text-slate-600">
                  {scenarioReport.trendSignals.map((signal, idx) => (
                    <li
                      key={`${signal.regionCode}-${signal.domain}-${idx}`}
                      className="space-y-0.5"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">{signal.domain}</Badge>
                        <Badge tone="neutral">dataMode: {signal.dataMode}</Badge>
                      </div>
                      <div className="text-slate-700">
                        trendDirection:{" "}
                        <span className="font-mono text-slate-900">
                          {signal.trendDirection}
                        </span>
                        {" · "}
                        gapLevel:{" "}
                        <span className="font-mono text-slate-900">
                          {signal.gapLevel}
                        </span>
                      </div>
                      <p className="text-slate-500">{signal.evidenceLabel}</p>
                      {signal.limitations.map((limit) => (
                        <p
                          key={limit}
                          className="text-[11px] text-slate-500"
                        >
                          · {limit}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 사용 데이터 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-slate-500" />
                <p className="font-semibold text-slate-900">사용 데이터</p>
              </div>
              <ul className="mt-2 space-y-1.5 leading-relaxed text-slate-600">
                {scenarioReport.dataEvidence.map((ev, idx) => (
                  <li key={`${ev.source}-${idx}`} className="space-y-0.5">
                    <p className="font-mono text-[11px] text-slate-900">
                      {ev.source}
                    </p>
                    <p className="text-slate-500">
                      license: {ev.license}
                      {ev.referenceYear ? ` · ${ev.referenceYear}` : ""}
                    </p>
                    {ev.note ? (
                      <p className="text-[11px] text-slate-500">{ev.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            {/* 검토 체크리스트 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-slate-500" />
                <p className="font-semibold text-slate-900">검토 체크리스트</p>
              </div>
              <ul className="mt-2 space-y-1 leading-relaxed text-slate-600">
                {scenarioReport.reviewChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 flex-none text-slate-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 한계·주의사항 (전체 너비) */}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-slate-500" />
              <p className="font-semibold text-slate-900">한계·주의사항</p>
            </div>
            <ul className="mt-2 space-y-1 leading-relaxed text-slate-600">
              {scenarioReport.limitations.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-none text-slate-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
            generatedBy:{" "}
            <span className="font-mono text-slate-700">
              {scenarioReport.generatedBy}
            </span>
            {" · "}
            generatedAt:{" "}
            <span className="font-mono text-slate-700">
              {scenarioReport.generatedAt}
            </span>
          </p>
        </div>
      )}

      {/* 11-3 1차-130 — NEIS 학교기본정보 OpenAPI 검증 결과 카드.
          1차-119~1차-129에서 로컬 ETL로 검증한 NEIS API 결과 수치를 표시한다.
          1차-120 raw fetch 100건 / 1차-121 clean 100건 / 1차-128 master 100/100 매칭 /
          1차-129 mart 271개 시군구 + schoolCount 21개 시군구 / sum=100 / PII 0건.
          학교명·SD_SCHUL_CODE·주소·raw 파일 경로·API key 정보 표시 0건 (정수 수치만).
          "NEIS 전국 지표 연결 완료" / "전국 실데이터 분석 완료" / "완전 실데이터 대시보드 전환"
          표현 0건. production은 mock demo mode + /etl-data/* 404 유지 정책 명시.
          C/D/E/F 도메인 placeholder 0 한계 명시 (1차-46 partial badge 정책 동형).
          위치: 보고서 근거 및 검토사항 카드(1차-105)와 데이터·AI 검증 현황 카드(1차-81) 사이. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2">
          <Database className="mt-0.5 h-5 w-5 text-slate-700" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">
              NEIS 학교기본정보 OpenAPI 검증 결과
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              로컬 ETL 환경에서 NEIS 학교기본정보 OpenAPI 100건을 수집해 raw → clean → master → mart 4단계 흐름을 검증했습니다.
            </p>
          </div>
          <Badge tone="demo">로컬 ETL 검증</Badge>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-xs md:grid-cols-2">
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">raw 수집</dt>
            <dd className="font-mono font-medium text-slate-900">100건</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">clean 변환</dt>
            <dd className="font-mono font-medium text-slate-900">100건</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">master 매칭</dt>
            <dd className="font-mono font-medium text-slate-900">100 / 100</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">mart 산출</dt>
            <dd className="font-mono font-medium text-slate-900">271개 시군구</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">schoolCount 반영</dt>
            <dd className="font-mono font-medium text-slate-900">21개 시군구</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">schoolCount 합계</dt>
            <dd className="font-mono font-medium text-slate-900">100</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">PII 의심 필드</dt>
            <dd className="font-mono font-medium text-slate-900">0건</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 py-2">
            <dt className="text-slate-500">전체 모수 (참고)</dt>
            <dd className="font-mono font-medium text-slate-900">12,663건</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          <div className="space-y-1 leading-relaxed">
            <p>
              본 결과는 로컬 ETL 검증 결과이며, production 공개 URL은 안정적인 mock demo mode로 운영됩니다.
            </p>
            <p>
              <code className="rounded bg-slate-100 px-1">/etl-data/*</code> 경로는 production에서 404를 유지합니다.
            </p>
            <p>
              C/D/E/F 도메인(훈련공급·고용·복지·이동권)은 아직 placeholder 0으로 유지되며, 전국 지표 연결 완료가 아닙니다.
            </p>
          </div>
        </div>
      </div>

      {/* 11-3 1차-81 — 데이터·AI 검증 현황 카드 (1차-84에서 자료 기반 시연용 초안 아래로 이동).
          공모 안내 기준 (교육 공공데이터 활용 + 출처·라이선스 + 데이터 처리·분석 절차
          문서화)과 1차-1~1차-79 누적 성과(NEIS parser/live fetch scaffold, ETL pipeline,
          공식자료 카드, mock-only deployment, PII 차단 schema)를 한 화면에 정직하게 안내.
          AI 정책 추천이 아니며 NEIS API "연결 완료" 아님. mock demo mode 명시 정책 일관. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-700" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">
              데이터·AI 검증 현황
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              공모 제출용 공개 URL은 안정적인 mock demo mode로 운영하며, 공공데이터 API와
              실 ETL 산출물은 로컬 수집·검증 단계로 분리합니다.
            </p>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <li className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Plug className="h-4 w-4 text-slate-500" />
              <p className="font-semibold text-slate-900">
                A. 공공데이터 연계 준비
              </p>
            </div>
            <ul className="mt-2 space-y-1 leading-relaxed text-slate-600">
              <li>· NEIS 학교기본정보 OpenAPI 로컬 ETL 수집 준비</li>
              <li>· API key는 <code className="rounded bg-slate-100 px-1">.env.local</code> 로컬 보관 (commit 0건)</li>
              <li>· client bundle / GitHub / Vercel에 key 비포함</li>
              <li>· 실제 API 호출 완료가 아니라 수집 준비 scaffold</li>
            </ul>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-slate-500" />
              <p className="font-semibold text-slate-900">
                B. ETL 파이프라인 검증
              </p>
            </div>
            <ul className="mt-2 space-y-1 leading-relaxed text-slate-600">
              <li>· Raw → Clean → Master → Mart → Indicator 5단계 단방향</li>
              <li>· fixture baseline 49 / 46 / 10 / 10 records 안정</li>
              <li>· <code className="rounded bg-slate-100 px-1">data/raw.api</code> 및 <code className="rounded bg-slate-100 px-1">data/*.real</code>은 <code className="rounded bg-slate-100 px-1">.gitignore</code> 보호</li>
              <li>· <code className="rounded bg-slate-100 px-1">public/etl-data</code> / <code className="rounded bg-slate-100 px-1">dist/etl-data</code> 미생성</li>
            </ul>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-slate-500" />
              <p className="font-semibold text-slate-900">
                C. 테스트·빌드 안정성
              </p>
            </div>
            <ul className="mt-2 space-y-1 leading-relaxed text-slate-600">
              <li>· 35 files / 828 tests passed (mock fetch + dry-run 기반)</li>
              <li>· <code className="rounded bg-slate-100 px-1">npm run lint</code> 통과</li>
              <li>· <code className="rounded bg-slate-100 px-1">npm run build</code> 통과</li>
              <li>· Vercel HTTP 200 (시연용 mock demo URL)</li>
            </ul>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <p className="font-semibold text-slate-900">D. 공식자료 연결</p>
            </div>
            <ul className="mt-2 space-y-1 leading-relaxed text-slate-600">
              <li>· 공식자료 카드 5개 (KEAD / NISE / CareerNet 등)</li>
              <li>· 본문 전문 복제 없이 원문 링크 연결</li>
              <li>· <code className="rounded bg-slate-100 px-1">aiGenerated: false</code> 강제 (link-only registry)</li>
              <li>· 교사의 종합적 검토 필요 안내 유지</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}
