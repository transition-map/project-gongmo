import { describe, it, expect } from "vitest";
import specialEducationStatisticsJson from "../../../../public/data/special_education_statistics.json";
import {
  computeRegionStatsIndicators,
  type SpecialEducationStatistics,
  type SpecialEducationRow,
} from "../specialEducationStatistics";

const stats = specialEducationStatisticsJson as SpecialEducationStatistics;

const NUMERIC_FIELDS: (keyof SpecialEducationRow)[] = [
  "specialSchoolCount",
  "specialSchoolClassCount",
  "specialSchoolStudentCount",
  "specialClassSchoolCount",
  "specialClassCount",
  "specialClassStudentCount",
  "inclusiveClassSchoolCount",
  "inclusiveClassCount",
  "inclusiveClassStudentCount",
  "specialEducationCenterInfantCount",
  "totalSpecialEducationStudents",
];

describe("special_education_statistics.json — 실제 교육부 특수교육통계 정적 데이터", () => {
  it("meta에 출처·라이선스 정보가 들어 있다", () => {
    const { meta } = stats;
    expect(meta.title).toBe("교육부_특수교육통계");
    expect(meta.provider).toBe("교육부");
    expect(meta.year).toBe(2025);
    expect(meta.surveyDate).toBe("2025-04-01");
    expect(meta.license).toBe("공공저작물 출처표시 제1유형");
    expect(meta.note.length).toBeGreaterThan(0);
  });

  it("meta.sourceUrl이 공공데이터포털 15051018을 가리킨다", () => {
    const { meta } = stats;
    expect(meta.sourceUrl).toBe("https://www.data.go.kr/data/15051018/fileData.do");
  });

  it("rows가 비어 있지 않고 17개 시도를 담는다", () => {
    const { rows } = stats;
    expect(rows.length).toBe(17);
  });

  it("각 row에 region과 11개 숫자 필드가 모두 number 타입으로 존재한다", () => {
    const { rows } = stats;
    for (const row of rows) {
      expect(typeof row.region).toBe("string");
      expect(row.region.length).toBeGreaterThan(0);
      for (const field of NUMERIC_FIELDS) {
        expect(typeof row[field]).toBe("number");
        expect(Number.isFinite(row[field] as number)).toBe(true);
        expect(row[field] as number).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("각 시도 행의 배치별 학생 합이 전체 특수교육대상자 수와 일치한다 (위조 방지 검증)", () => {
    const { rows } = stats;
    for (const row of rows) {
      const sum =
        row.specialSchoolStudentCount +
        row.specialClassStudentCount +
        row.inclusiveClassStudentCount +
        row.specialEducationCenterInfantCount;
      expect(sum).toBe(row.totalSpecialEducationStudents);
    }
  });
});

describe("computeRegionStatsIndicators — 시도별 수요·자원·공백위험 지표", () => {
  it("17개 시도 전부에 대해 지표를 산출한다", () => {
    const { rows } = stats;
    const indicators = computeRegionStatsIndicators(rows);
    expect(indicators.length).toBe(rows.length);
  });

  it("모든 지표가 0~100 범위의 유한 값이다", () => {
    const { rows } = stats;
    for (const ind of computeRegionStatsIndicators(rows)) {
      for (const v of [ind.demandIndex, ind.schoolResourceIndex, ind.gapRiskIndex]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("정규화 끝점이 존재한다 — 최대 수요 지역 demandIndex=100, 최소=0", () => {
    const { rows } = stats;
    const indicators = computeRegionStatsIndicators(rows);
    const demands = indicators.map((i) => i.demandIndex);
    expect(Math.max(...demands)).toBe(100);
    expect(Math.min(...demands)).toBe(0);

    const maxRow = rows.reduce((a, b) =>
      b.totalSpecialEducationStudents > a.totalSpecialEducationStudents ? b : a,
    );
    const maxIndicator = indicators.find((i) => i.demandIndex === 100);
    expect(maxIndicator?.region).toBe(maxRow.region);
  });

  it("classResourceUnits = 특수학교 학급 + 특수학급, studentsPerClassUnit은 비율이다", () => {
    const { rows } = stats;
    const indicators = computeRegionStatsIndicators(rows);
    const first = indicators[0];
    const row = rows[0];
    expect(first.classResourceUnits).toBe(
      row.specialSchoolClassCount + row.specialClassCount,
    );
    expect(first.totalStudents).toBe(row.totalSpecialEducationStudents);
  });

  it("빈 배열 입력 시 빈 배열을 반환한다 (원천 파일 미반영 fallback)", () => {
    expect(computeRegionStatsIndicators([])).toEqual([]);
  });
});
