/**
 * scripts/etl/indicator 단계의 record 타입.
 *
 * - indicator 단계는 mart record + master record 일부를 도메인 객체(RegionSummary,
 *   SchoolSummary, InstitutionSummary)로 변환해 buildTransitionIndex(`mvp-v1`)를
 *   호출한 결과를 묶는다.
 * - 산출 record는 src/types/indicator의 `TransitionIndex`를 그대로 사용한다.
 *   별도 mapping 타입을 만들지 않는다.
 * - C/D/E/F 도메인은 11-1 시점에 부재 → trainingPrograms / careerExperiencePrograms
 *   / jobPostings / employmentOutcome / welfareFacilities / mobilityAccess는
 *   빈 배열·undefined로 전달한다 (산식에서 자동으로 0 도메인 점수 산출).
 * - src/types/* / src/lib/indicators/* 무수정.
 */

import type { DataQualityIssue, TransitionIndex } from "../../../src/types";

/** buildIndicatorOutput의 통합 결과. */
export interface BuildIndicatorResult {
  records: TransitionIndex[];
  issues: DataQualityIssue[];
}

/**
 * data/indicator/transition_index_fixture.json의 표준 envelope.
 *
 * - indicatorVersion / baseYear / calculatedAt은 결정적 동작을 위해 고정값.
 * - partialFixture / missingDomains는 11-1 2차 4차 시점 C/D/E/F 부재를 명시.
 */
export interface IndicatorOutputFile {
  _meta: {
    source: "demo:fixture-etl";
    stage: "indicator";
    indicatorVersion: "mvp-v1";
    recordCount: number;
    issueCount: number;
    generatedAt: string;
    partialFixture: true;
    missingDomains: ["C", "D", "E", "F"];
    baseYear: 2026;
    calculatedAt: "2026-05-11T00:00:00+09:00";
  };
  records: TransitionIndex[];
  issues: DataQualityIssue[];
}
