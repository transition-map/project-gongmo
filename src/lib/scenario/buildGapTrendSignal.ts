/**
 * 11-3 1차-93 — buildGapTrendSignal pure builder.
 *
 * `RegionData`의 `yearlySupport` 시계열을 1차-89 `GapTrendSignal[]`로 변환한다.
 *
 * **정직성 정책**:
 * - 실 다년도 raw 부재(yearlySupport 빈 배열 또는 단일 entry)이면 `trendDirection` /
 *   `gapLevel` 모두 `"unknown"` + `limitations[]`로 사유 명시.
 * - yearlySupport 보유 시 `dataMode: "mock"`로 시연용임을 명시.
 * - 단일 연도 데이터로 증가/감소 단정 금지.
 *
 * **순수 함수 원칙**:
 * - fetch / process.env / localStorage 접근 0건
 * - UI 컴포넌트 import 0건
 * - 입력 mutate 0건
 *
 * UI 통합은 1차-95+ 별도 단계.
 */

import type { GapTrendSignal, RegionData } from "../../types";

const MOCK_LIMITATION =
  "본 추세는 시연용 fixture 기반이며, 실 다년도 raw가 확보된 정책 판단 자료가 아닙니다.";

const UNKNOWN_LIMITATION =
  "연도별 raw 자료 수집·검증 단계 진행 전 — 현재 추세 unknown으로 표시.";

const SINGLE_YEAR_LIMITATION =
  "단일 연도 데이터로 증가/감소를 단정할 수 없어 unknown으로 유지합니다.";

function deriveTrendDirection(
  baseline: number,
  current: number,
): GapTrendSignal["trendDirection"] {
  const delta = current - baseline;
  if (delta > 1) return "improving";
  if (delta < -1) return "worsening";
  return "stable";
}

function deriveGapLevel(current: number): GapTrendSignal["gapLevel"] {
  if (current < 10) return "high";
  if (current <= 20) return "medium";
  return "low";
}

/**
 * `RegionData` → `GapTrendSignal[]` 변환.
 *
 * - yearlySupport 2건 이상이면 첫·마지막 entry의 `programCount`로 trendDirection 추론.
 *   현재 entry의 `programCount`로 gapLevel 추론. dataMode `"mock"` + limitations 1건.
 * - yearlySupport 1건이면 trendDirection/gapLevel 모두 `"unknown"` + SINGLE_YEAR_LIMITATION.
 * - yearlySupport 빈 배열이면 `"unknown"` + UNKNOWN_LIMITATION.
 *
 * domain은 "training"으로 고정 (programCount 시계열의 의미가 진로체험·훈련 공급).
 * 실 도메인 분리(demand / school / employment 등)는 1차-95+ 또는 KESS 시계열 raw 확보 후
 * 별도 단계.
 */
export function buildGapTrendSignal(region: RegionData): GapTrendSignal[] {
  const yearly = region.yearlySupport ?? [];
  const regionCode = region.regionCode;

  if (yearly.length === 0) {
    return [
      {
        regionCode,
        domain: "training",
        trendDirection: "unknown",
        gapLevel: "unknown",
        evidenceLabel: "yearlySupport 데이터 없음",
        dataMode: "mock",
        limitations: [UNKNOWN_LIMITATION],
      },
    ];
  }

  if (yearly.length === 1) {
    return [
      {
        regionCode,
        domain: "training",
        baselineYear: yearly[0].year,
        currentYear: yearly[0].year,
        trendDirection: "unknown",
        gapLevel: "unknown",
        evidenceLabel: `시연용 단일 연도 데이터 (year=${yearly[0].year})`,
        dataMode: "mock",
        limitations: [SINGLE_YEAR_LIMITATION, MOCK_LIMITATION],
      },
    ];
  }

  const first = yearly[0];
  const last = yearly[yearly.length - 1];
  const baselineProgramCount = first.programCount ?? 0;
  const currentProgramCount = last.programCount ?? 0;

  return [
    {
      regionCode,
      domain: "training",
      baselineYear: first.year,
      currentYear: last.year,
      trendDirection: deriveTrendDirection(
        baselineProgramCount,
        currentProgramCount,
      ),
      gapLevel: deriveGapLevel(currentProgramCount),
      evidenceLabel: `시연용 fixture 기반 연도별 자원 변화 (programCount ${first.year}~${last.year})`,
      dataMode: "mock",
      limitations: [MOCK_LIMITATION],
    },
  ];
}
