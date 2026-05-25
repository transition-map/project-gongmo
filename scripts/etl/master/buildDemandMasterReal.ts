/**
 * 11-3 1차-36 — A demand master.real builder.
 *
 * 정책 (사용자 합의값):
 * - master 단계 책임 (CLAUDE.md §4 단방향 5단계 원칙). cleanSpecialEducation /
 *   cleanDisabledPopulation는 단일 소스 정제 only — cross-source outer join은 master 단계.
 * - 입력: `cleanSpecialEducation` / `cleanDisabledPopulation` pure function이 산출한
 *   CleanedRecord[] + G admin_codes (validRegionCodes set 구성용).
 * - regionCode 기준 outer join — 양쪽 record가 있으면 한 master record에 합쳐지고,
 *   한쪽만 있으면 보존 + info issue (field: "partialDemand", 1차-1 fixture buildDemandMaster와
 *   동일 field naming).
 * - regionCode가 admin_codes set에 없으면 record 제외 + warning issue (field: "regionCode",
 *   1차-23 / 1차-34 패턴 일관).
 * - `MasterDemandRecord` schema 무변경 (master/types.ts:48-54 그대로).
 * - **Pure function** — 입력 array·record 객체 mutate 0건.
 *
 * fixture proxy 시나리오:
 * - `A_special_education_sample.json` (7 records, 6 valid KOSTAT + 1 "INVALID") +
 *   `A_disabled_population_sample.json` (6 records, 모두 valid KOSTAT) →
 *   records=6 / warning issues=1 ("INVALID" 1건) + partialDemand info issues=0 (양쪽 모두 보유).
 *
 * Block C 진보 (1차-36 단독):
 * - specialEducationStudentCount + registeredDisabledCount 2개 field가 demand_master.json
 *   → mart.real region_summary로 흐름 시작. 1차-30 / 1차-34 정책과 동일하게 frontend src/*
 *   무수정 (etlAdapter mapMartToRegionSummary가 이미 두 field 매핑 중 — 자동 흡수).
 * - transitionGapIndex / yearlySupport / mainIssue / policyUse / teacherUse / population은
 *   여전히 미해결. "완전 실데이터 대시보드 전환" 표현 금지.
 */

import type { CleanedDisabledPopulationRecord } from "../clean/cleanDisabledPopulation";
import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";
import type { CleanedSpecialEducationRecord } from "../clean/cleanSpecialEducation";
import type { DataQualityIssue } from "../types";
import type { MasterDemandRecord } from "./types";

export interface BuildDemandMasterRealInput {
  /** A `cleanSpecialEducation` pure function이 산출한 cleaned records. */
  specialEducation: CleanedSpecialEducationRecord[];
  /** A `cleanDisabledPopulation` pure function이 산출한 cleaned records. */
  disabledPopulation: CleanedDisabledPopulationRecord[];
  /** G admin_codes clean records — validRegionCodes set 구성용. */
  adminCodes: CleanedRegionCodeRecord[];
}

export interface BuildDemandMasterRealResult {
  records: MasterDemandRecord[];
  issues: DataQualityIssue[];
}

/**
 * A demand master.real builder.
 *
 * 1) admin_codes로부터 validRegionCodes Set 구성.
 * 2) special education + disabled population을 regionCode 기준 outer join.
 * 3) admin set 외 regionCode → 제외 + warning issue (각 입력 array 순회 시점에 발행).
 * 4) 양쪽 한쪽만 있는 region → 보존 + info issue (field: "partialDemand").
 *
 * 1차-1 fixture `buildDemandMaster`(buildMaster.ts:239-313)와 동일한 outer join /
 * issue 정책 패턴을 따른다 (fixture builder는 무수정, real path 별도 wrapper 신규).
 */
export function buildDemandMasterReal(
  input: BuildDemandMasterRealInput,
): BuildDemandMasterRealResult {
  const validRegionCodes = new Set(
    input.adminCodes.map((a) => a.regionCode),
  );
  const issues: DataQualityIssue[] = [];
  const map = new Map<string, MasterDemandRecord>();

  for (const r of input.specialEducation) {
    if (!validRegionCodes.has(r.regionCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "A",
        field: "regionCode",
        message: `specialEducation regionCode '${r.regionCode}'가 G admin_codes에 없어 demand master에서 제외`,
      });
      continue;
    }
    const existing = map.get(r.regionCode);
    if (existing) {
      existing.specialEducationStudentCount = r.specialEducationStudentCount;
      existing.year = r.year ?? existing.year;
    } else {
      map.set(r.regionCode, {
        regionCode: r.regionCode,
        regionCodeType: r.regionCodeType,
        specialEducationStudentCount: r.specialEducationStudentCount,
        year: r.year,
      });
    }
  }

  for (const r of input.disabledPopulation) {
    if (!validRegionCodes.has(r.regionCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "A",
        field: "regionCode",
        message: `disabledPopulation regionCode '${r.regionCode}'가 G admin_codes에 없어 demand master에서 제외`,
      });
      continue;
    }
    const existing = map.get(r.regionCode);
    if (existing) {
      existing.registeredDisabledCount = r.registeredDisabledCount;
      existing.year = r.year ?? existing.year;
    } else {
      map.set(r.regionCode, {
        regionCode: r.regionCode,
        regionCodeType: r.regionCodeType,
        registeredDisabledCount: r.registeredDisabledCount,
        year: r.year,
      });
    }
  }

  const records = Array.from(map.values());
  for (const r of records) {
    if (
      r.specialEducationStudentCount === undefined ||
      r.registeredDisabledCount === undefined
    ) {
      issues.push({
        severity: "info",
        datasetCategory: "A",
        field: "partialDemand",
        message: `regionCode '${r.regionCode}'가 special_education / disabled_population 중 한쪽만 보유 (partial demand)`,
      });
    }
  }

  return { records, issues };
}
