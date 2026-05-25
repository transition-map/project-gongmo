/**
 * ETL 통합 테스트 helper.
 *
 * 두 가지 책임:
 * 1. `runEtlStage` — child_process로 runEtl.ts의 stage를 실행한다.
 *    `etlStages.test.ts`에서만 호출되어야 한다 (산출물 폴더 동시 쓰기 방지).
 * 2. `loadBuildMasterInputFromFixtures` — data/fixtures/*.json을 읽고 cleaner
 *    6개를 in-memory로 호출해 BuildMasterInput을 만든다. master.test.ts /
 *    mart.test.ts가 data/clean·data/master 산출물에 의존하지 않고 pure function
 *    테스트만 수행할 수 있게 한다.
 *
 * Vitest는 테스트 파일을 병렬로 실행할 수 있어 여러 테스트가 같은 산출물 폴더에
 * 쓰면 flaky 위험이 있다. 본 helper는 stage 실행 권한을 한 곳으로 집중시키는
 * 역할을 한다.
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { readJson } from "../io/readJson";
import { readText } from "../io/readText";
import { cleanDisabledPopulation } from "../clean/cleanDisabledPopulation";
import { cleanGeocoding } from "../clean/cleanGeocoding";
import { cleanLegalDongCodes } from "../clean/cleanLegalDongCodes";
import { cleanRegionCodes } from "../clean/cleanRegionCodes";
import { cleanSchoolBasic } from "../clean/cleanSchoolBasic";
import { cleanSpecialEducation } from "../clean/cleanSpecialEducation";
import { cleanSupportCenter } from "../clean/cleanSupportCenter";
import { ingestLegalDongCodes } from "../ingest/ingestLegalDongCodes";
import { ingestRegionCodes } from "../ingest/ingestRegionCodes";
import type { BuildMasterInput } from "../master/buildMaster";
import type { FixtureFile } from "../types";

const FIXTURE_DIR = "data/fixtures";

const FIXTURE_PATHS = {
  regionCodes: join(FIXTURE_DIR, "G_region_codes_sample.json"),
  geocoding: join(FIXTURE_DIR, "G_geocoding_sample.json"),
  specialEducation: join(FIXTURE_DIR, "A_special_education_sample.json"),
  disabledPopulation: join(FIXTURE_DIR, "A_disabled_population_sample.json"),
  schoolBasic: join(FIXTURE_DIR, "B_school_basic_sample.json"),
  supportCenter: join(FIXTURE_DIR, "B_special_support_center_sample.json"),
  // 11-2 1차-4 신규 — legalDong CSV fixture (10자리 법정동 코드).
  // 11-2 1차-5 신규 — adminCodes CSV fixture (5자리 시군구 코드).
  // 본 헬퍼는 JSON fixture 6건 + CSV fixture 2건(legalDong, adminCodes)을 처리한다.
  legalDongCodes: join(FIXTURE_DIR, "G_legal_dong_codes_mini.csv"),
  adminCodes: join(FIXTURE_DIR, "G_admin_codes_mini.csv"),
} as const;

/**
 * runEtl.ts를 child process로 실행한다.
 *
 * Windows에서 `execFileSync(npx.cmd, ...)`는 Node.js 보안 패치(CVE-2024-27980,
 * Node 18.20.2 / 20.12.2 / 21.7.3+) 이후 EINVAL로 차단된다. `execSync`는 shell을
 * 경유하므로 cross-platform으로 안전. stage 값은 hardcoded union이라 shell
 * injection 위험 없음.
 */
export function runEtlStage(
  stage: "clean" | "master" | "mart" | "indicator" | "all",
): void {
  execSync(`npx tsx scripts/etl/runEtl.ts --mode fixture --stage ${stage}`, {
    stdio: "inherit",
  });
}

/**
 * fixture 파일 6개를 읽고 cleaner를 in-memory로 호출해 BuildMasterInput을 만든다.
 * data/clean 산출물에 의존하지 않으므로 다른 테스트 파일과 산출물 경로를 공유하지 않는다.
 *
 * cleaner 입력 타입은 cleaner마다 다르지만 fixture는 unknown JSON이라 runEtl.ts와
 * 동일하게 `Parameters<typeof clean...>[0]`로 widening한다. 통과 후 결과는 cleaner의
 * `CleanedXxxRecord` 타입으로 좁혀진다.
 */
export function loadBuildMasterInputFromFixtures(): BuildMasterInput {
  const regions = readJson<FixtureFile<unknown>>(FIXTURE_PATHS.regionCodes).records;
  const geos = readJson<FixtureFile<unknown>>(FIXTURE_PATHS.geocoding).records;
  const specialEd = readJson<FixtureFile<unknown>>(FIXTURE_PATHS.specialEducation).records;
  const disabledPop = readJson<FixtureFile<unknown>>(FIXTURE_PATHS.disabledPopulation).records;
  const schools = readJson<FixtureFile<unknown>>(FIXTURE_PATHS.schoolBasic).records;
  const centers = readJson<FixtureFile<unknown>>(FIXTURE_PATHS.supportCenter).records;

  // 11-2 1차-4 — legalDong은 CSV이므로 readText → ingestLegalDongCodes →
  // cleanLegalDongCodes 흐름으로 처리한다. runEtl의 CSV pipeline과 동일 의미.
  const legalDongCsv = readText(FIXTURE_PATHS.legalDongCodes);
  const legalDongIngested = ingestLegalDongCodes({ csvText: legalDongCsv });
  const legalDongCleaned = cleanLegalDongCodes(legalDongIngested.records);

  // 11-2 1차-5 — adminCodes도 CSV이므로 readText → ingestRegionCodes →
  // cleanRegionCodes 흐름으로 처리한다 (legalDong과 동일 패턴, 5자리 시군구).
  const adminCsv = readText(FIXTURE_PATHS.adminCodes);
  const adminIngested = ingestRegionCodes({ csvText: adminCsv });
  const adminCleaned = cleanRegionCodes(adminIngested.records);

  return {
    regionCodeRecords: cleanRegionCodes(
      regions as Parameters<typeof cleanRegionCodes>[0],
    ).records,
    geocodingRecords: cleanGeocoding(
      geos as Parameters<typeof cleanGeocoding>[0],
    ).records,
    specialEducationRecords: cleanSpecialEducation(
      specialEd as Parameters<typeof cleanSpecialEducation>[0],
    ).records,
    disabledPopulationRecords: cleanDisabledPopulation(
      disabledPop as Parameters<typeof cleanDisabledPopulation>[0],
    ).records,
    schoolBasicRecords: cleanSchoolBasic(
      schools as Parameters<typeof cleanSchoolBasic>[0],
    ).records,
    supportCenterRecords: cleanSupportCenter(
      centers as Parameters<typeof cleanSupportCenter>[0],
    ).records,
    legalDongCodeRecords: legalDongCleaned.records,
    adminCodeRecords: adminCleaned.records,
  };
}
