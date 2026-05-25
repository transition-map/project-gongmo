/**
 * indicator.test.ts — buildIndicatorOutput() pure function 테스트.
 *
 * **stage 산출물 폴더에 쓰지 않는다.** Vitest는 테스트 파일을 병렬 실행할 수 있어
 * 여러 테스트가 같은 data/clean·data/master·data/mart·data/indicator 경로에 동시
 * 쓰면 flaky 위험이 있다. stage 실행과 산출물 검증은 etlStages.test.ts가 단독으로
 * 담당한다.
 *
 * 본 파일은 fixture → cleaner → buildMaster → buildRegionSummaryMart →
 * buildIndicatorOutput 파이프라인을 in-memory로 구성한다.
 */

import { describe, expect, it } from "vitest";
import { buildMaster } from "../master/buildMaster";
import { buildRegionSummaryMart } from "../mart/buildRegionSummaryMart";
import {
  buildIndicatorOutput,
  INDICATOR_BASE_YEAR,
  INDICATOR_CALCULATED_AT,
} from "../indicator/buildIndicatorOutput";
import type { MasterBuildResult } from "../master/types";
import type { MartRegionSummaryRecord } from "../mart/types";
import { loadBuildMasterInputFromFixtures } from "./testEtlCommands";

interface PipelineSnapshot {
  master: MasterBuildResult;
  martRecords: MartRegionSummaryRecord[];
}

/** fixture에서 master + mart까지 in-memory로 한 번 구성한다. */
function buildPipelineFromFixtures(): PipelineSnapshot {
  const masterInput = loadBuildMasterInputFromFixtures();
  const master = buildMaster(masterInput);
  const martResult = buildRegionSummaryMart({
    regionMaster: master.regionMaster,
    demandMaster: master.demandMaster,
    schoolMaster: master.schoolMaster,
    supportCenterMaster: master.supportCenterMaster,
  });
  return { master, martRecords: martResult.records };
}

describe("buildIndicatorOutput (in-memory fixture pipeline)", () => {
  it("records와 issues 배열을 반환", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    expect(Array.isArray(result.records)).toBe(true);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("records 수가 martRecords 수와 동일 (11-2 1차-9 Policy A 후 10건)", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    expect(result.records.length).toBe(p.martRecords.length);
    expect(result.records.length).toBe(10);
  });

  it("모든 record의 indicatorVersion === 'mvp-v1'", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    for (const r of result.records) {
      expect(r.indicatorVersion).toBe("mvp-v1");
    }
  });

  it("모든 record의 baseYear === 2026", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    expect(INDICATOR_BASE_YEAR).toBe(2026);
    for (const r of result.records) {
      expect(r.baseYear).toBe(2026);
    }
  });

  it("모든 record의 calculatedAt === '2026-05-11T00:00:00+09:00'", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    expect(INDICATOR_CALCULATED_AT).toBe("2026-05-11T00:00:00+09:00");
    for (const r of result.records) {
      expect(r.calculatedAt).toBe("2026-05-11T00:00:00+09:00");
    }
  });

  it("regionCode 집합이 martRecords의 regionCode 집합과 동일", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    const idxCodes = new Set(result.records.map((r) => r.regionCode));
    const martCodes = new Set(p.martRecords.map((r) => r.regionCode));
    expect(idxCodes).toEqual(martCodes);
  });

  it("transitionGapIndex가 모든 record에서 0~100 범위", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    for (const r of result.records) {
      const v = r.indicators?.transitionGapIndex;
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("6개 도메인 지수 모두 0~100 범위", () => {
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    for (const r of result.records) {
      const ind = r.indicators;
      expect(ind).toBeDefined();
      const checks: Array<[string, number | undefined]> = [
        ["demandIndex", ind?.demandIndex],
        ["schoolSupportIndex", ind?.schoolSupportIndex],
        ["trainingSupplyIndex", ind?.trainingSupplyIndex],
        ["employmentIndex", ind?.employmentIndex],
        ["welfareIndex", ind?.welfareIndex],
        ["accessibilityIndex", ind?.accessibilityIndex],
      ];
      for (const [name, v] of checks) {
        expect(typeof v, name).toBe("number");
        expect(v, name).toBeGreaterThanOrEqual(0);
        expect(v, name).toBeLessThanOrEqual(100);
      }
    }
  });

  it("C/D/E/F partial fixture: training/employment/welfare/accessibility 지수가 모두 낮게 (≤ 30)", () => {
    // C/D/E/F 도메인 입력이 빈 배열이라 산식이 가중평균 0 → 도메인 지수도 0에 근접.
    // 보수적으로 30 이하만 검증 (산식 가중치 변화에도 견고).
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    expect(result.records.length).toBeGreaterThan(0);
    for (const r of result.records) {
      const ind = r.indicators;
      expect(ind?.trainingSupplyIndex).toBeLessThanOrEqual(30);
      expect(ind?.employmentIndex).toBeLessThanOrEqual(30);
      expect(ind?.welfareIndex).toBeLessThanOrEqual(30);
      expect(ind?.accessibilityIndex).toBeLessThanOrEqual(30);
    }
  });

  it("martRecords가 빈 배열이면 빈 records와 issues를 반환", () => {
    const result = buildIndicatorOutput({
      martRecords: [],
      schoolMaster: [],
      supportCenterMaster: [],
    });
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("신규 admin-union skeletal region 4건의 transitionGapIndex === 60 (산식 회귀 가드, 11-2 1차-9)", () => {
    // Policy A 후 admin-union 신규 4건(11200/11410/11440/11650)은
    // demand/school/supportCenter 데이터 전무 + C/D/E/F 모두 빈 배열 → 모든 도메인 지수 0.
    // computeTransitionGapIndex:
    //   demand=0 * 0.40 = 0
    //   + (100-0) * 0.15 (schoolSupport) = 15
    //   + (100-0) * 0.15 (trainingSupply) = 15
    //   + (100-0) * 0.10 (employment) = 10
    //   + (100-0) * 0.10 (welfare) = 10
    //   + (100-0) * 0.10 (accessibility) = 10
    //   = 60
    // partialRegionFlag로 후속 화면에서 "데이터 부재"임을 구분 표시 예정.
    const p = buildPipelineFromFixtures();
    const result = buildIndicatorOutput({
      martRecords: p.martRecords,
      schoolMaster: p.master.schoolMaster,
      supportCenterMaster: p.master.supportCenterMaster,
    });
    const skeletalCodes = ["11200", "11410", "11440", "11650"];
    for (const code of skeletalCodes) {
      const rec = result.records.find((r) => r.regionCode === code);
      expect(rec, `skeletal region ${code} should exist`).toBeDefined();
      expect(rec?.indicators?.transitionGapIndex).toBe(60);
    }
  });
});
