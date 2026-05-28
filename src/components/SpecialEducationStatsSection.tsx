import { useEffect, useMemo, useState } from "react";
import { Database, ExternalLink, BarChart3, Info } from "lucide-react";
import Badge from "./Badge";
import {
  loadSpecialEducationStatistics,
  computeRegionStatsIndicators,
  type SpecialEducationStatistics,
} from "../data/real/specialEducationStatistics";

/**
 * 교육부 특수교육통계(2025) 실데이터 기반 시도별 수요·자원 지표 섹션.
 *
 * - public/data/special_education_statistics.json 을 런타임 fetch.
 * - rows가 있으면 시도별 표 + 수요/학교자원/공백위험 지표 표시.
 * - rows가 없으면(원천 파일 미반영) "원천 통계 파일 필요" 안내만 표시 — 가짜 수치 0건.
 * - 학생 맞춤 추천 예시는 별도(시연용 mock)임을 필수 문구로 명시.
 */
export default function SpecialEducationStatsSection() {
  const [stats, setStats] = useState<SpecialEducationStatistics | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadSpecialEducationStatistics().then((result) => {
      if (!active) return;
      setStats(result);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const indicators = useMemo(
    () => (stats ? computeRegionStatsIndicators(stats.rows) : []),
    [stats],
  );

  const indicatorByRegion = useMemo(() => {
    const map = new Map<string, (typeof indicators)[number]>();
    for (const ind of indicators) map.set(ind.region, ind);
    return map;
  }, [indicators]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-emerald-600 p-2 text-white">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              시·도별 특수교육 수요·자원 지표 (교육부 특수교육통계 2025)
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              실제 교육 공공데이터에서 추출한 시·도별 특수교육대상자 수, 특수학교·특수학급
              현황으로 수요·자원·공백위험 지표를 산출합니다.
            </p>
          </div>
        </div>
        <Badge tone="success" icon={<BarChart3 className="h-3.5 w-3.5" />}>
          실데이터 · 2025
        </Badge>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
        <div>
          <p>
            지역별 수요·자원 지표는 공공데이터포털의 ‘교육부_특수교육통계’ 2025년 자료를
            기반으로 산출했습니다. 학생 맞춤 추천 예시는 서비스 흐름 검증을 위한 시연용
            데이터입니다.
          </p>
          <p className="mt-1 text-slate-500">
            출처: 교육부_특수교육통계, 공공데이터포털, 공공저작물 출처표시 제1유형 ·
            조사기준일 2025.4.1.{" "}
            <a
              href="https://www.data.go.kr/data/15051018/fileData.do"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:underline"
            >
              원본 보기 <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      {!loaded ? (
        <p className="mt-4 text-sm text-slate-500">데이터를 불러오는 중…</p>
      ) : stats === null ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          <p className="font-medium">원천 통계 파일이 필요합니다.</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700">
            <code>data/raw/special_education_statistics/</code> 폴더에 교육부_특수교육통계
            PDF를 넣고{" "}
            <code>python scripts/extract-special-education-pdf.py</code> 를 실행하면
            <code> public/data/special_education_statistics.json</code> 이 생성되어 이 표가
            채워집니다. 임의의 수치는 표시하지 않습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">시·도</th>
                  <th className="py-2 pr-3 text-right font-medium">특수교육대상자</th>
                  <th className="py-2 pr-3 text-right font-medium">특수학교</th>
                  <th className="py-2 pr-3 text-right font-medium">특수학급</th>
                  <th className="py-2 pr-3 text-right font-medium">수요지수</th>
                  <th className="py-2 pr-3 text-right font-medium">학교자원지수</th>
                  <th className="py-2 pr-3 text-right font-medium">공백위험지수</th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((row) => {
                  const ind = indicatorByRegion.get(row.region);
                  return (
                    <tr
                      key={row.region}
                      className="border-b border-slate-100 text-slate-700"
                    >
                      <td className="py-2 pr-3 font-medium text-slate-900">
                        {row.region}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.totalSpecialEducationStudents.toLocaleString()}명
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.specialSchoolCount}교 / {row.specialSchoolClassCount}학급
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {row.specialClassCount.toLocaleString()}학급
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium text-slate-900">
                        {ind?.demandIndex ?? "-"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {ind?.schoolResourceIndex ?? "-"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium text-rose-600">
                        {ind?.gapRiskIndex ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            지표는 17개 시·도 내 상대 정규화(0~100)한 <strong>프로토타입용 예시 산식</strong>
            입니다 · 수요지수: 특수교육대상자 수 / 학교자원지수: 특수학교 학급+특수학급 수 /
            공백위험지수: 가용 학급당 학생 수. 실제 정책 활용 시 특수교육·데이터 전문가
            검토가 필요합니다.
          </p>
        </>
      )}
    </section>
  );
}
