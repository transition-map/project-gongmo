/**
 * 교육부_특수교육통계 (2025) — 실제 교육 공공데이터 기반 시도별 수요·자원 지표 모듈.
 *
 * 원천 데이터:
 * - 데이터명: 교육부_특수교육통계
 * - 기준연도: 2025 / 조사기준일: 2025.4.1.
 * - 제공기관: 교육부
 * - 출처 URL: https://www.data.go.kr/data/15051018/fileData.do
 * - 라이선스: 공공저작물 출처표시 제1유형
 *
 * 데이터 흐름:
 *   data/raw/special_education_statistics/2025_special_education_statistics.pdf (원천, gitignore)
 *     → scripts/extract-special-education-pdf.py (시·도별 개황 표 추출 + 합산 검증)
 *     → public/data/special_education_statistics.json (정적 산출물, 커밋)
 *     → loadSpecialEducationStatistics() (런타임 fetch)
 *     → computeRegionStatsIndicators() (지역별 수요·자원·공백위험 지표 산출)
 *
 * 정직성 원칙:
 * - 이 모듈이 다루는 시도별 수요·자원 지표는 위 실제 통계에서 추출한 값만 사용한다.
 * - 학생 맞춤 추천 예시 / 상담 문구 / AI 설명문은 서비스 흐름 검증용 시연(mock) 데이터다 (별도 layer).
 * - 지표 산식은 프로토타입용 예시 산식이며, 실제 정책 활용 시 특수교육·데이터 전문가 검토가 필요하다.
 */

export const SPECIAL_EDUCATION_STATS_URL = "/data/special_education_statistics.json";

/** public/data/special_education_statistics.json 의 시·도별 개황 한 행 (모든 값은 2025 특수교육통계 실측). */
export interface SpecialEducationRow {
  /** 시도명 (예: "서울", "경기"). 시도교육청 단위 — 개인/학교 식별정보 아님. */
  region: string;
  /** 특수학교 수 */
  specialSchoolCount: number;
  /** 특수학교 학급 수 */
  specialSchoolClassCount: number;
  /** 특수학교 배치 특수교육대상자 수 */
  specialSchoolStudentCount: number;
  /** 특수학급 운영 학교 수 */
  specialClassSchoolCount: number;
  /** 특수학급 수 */
  specialClassCount: number;
  /** 특수학급 배치 특수교육대상자 수 */
  specialClassStudentCount: number;
  /** 일반학급(전일제 통합학급) 운영 학교 수 */
  inclusiveClassSchoolCount: number;
  /** 일반학급(전일제 통합학급) 수 */
  inclusiveClassCount: number;
  /** 일반학급(전일제 통합학급) 배치 특수교육대상자 수 */
  inclusiveClassStudentCount: number;
  /** 특수교육지원센터 배치 장애영아 수 */
  specialEducationCenterInfantCount: number;
  /** 전체 특수교육대상자 수 (위 4개 배치 합) */
  totalSpecialEducationStudents: number;
}

export interface SpecialEducationStatisticsMeta {
  title: string;
  provider: string;
  year: number;
  surveyDate: string;
  sourceUrl: string;
  license: string;
  sourceDocument?: string;
  extractedFrom?: string;
  note: string;
}

export interface SpecialEducationStatistics {
  meta: SpecialEducationStatisticsMeta;
  rows: SpecialEducationRow[];
}

/**
 * 시도별 수요·자원·공백위험 지표 (프로토타입용 예시 산식).
 *
 * - demandIndex: 특수교육대상자 수가 클수록 높음 (수요 상대 정규화 0~100).
 * - schoolResourceIndex: 특수교육 학급 자원(특수학교 학급 + 특수학급)이 많을수록 높음 (0~100).
 * - gapRiskIndex: 가용 학급당 학생 수가 많을수록(자원 대비 수요가 클수록) 높음 (0~100).
 */
export interface RegionStatsIndicator {
  region: string;
  totalStudents: number;
  /** 특수교육 학급 자원 단위 = 특수학교 학급 수 + 특수학급 수 */
  classResourceUnits: number;
  /** 가용 학급당 특수교육대상자 수 (자원 부족도 원지표). classResourceUnits=0이면 0. */
  studentsPerClassUnit: number;
  demandIndex: number;
  schoolResourceIndex: number;
  gapRiskIndex: number;
}

function minMaxNormalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const ratio = (value - min) / (max - min);
  return Math.round(ratio * 1000) / 10;
}

/**
 * 시도별 행 배열로부터 수요·자원·공백위험 지표를 산출한다 (pure function).
 *
 * 실제 통계값만 입력으로 받으며, 외부 호출 / 부수효과 0건. 17개 시도 내 상대 정규화.
 */
export function computeRegionStatsIndicators(
  rows: SpecialEducationRow[],
): RegionStatsIndicator[] {
  if (rows.length === 0) return [];

  const base = rows.map((r) => {
    const classResourceUnits = r.specialSchoolClassCount + r.specialClassCount;
    const studentsPerClassUnit =
      classResourceUnits > 0
        ? Math.round((r.totalSpecialEducationStudents / classResourceUnits) * 100) / 100
        : 0;
    return {
      region: r.region,
      totalStudents: r.totalSpecialEducationStudents,
      classResourceUnits,
      studentsPerClassUnit,
    };
  });

  const demands = base.map((b) => b.totalStudents);
  const resources = base.map((b) => b.classResourceUnits);
  const ratios = base.map((b) => b.studentsPerClassUnit);

  const demandMin = Math.min(...demands);
  const demandMax = Math.max(...demands);
  const resourceMin = Math.min(...resources);
  const resourceMax = Math.max(...resources);
  const ratioMin = Math.min(...ratios);
  const ratioMax = Math.max(...ratios);

  return base.map((b) => ({
    region: b.region,
    totalStudents: b.totalStudents,
    classResourceUnits: b.classResourceUnits,
    studentsPerClassUnit: b.studentsPerClassUnit,
    demandIndex: minMaxNormalize(b.totalStudents, demandMin, demandMax),
    schoolResourceIndex: minMaxNormalize(b.classResourceUnits, resourceMin, resourceMax),
    gapRiskIndex: minMaxNormalize(b.studentsPerClassUnit, ratioMin, ratioMax),
  }));
}

/**
 * public/data/special_education_statistics.json 을 런타임 fetch한다.
 *
 * 파일이 없거나(원천 파일 미반영) JSON 파싱 실패 / rows 빈 배열이면 null 반환 →
 * 호출자(화면)는 "원천 통계 파일 필요" 안내를 표시한다 (가짜 데이터 0건).
 */
export async function loadSpecialEducationStatistics(): Promise<SpecialEducationStatistics | null> {
  try {
    const res = await fetch(SPECIAL_EDUCATION_STATS_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<SpecialEducationStatistics>;
    if (!data || !data.meta || !Array.isArray(data.rows) || data.rows.length === 0) {
      return null;
    }
    return data as SpecialEducationStatistics;
  } catch {
    return null;
  }
}
