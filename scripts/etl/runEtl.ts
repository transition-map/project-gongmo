/**
 * 11-1/11-2 ETL 실행기 — fixture 기반 clean / master / mart / indicator / all 단계 지원.
 *
 * 사용:
 *   tsx scripts/etl/runEtl.ts --mode fixture --stage clean
 *   tsx scripts/etl/runEtl.ts --mode fixture --stage master
 *   tsx scripts/etl/runEtl.ts --mode fixture --stage mart
 *   tsx scripts/etl/runEtl.ts --mode fixture --stage indicator
 *   tsx scripts/etl/runEtl.ts --mode fixture --stage all
 *
 * 11-2 1차-13 신규 — 실 행안부 CSV clean 단계 골격(real mode):
 *   tsx scripts/etl/runEtl.ts --mode real --stage clean \
 *     --admin-codes <path> --legal-dong-codes <path>
 *
 *   - --mode real은 --stage clean만 허용 (master/mart/indicator는 fixture 전용).
 *   - --admin-codes / --legal-dong-codes는 둘 다 필수, 자동 탐색 X.
 *   - 출력은 data/clean.real/G/{admin_codes,legal_dong_codes}.clean.json
 *     (fixture 출력 data/clean/G/와 분리; data/clean.real/는 gitignore).
 *   - 외부 네트워크 호출·API key 사용·.env.local 생성 모두 X.
 *
 * 제약 (공통):
 * - 단일 stage는 선행 산출물 부재 시 명시적 에러 후 exit 1 (자동 선행 실행 안 함).
 *   - master는 clean 산출물(data/clean/{G,A,B}/*.json)을 요구.
 *   - mart는 master 산출물(data/master/*.json) 4개를 요구.
 *   - indicator는 mart 산출물 + master/school·support_center를 요구.
 * - --stage all은 clean → master → mart → indicator를 순차 실행한다.
 *   중간 단계가 throw하면 후속 단계는 실행되지 않고 main()의 catch가 exitCode=1로 종료.
 * - 실제 API 호출 / process.env에서 ETL_API_KEY_* 읽기 / .env.local 생성·읽기 모두 X.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";
import { readJson } from "./io/readJson";
import { writeJson } from "./io/writeJson";
import { readBytes } from "./io/readBytes";
import { readText } from "./io/readText";
import { decodeCp949 } from "./io/decodeCp949";
import { cleanRegionCodes } from "./clean/cleanRegionCodes";
import { cleanGeocoding } from "./clean/cleanGeocoding";
import { cleanSpecialEducation } from "./clean/cleanSpecialEducation";
import { cleanDisabledPopulation } from "./clean/cleanDisabledPopulation";
import { cleanSchoolBasic } from "./clean/cleanSchoolBasic";
import { cleanSupportCenter } from "./clean/cleanSupportCenter";
import { cleanLegalDongCodes } from "./clean/cleanLegalDongCodes";
import { ingestRegionCodes } from "./ingest/ingestRegionCodes";
import { ingestLegalDongCodes } from "./ingest/ingestLegalDongCodes";
import { ingestKikcdB } from "./ingest/ingestKikcdB";
import { ingestKikcdH } from "./ingest/ingestKikcdH";
import { ingestKikmix } from "./ingest/ingestKikmix";
import { cleanHjdCodes } from "./clean/cleanHjdCodes";
import { cleanKikmix } from "./clean/cleanKikmix";
import { validateCrossRefKikmix } from "./clean/crossRefKikmix";
import { ingestSchools } from "./ingest/ingestSchools";
import { cleanSchools } from "./clean/cleanSchools";
import {
  runCsvCleanTask,
  type CsvIngestStepResult,
} from "./clean/_csvCleanPipeline";
import type { CleanedRegionCodeRecord } from "./clean/cleanRegionCodes";
import type { CleanedGeocodingRecord } from "./clean/cleanGeocoding";
import type { CleanedSpecialEducationRecord } from "./clean/cleanSpecialEducation";
import type { CleanedDisabledPopulationRecord } from "./clean/cleanDisabledPopulation";
import type { CleanedSchoolBasicRecord } from "./clean/cleanSchoolBasic";
import type { CleanedSupportCenterRecord } from "./clean/cleanSupportCenter";
import type { CleanedLegalDongRecord } from "./clean/cleanLegalDongCodes";
import { buildMaster } from "./master/buildMaster";
import {
  buildSchoolMasterReal,
  type CleanedSchoolForMaster,
} from "./master/buildSchoolMasterReal";
// 11-3 1차-125 — NEIS clean output의 address에서 sigunguName을 파생하는 pure helper.
// runRealMasterStage에서 cleanSchools output의 `_meta.source`가 `real:neis-*` 패턴일 때만
// buildSchoolMasterReal 입력 전에 적용. fixture / `fixture:*` source는 미적용.
import { deriveSchoolSigunguFromAddress } from "./clean/deriveSchoolSigungu";
import { buildSupportCenterMasterReal } from "./master/buildSupportCenterMasterReal";
import { buildDemandMasterReal } from "./master/buildDemandMasterReal";
import { buildRegionSummaryMartReal } from "./mart/buildRegionSummaryMartReal";
import type {
  MasterAdminCodeRecord,
  MasterAdminLegalDongCrossrefRecord,
  MasterDemandRecord,
  MasterLegalDongRecord,
  MasterRegionRecord,
  MasterSchoolRecord,
  MasterSupportCenterRecord,
} from "./master/types";
import { buildRegionSummaryMart } from "./mart/buildRegionSummaryMart";
import type { MartRegionSummaryRecord } from "./mart/types";
import {
  buildIndicatorOutput,
  INDICATOR_BASE_YEAR,
  INDICATOR_CALCULATED_AT,
} from "./indicator/buildIndicatorOutput";
import type { IndicatorOutputFile } from "./indicator/types";
import type { TransitionIndex } from "../../src/types";
import type {
  CleanOutputFile,
  CleanResult,
  DataQualityIssue,
  FixtureFile,
} from "./types";

// ─── argv 파싱 ─────────────────────────────────────────────────────────────
//
// 11-2 1차-13 — Args에 --admin-codes / --legal-dong-codes 경로 추가.
// 11-2 1차-15 — Args에 --encoding 추가. real 모드에서 KIKcd_B 인코딩 분기 (기본 cp949).
// 11-2 1차-16 — Args에 --hjd-codes 추가. optional — 지정 시 KIKcd_H 행정동도 처리.
// 11-2 1차-17 — Args에 --mix-codes 추가. optional — 지정 시 KIKmix 행정동↔법정동 매핑 처리.
// 11-3 1차-1 — Args에 --schools 추가. optional — B 학교 기본 정보 JSON 파일 경로.
//   1차-1 단계는 인자 파싱 + 파일 존재 검증까지만 (runRealCleanStage schools 분기는 1차-2~4).
// 모든 *CodesPath / schoolsPath 필드는 fixture 모드에서 무시되며, real 모드 + clean stage에서만 의미 있다.
// 파싱 단계에서는 검증을 하지 않는다 (validateRealModeArgs / resolveRealModeEncoding이 담당).
export interface Args {
  mode: string;
  stage: string;
  adminCodesPath: string;
  legalDongCodesPath: string;
  hjdCodesPath: string;
  mixCodesPath: string;
  schoolsPath: string;
  encoding: string;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: "",
    stage: "",
    adminCodesPath: "",
    legalDongCodesPath: "",
    hjdCodesPath: "",
    mixCodesPath: "",
    schoolsPath: "",
    encoding: "",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--mode" && next) {
      args.mode = next;
      i++;
    } else if (a === "--stage" && next) {
      args.stage = next;
      i++;
    } else if (a === "--admin-codes" && next) {
      args.adminCodesPath = next;
      i++;
    } else if (a === "--legal-dong-codes" && next) {
      args.legalDongCodesPath = next;
      i++;
    } else if (a === "--hjd-codes" && next) {
      args.hjdCodesPath = next;
      i++;
    } else if (a === "--mix-codes" && next) {
      args.mixCodesPath = next;
      i++;
    } else if (a === "--schools" && next) {
      args.schoolsPath = next;
      i++;
    } else if (a === "--encoding" && next) {
      args.encoding = next;
      i++;
    }
  }
  return args;
}

// ─── real 모드 인코딩 결정 ─────────────────────────────────────────────────
//
// 11-2 1차-15 — `--encoding` 값 → 실제 디코더 라벨로 정규화.
// - 빈 값 / "cp949" / "euc-kr" → "cp949" (행안부 KIKcd_B 기본).
// - "utf-8" / "utf8" → "utf-8" (이미 변환된 입력용).
// - 그 외 → throw (오타·미지원 인코딩 즉시 차단).
//
// case-insensitive 비교. 본 함수는 fixture 모드에서는 호출되지 않는다.
export function resolveRealModeEncoding(args: Args): "cp949" | "utf-8" {
  const raw = args.encoding.trim().toLowerCase();
  if (raw === "" || raw === "cp949" || raw === "euc-kr") return "cp949";
  if (raw === "utf-8" || raw === "utf8") return "utf-8";
  throw new Error(
    `[runEtl real] 지원하지 않는 --encoding 값: '${args.encoding}'. ` +
      `허용: cp949 | euc-kr | utf-8 (기본: cp949).`,
  );
}

// ─── 경로 ──────────────────────────────────────────────────────────────────
const FIXTURE_DIR = "data/fixtures";
const CLEAN_DIR = "data/clean";
// 11-2 1차-13 — real 모드 clean 산출물 디렉터리. .gitignore에 추가됨.
// fixture 출력(data/clean)과 물리적으로 분리해 실제 행안부 CSV 산출물이 commit
// 후보가 되지 않도록 한다.
const CLEAN_REAL_DIR = "data/clean.real";
const MASTER_DIR = "data/master";
// 11-3 1차-23 — real 모드 master 산출물 디렉터리. (.gitignore 추가는 사용자가
// 별도 단계에서 직접 — 현재 본 단계에서는 .gitignore 수정 없음.) commit 금지.
const MASTER_REAL_DIR = "data/master.real";
const MART_DIR = "data/mart";
// 11-3 1차-30 — real 모드 mart 산출물 디렉터리. .gitignore에 함께 추가됨. commit 금지.
const MART_REAL_DIR = "data/mart.real";
const INDICATOR_DIR = "data/indicator";
// 11-3 1차-38 — real 모드 indicator 산출물 디렉터리. .gitignore에 함께 추가됨. commit 금지.
const INDICATOR_REAL_DIR = "data/indicator.real";

// ─── real 모드 인자 검증 ──────────────────────────────────────────────────
//
// 11-2 1차-13 — --mode real 사용 시:
// - --stage는 clean만 허용 (master/mart/indicator는 fixture 전용).
// - --admin-codes / --legal-dong-codes 둘 다 필수 + 파일이 실제로 존재해야 함.
// - 자동 탐색 / glob 매칭 X — 사용자가 명시한 경로만 사용.
// 한국어 에러 메시지는 사용자가 CLI에서 즉시 원인을 파악할 수 있게 한다.
export function validateRealModeArgs(args: Args): void {
  // 11-3 1차-23 — `--stage master` 추가 허용. master.real는 disk 입력(clean.real
  // 산출물)만 읽으므로 CLI args(admin-codes 등)가 필요 없다. master stage의 disk
  // 입력 검증은 runRealMasterStage()가 수행한다.
  // 11-3 1차-30 — `--stage mart` 추가 허용. mart.real도 disk 입력(clean.real +
  // master.real)만 읽으므로 CLI args 불필요. runRealMartStage()가 disk 검증.
  // 11-3 1차-38 — `--stage indicator` 추가 허용. indicator.real도 disk 입력(mart.real +
  // master.real)만 읽으므로 CLI args 불필요. runRealIndicatorStage()가 disk 검증.
  if (
    args.stage === "master" ||
    args.stage === "mart" ||
    args.stage === "indicator"
  ) {
    return;
  }
  if (args.stage !== "clean") {
    throw new Error(
      `[runEtl real] --mode real은 --stage clean 또는 master 또는 mart 또는 indicator만 지원합니다 (받은 stage: '${args.stage}').`,
    );
  }
  if (args.adminCodesPath.length === 0) {
    throw new Error(
      `[runEtl real] --admin-codes <경로> 인자가 필요합니다. 행안부 CSV 파일 경로를 명시해주세요.`,
    );
  }
  if (args.legalDongCodesPath.length === 0) {
    throw new Error(
      `[runEtl real] --legal-dong-codes <경로> 인자가 필요합니다. 행안부 CSV 파일 경로를 명시해주세요.`,
    );
  }
  if (!existsSync(args.adminCodesPath)) {
    throw new Error(
      `[runEtl real] --admin-codes 파일이 존재하지 않습니다: ${args.adminCodesPath}`,
    );
  }
  if (!existsSync(args.legalDongCodesPath)) {
    throw new Error(
      `[runEtl real] --legal-dong-codes 파일이 존재하지 않습니다: ${args.legalDongCodesPath}`,
    );
  }
  // 11-2 1차-16 — --hjd-codes는 optional. 지정된 경우에만 파일 존재 검증.
  if (args.hjdCodesPath.length > 0 && !existsSync(args.hjdCodesPath)) {
    throw new Error(
      `[runEtl real] --hjd-codes 파일이 존재하지 않습니다: ${args.hjdCodesPath}`,
    );
  }
  // 11-2 1차-17 — --mix-codes는 optional. 지정된 경우에만 파일 존재 검증.
  //   --hjd-codes와 독립 — cross-file validation은 1차-18+ 보류.
  if (args.mixCodesPath.length > 0 && !existsSync(args.mixCodesPath)) {
    throw new Error(
      `[runEtl real] --mix-codes 파일이 존재하지 않습니다: ${args.mixCodesPath}`,
    );
  }
  // 11-3 1차-1 — --schools는 optional. 지정된 경우에만 파일 존재 검증.
  //   1차-1 시점은 인자 파싱 + 검증까지만 — runRealCleanStage 분기 구현은 1차-2~4.
  if (args.schoolsPath.length > 0 && !existsSync(args.schoolsPath)) {
    throw new Error(
      `[runEtl real] --schools 파일이 존재하지 않습니다: ${args.schoolsPath}`,
    );
  }
  // 11-2 1차-15 — --encoding 값 검증 (throw on unsupported value)
  resolveRealModeEncoding(args);
}

// ─── clean 작업 정의 ──────────────────────────────────────────────────────
//
// 각 cleaner는 자체 `Cleaned*Record` 타입을 반환하지만 task 배열에서 통합 관리하기
// 위해 record 타입을 `unknown`으로 widening한다 (covariant: 구체 타입은 unknown의
// subtype이라 안전). runEtl는 결과를 그대로 직렬화만 하므로 record 내부 필드를
// 직접 참조하지 않는다.
interface CleanTask {
  label: string;
  datasetCategory: "G" | "A" | "B";
  inputPath: string;
  outputPath: string;
  run: (records: unknown[]) => CleanResult<unknown>;
}

// 11-2 1차-3 — CSV ingest+clean 통합 task 정의 (안 B).
// CSV → ingest → cleaner → CleanOutputFile 직렬화는 `runCsvCleanTask`가 담당.
// CRITICAL: master 단계 입력 목록(MASTER_INPUT_FILES)은 본 산출물을 포함하지 않는다.
// sigungu × legalDong join은 11-2 1차-4로 미룬다.
//
// 11-2 1차-13 — module-level `CSV_TASKS` const를 `buildCsvTasks(args)` factory로
// 변경. fixture 모드는 fixture CSV → data/clean/G/ 출력, real 모드는 인자에서
// 전달된 CSV → data/clean.real/G/ 출력. ingest·clean 함수는 양쪽 모드에서 동일
// 모듈을 사용한다 (행안부 정식 CSV ↔ fixture CSV 헤더가 동일하다는 전제).
export interface CsvCleanTaskDef {
  label: string;
  datasetCategory: "G";
  csvPath: string;
  outputPath: string;
  ingest: (csvText: string) => CsvIngestStepResult;
  run: (records: unknown[]) => CleanResult<unknown>;
}

export function buildCsvTasks(args: Args): CsvCleanTaskDef[] {
  const isReal = args.mode === "real";
  if (isReal) {
    if (
      args.adminCodesPath.length === 0 ||
      args.legalDongCodesPath.length === 0
    ) {
      throw new Error(
        `[runEtl real] buildCsvTasks: real 모드에는 adminCodesPath와 legalDongCodesPath가 모두 필요합니다.`,
      );
    }
  }
  const baseCleanDir = isReal ? CLEAN_REAL_DIR : CLEAN_DIR;
  const adminCsvPath = isReal
    ? args.adminCodesPath
    : join(FIXTURE_DIR, "G_admin_codes_mini.csv");
  const legalDongCsvPath = isReal
    ? args.legalDongCodesPath
    : join(FIXTURE_DIR, "G_legal_dong_codes_mini.csv");

  return [
    {
      label: "G/admin_codes",
      datasetCategory: "G",
      csvPath: adminCsvPath,
      outputPath: join(baseCleanDir, "G", "admin_codes.clean.json"),
      ingest: (csvText) => {
        const r = ingestRegionCodes({ csvText });
        return { records: r.records, issues: r.issues };
      },
      run: (records) =>
        cleanRegionCodes(records as Parameters<typeof cleanRegionCodes>[0]),
    },
    {
      label: "G/legal_dong_codes",
      datasetCategory: "G",
      csvPath: legalDongCsvPath,
      outputPath: join(baseCleanDir, "G", "legal_dong_codes.clean.json"),
      ingest: (csvText) => {
        const r = ingestLegalDongCodes({ csvText });
        return { records: r.records, issues: r.issues };
      },
      run: (records) =>
        cleanLegalDongCodes(records as Parameters<typeof cleanLegalDongCodes>[0]),
    },
  ];
}

const TASKS: CleanTask[] = [
  {
    label: "G/region_codes",
    datasetCategory: "G",
    inputPath: join(FIXTURE_DIR, "G_region_codes_sample.json"),
    outputPath: join(CLEAN_DIR, "G", "region_codes.clean.json"),
    run: (records) => cleanRegionCodes(records as Parameters<typeof cleanRegionCodes>[0]),
  },
  {
    label: "G/geocoding",
    datasetCategory: "G",
    inputPath: join(FIXTURE_DIR, "G_geocoding_sample.json"),
    outputPath: join(CLEAN_DIR, "G", "geocoding.clean.json"),
    run: (records) => cleanGeocoding(records as Parameters<typeof cleanGeocoding>[0]),
  },
  {
    label: "A/special_education",
    datasetCategory: "A",
    inputPath: join(FIXTURE_DIR, "A_special_education_sample.json"),
    outputPath: join(CLEAN_DIR, "A", "special_education.clean.json"),
    run: (records) => cleanSpecialEducation(records as Parameters<typeof cleanSpecialEducation>[0]),
  },
  {
    label: "A/disabled_population",
    datasetCategory: "A",
    inputPath: join(FIXTURE_DIR, "A_disabled_population_sample.json"),
    outputPath: join(CLEAN_DIR, "A", "disabled_population.clean.json"),
    run: (records) => cleanDisabledPopulation(records as Parameters<typeof cleanDisabledPopulation>[0]),
  },
  {
    label: "B/school_basic",
    datasetCategory: "B",
    inputPath: join(FIXTURE_DIR, "B_school_basic_sample.json"),
    outputPath: join(CLEAN_DIR, "B", "school_basic.clean.json"),
    run: (records) => cleanSchoolBasic(records as Parameters<typeof cleanSchoolBasic>[0]),
  },
  {
    label: "B/support_center",
    datasetCategory: "B",
    inputPath: join(FIXTURE_DIR, "B_special_support_center_sample.json"),
    outputPath: join(CLEAN_DIR, "B", "support_center.clean.json"),
    run: (records) => cleanSupportCenter(records as Parameters<typeof cleanSupportCenter>[0]),
  },
];

// ─── clean 단계 실행 ──────────────────────────────────────────────────────
interface StageSummary {
  totalRecords: number;
  totalIssues: number;
  taskCount: number;
}

// 11-3 1차-19 — B/schools clean output 빌더 helper (narrow scope).
//   runRealCleanStage 안의 schools writer site에서 inline 객체 구성을 추출해
//   단위 테스트가 가능하게 한다. _meta.license를 source 직후에 노출 — G cleaner
//   산출물에는 license를 추가하지 않는다 (broad 미적용).
//   schoolsCleanResult.meta.license는 1차-2 source prefix 기반 자동 분기 결과
//   (`fixture:*` → `"demo-only"`, `real:*` → `"unknown"`)를 그대로 전파한다.
export function buildSchoolsCleanOutput(params: {
  records: unknown[];
  issues: DataQualityIssue[];
  source: "fixture:B-schools" | "real:schools-json";
  license: "demo-only" | "unknown";
  generatedAt: string;
}): CleanOutputFile {
  return {
    _meta: {
      source: params.source,
      license: params.license,
      datasetCategory: "B",
      stage: "clean",
      recordCount: params.records.length,
      issueCount: params.issues.length,
      generatedAt: params.generatedAt,
    },
    records: params.records,
    issues: params.issues,
  };
}

// 11-2 1차-13 — runCleanStage가 args를 받도록 변경.
// 11-2 1차-15 — real 모드는 buildCsvTasks 경로를 더 이상 사용하지 않고
// runRealCleanStage(KIKcd_B fixed-width pipeline)로 분기한다.
// - fixture 모드: JSON fixture 6개 + CSV fixture 2개 (buildCsvTasks) → data/clean/.
// - real 모드: KIKcd_B 1개 파일 → ingestKikcdB(admin + legalDong 동시 산출) →
//   cleanRegionCodes / cleanLegalDongCodes → data/clean.real/G/.
export function runCleanStage(
  args: Args = {
    mode: "fixture",
    stage: "clean",
    adminCodesPath: "",
    legalDongCodesPath: "",
    hjdCodesPath: "",
    mixCodesPath: "",
    schoolsPath: "",
    encoding: "",
  },
): StageSummary {
  if (args.mode === "real") {
    return runRealCleanStage(args);
  }
  return runFixtureCleanStage(args);
}

function runFixtureCleanStage(args: Args): StageSummary {
  let totalRecords = 0;
  let totalIssues = 0;
  const generatedAt = new Date().toISOString();

  // 1) JSON fixture 기반 cleaner 6개
  for (const task of TASKS) {
    const fixture = readJson<FixtureFile<unknown>>(task.inputPath);
    const result = task.run(fixture.records);

    const output: CleanOutputFile = {
      _meta: {
        source: "demo",
        datasetCategory: task.datasetCategory,
        stage: "clean",
        recordCount: result.records.length,
        issueCount: result.issues.length,
        generatedAt,
      },
      records: result.records,
      issues: result.issues,
    };

    writeJson(task.outputPath, output);
    console.log(
      `[clean:${task.label}] records=${result.records.length}, issues=${result.issues.length}`,
    );
    totalRecords += result.records.length;
    totalIssues += result.issues.length;
  }

  // 2) 11-2 1차-3 — CSV ingest + cleaner pipeline.
  //    fixture: data/fixtures/*.csv → data/clean/G/
  const csvTasks = buildCsvTasks(args);
  for (const task of csvTasks) {
    const result = runCsvCleanTask({
      label: task.label,
      datasetCategory: task.datasetCategory,
      csvPath: task.csvPath,
      outputPath: task.outputPath,
      ingest: task.ingest,
      clean: task.run,
      generatedAt,
    });
    console.log(
      `[clean:${task.label}] records=${result.recordCount}, issues=${result.issueCount}`,
    );
    totalRecords += result.recordCount;
    totalIssues += result.issueCount;
  }

  return {
    totalRecords,
    totalIssues,
    taskCount: TASKS.length + csvTasks.length,
  };
}

// ─── real 모드 KIKcd_B pipeline ─────────────────────────────────────────────
//
// 11-2 1차-15 — 행안부 KIKcd_B fixed-width 텍스트 1개 파일을 읽어 admin + legalDong
// clean 산출물을 동시에 생성한다.
//
// 흐름:
//   readBytes(adminCodesPath)         // KIKcd_B를 binary로 로드 (1차-13 호환: --admin-codes 사용)
//   → decodeCp949(bytes)              // CP949 → UTF-16 string (--encoding utf-8 옵션도 지원)
//   → ingestKikcdB({ text })          // 시군구 행 + 읍면동/리 행 분리
//   → cleanRegionCodes(adminRecords)        → data/clean.real/G/admin_codes.clean.json
//   → cleanLegalDongCodes(legalDongRecords) → data/clean.real/G/legal_dong_codes.clean.json
//
// CLI 정책 (1차-13 호환 + 1차-15 확장):
// - --admin-codes / --legal-dong-codes 둘 다 필수 (validateRealModeArgs가 강제).
// - 두 인자가 동일 KIKcd_B 경로를 가리키는 것이 권장 사용 — 1번만 읽고 ingest 1회.
// - 두 인자가 다른 경로를 가리키면 정보 로그만 출력 — 실제 ingest는 --admin-codes만 사용.
//   (1차-15에서는 KIKcd_B 외 real 입력 없음.)
// - --encoding 기본 cp949, utf-8도 지원. 그 외는 resolveRealModeEncoding이 throw.
//
// issue 분배 정책 (1차-15):
// - ingestKikcdB의 issues (말소·형식위반) → legalDong output에만 첨부.
//   KIKcd_B의 정체성이 "법정동코드 파일"이므로 legalDong이 가장 자연스러운 origin.
// - adminCleanResult.issues → admin output에만 첨부.
// - legalDongCleanResult.issues → legalDong output에만 첨부.
// - 중복 없음: 각 issue는 정확히 하나의 output에만 존재.
function runRealCleanStage(args: Args): StageSummary {
  const encoding = resolveRealModeEncoding(args);
  const generatedAt = new Date().toISOString();

  // 권장 사용: --admin-codes와 --legal-dong-codes는 같은 KIKcd_B 경로.
  // 다르면 사용자에게 알리고 --admin-codes만 사용.
  if (args.adminCodesPath !== args.legalDongCodesPath) {
    console.log(
      `[runEtl real] --admin-codes와 --legal-dong-codes 경로가 다릅니다. ` +
        `1차-15는 KIKcd_B 1개 파일만 처리하므로 --admin-codes 경로(${args.adminCodesPath})만 읽습니다.`,
    );
  }

  // 1) KIKcd_B를 binary로 읽어 디코드
  const bytes = readBytes(args.adminCodesPath);
  const text =
    encoding === "cp949"
      ? decodeCp949(bytes)
      : new TextDecoder("utf-8").decode(bytes);

  // 2) ingest — admin + legalDong 동시 산출
  const ingestResult = ingestKikcdB({ text, collectedAt: generatedAt });

  // 3) 각 record 묶음을 cleaner에 주입.
  //    KikcdBAdminRecord ↔ RawAdminCodeRecord, KikcdBLegalDongRecord ↔ RawLegalDongRecord는
  //    structural 호환 — Parameters<typeof ...>[0]로 좁혀 cast.
  const adminCleanResult = cleanRegionCodes(
    ingestResult.adminRecords as Parameters<typeof cleanRegionCodes>[0],
  );
  const legalDongCleanResult = cleanLegalDongCodes(
    ingestResult.legalDongRecords as Parameters<typeof cleanLegalDongCodes>[0],
  );

  // 4) admin 출력 — admin records + admin cleaner issues
  const adminOutput: CleanOutputFile = {
    _meta: {
      source: "real:kikcd-b",
      datasetCategory: "G",
      stage: "clean",
      recordCount: adminCleanResult.records.length,
      issueCount: adminCleanResult.issues.length,
      generatedAt,
    },
    records: adminCleanResult.records,
    issues: adminCleanResult.issues,
  };
  writeJson(join(CLEAN_REAL_DIR, "G", "admin_codes.clean.json"), adminOutput);
  console.log(
    `[real:clean:G/admin_codes] records=${adminCleanResult.records.length}, issues=${adminCleanResult.issues.length}`,
  );

  // 5) legalDong 출력 — legalDong records + ingest issues + legalDong cleaner issues
  //    ingest issues는 KIKcd_B 전체 파일에서 발생 (말소·형식위반). legalDong output에
  //    첨부하여 admin과 중복 없이 유일하게 유지.
  const legalDongIssues = [
    ...ingestResult.issues,
    ...legalDongCleanResult.issues,
  ];
  const legalDongOutput: CleanOutputFile = {
    _meta: {
      source: "real:kikcd-b",
      datasetCategory: "G",
      stage: "clean",
      recordCount: legalDongCleanResult.records.length,
      issueCount: legalDongIssues.length,
      generatedAt,
    },
    records: legalDongCleanResult.records,
    issues: legalDongIssues,
  };
  writeJson(
    join(CLEAN_REAL_DIR, "G", "legal_dong_codes.clean.json"),
    legalDongOutput,
  );
  console.log(
    `[real:clean:G/legal_dong_codes] records=${legalDongCleanResult.records.length}, issues=${legalDongIssues.length}`,
  );

  // 6) 11-2 1차-16 — KIKcd_H 행정동 처리 (optional, --hjd-codes 지정 시)
  //    KIKcd_B와 별도 파일 → 별도 read·decode·ingest.
  //    출력: data/clean.real/G/hjd_codes.clean.json
  //    issue 분배: ingestKikcdH issues + cleanHjdCodes issues 모두 hjd output에만 첨부.
  //
  //    11-2 1차-18 — KIKmix cross-ref validation을 위해 hjdCodeSet을 KIKcd_H if-block
  //    바깥에 선언하여 KIKmix 분기에서도 참조 가능하게 한다. --hjd-codes 미지정 시
  //    undefined로 유지되어 cross-ref에서 hjdCode 검증 skip + info issue 발행됨.
  let hjdRecordsCount = 0;
  let hjdIssuesCount = 0;
  let hjdTaskCount = 0;
  let hjdCodeSet: Set<string> | undefined = undefined;
  if (args.hjdCodesPath.length > 0) {
    const hjdBytes = readBytes(args.hjdCodesPath);
    const hjdText =
      encoding === "cp949"
        ? decodeCp949(hjdBytes)
        : new TextDecoder("utf-8").decode(hjdBytes);
    const hjdIngestResult = ingestKikcdH({
      text: hjdText,
      collectedAt: generatedAt,
    });
    const hjdCleanResult = cleanHjdCodes(hjdIngestResult.hjdRecords);
    const hjdAllIssues = [
      ...hjdIngestResult.issues,
      ...hjdCleanResult.issues,
    ];
    const hjdOutput: CleanOutputFile = {
      _meta: {
        source: "real:kikcd-h",
        datasetCategory: "G",
        stage: "clean",
        recordCount: hjdCleanResult.records.length,
        issueCount: hjdAllIssues.length,
        generatedAt,
      },
      records: hjdCleanResult.records,
      issues: hjdAllIssues,
    };
    writeJson(join(CLEAN_REAL_DIR, "G", "hjd_codes.clean.json"), hjdOutput);
    console.log(
      `[real:clean:G/hjd_codes] records=${hjdCleanResult.records.length}, issues=${hjdAllIssues.length}`,
    );
    hjdRecordsCount = hjdCleanResult.records.length;
    hjdIssuesCount = hjdAllIssues.length;
    hjdTaskCount = 1;

    // 11-2 1차-18 — cross-ref validation을 위한 hjdCodeSet 구성.
    //   cleanResult.records 기준 (사용자 합의값 §1-3) — raw ingest records가 아닌
    //   최종 clean.real 산출물에 존재하는 코드만 valid로 간주.
    hjdCodeSet = new Set(hjdCleanResult.records.map((r) => r.regionCode));
  }

  // 7) 11-2 1차-17 — KIKmix 행정동↔법정동 매핑 처리 (optional, --mix-codes 지정 시)
  //    KIKcd_B / KIKcd_H와 별도 파일 → 별도 read·decode·ingest.
  //    출력: data/clean.real/G/hjd_legal_dong_mapping.clean.json
  //    issue 분배: ingestKikmix issues + cleanKikmix issues + crossRef issues (1차-18) 모두
  //    mapping output에만 첨부. admin / legalDong / hjd output에는 섞이지 않음.
  //
  //    11-2 1차-18 — KIKmix cross-file validation (in-memory):
  //    - legalDongCodeSet: 항상 legalDongCleanResult.records 기준 (KIKcd_B 필수 처리)
  //    - hjdCodeSet: --hjd-codes 지정 시 hjdCleanResult.records 기준, 그 외 undefined
  //    - 디스크 산출물 재load X — 동일 ETL 호출 안의 메모리 데이터만 사용.
  //    - cleanResult.records 기준 (사용자 합의값 §1-3) — 최종 clean.real 산출물 기준.
  let mixRecordsCount = 0;
  let mixIssuesCount = 0;
  let mixTaskCount = 0;
  if (args.mixCodesPath.length > 0) {
    const mixBytes = readBytes(args.mixCodesPath);
    const mixText =
      encoding === "cp949"
        ? decodeCp949(mixBytes)
        : new TextDecoder("utf-8").decode(mixBytes);
    const mixIngestResult = ingestKikmix({
      text: mixText,
      collectedAt: generatedAt,
    });
    const mixCleanResult = cleanKikmix(mixIngestResult.mappingRecords);

    // 11-2 1차-18 — cross-ref validation 호출.
    //   legalDongCodeSet은 항상 cleanResult.records 기준으로 구성 (KIKcd_B 필수).
    //   hjdCodeSet은 위 KIKcd_H 분기에서 채워진 값 (--hjd-codes 미지정 시 undefined).
    //
    // 11-2 1차-19 — adminCodeSet 추가:
    //   KIKmix의 시군구 단위 legalDongCode(`?????00000`)가 KIKcd_B legalDongRecords에는
    //   부재해도(시군구 행은 1차-15 정책상 admin records로만 산출) admin records에는 존재.
    //   validateCrossRefKikmix가 adminCodeSet으로 fallback 검증하여 silent 처리.
    //   `adminCleanResult`는 KIKcd_B 처리 후 항상 메모리 보유 → 그대로 참조.
    const legalDongCodeSet = new Set(
      legalDongCleanResult.records.map((r) => r.regionCode),
    );
    const adminCodeSet = new Set(
      adminCleanResult.records.map((r) => r.regionCode),
    );
    const crossRefResult = validateCrossRefKikmix({
      mappingRecords: mixCleanResult.records,
      hjdCodeSet,
      legalDongCodeSet,
      adminCodeSet,
    });

    const mixAllIssues = [
      ...mixIngestResult.issues,
      ...mixCleanResult.issues,
      ...crossRefResult.issues,
    ];
    const mixOutput: CleanOutputFile = {
      _meta: {
        source: "real:kikmix",
        datasetCategory: "G",
        stage: "clean",
        recordCount: mixCleanResult.records.length,
        issueCount: mixAllIssues.length,
        generatedAt,
      },
      records: mixCleanResult.records,
      issues: mixAllIssues,
    };
    writeJson(
      join(CLEAN_REAL_DIR, "G", "hjd_legal_dong_mapping.clean.json"),
      mixOutput,
    );
    console.log(
      `[real:clean:G/hjd_legal_dong_mapping] records=${mixCleanResult.records.length}, issues=${mixAllIssues.length}`,
    );
    mixRecordsCount = mixCleanResult.records.length;
    mixIssuesCount = mixAllIssues.length;
    mixTaskCount = 1;
  }

  // 8) 11-3 1차-2 — B 학교 기본 정보 JSON 처리 (optional, --schools 지정 시)
  //    KIKcd_B / KIKcd_H / KIKmix와 별도 파일 → 별도 read·ingest·clean.
  //    출력: data/clean.real/B/schools.clean.json
  //
  //    source 라벨 자동 추론 (사용자 합의값 §1-2):
  //      - schoolsPath가 `data/fixtures/`로 시작 → "fixture:B-schools" (mini fixture proxy)
  //      - 그 외 경로 → "real:schools-json" (사용자 수동 다운로드 raw 등)
  //    Windows 경로 구분자(`\`)를 `/`로 normalize 후 startsWith 검사.
  //
  //    license는 ingestSchools가 source prefix(`real:` 또는 그 외)로 자동 분기 — runEtl은 관여 X.
  //    issue 분배: ingestSchools issues + cleanSchools issues 모두 schools output에만 첨부.
  //    admin / legalDong / hjd / mapping output에는 섞이지 않음.
  //
  //    cleanSchools 본 정규화(trim/dedup/enum/좌표 범위)·G lookup은 1차-3 이후로 보류.
  let schoolsRecordsCount = 0;
  let schoolsIssuesCount = 0;
  let schoolsTaskCount = 0;
  if (args.schoolsPath.length > 0) {
    const normalizedSchoolsPath = args.schoolsPath.replace(/\\/g, "/");
    const schoolsSource: "fixture:B-schools" | "real:schools-json" =
      normalizedSchoolsPath.startsWith("data/fixtures/")
        ? "fixture:B-schools"
        : "real:schools-json";

    const schoolsText = readText(args.schoolsPath);
    const schoolsIngestResult = ingestSchools({
      text: schoolsText,
      source: schoolsSource,
      format: "json",
      collectedAt: generatedAt,
    });
    const schoolsCleanResult = cleanSchools({
      schoolRecords: schoolsIngestResult.schoolRecords,
      meta: schoolsIngestResult.meta,
    });
    const schoolsAllIssues = [
      ...schoolsIngestResult.issues,
      ...schoolsCleanResult.issues,
    ];
    // 11-3 1차-19 — inline 객체 구성을 buildSchoolsCleanOutput helper로 추출.
    //   _meta.license는 schoolsCleanResult.meta.license를 그대로 전파한다 (narrow scope —
    //   B/schools 산출물에만 노출, G admin/legalDong/hjd/mix는 변경 없음).
    const schoolsOutput = buildSchoolsCleanOutput({
      records: schoolsCleanResult.records,
      issues: schoolsAllIssues,
      source: schoolsSource,
      license: schoolsCleanResult.meta.license,
      generatedAt,
    });
    writeJson(join(CLEAN_REAL_DIR, "B", "schools.clean.json"), schoolsOutput);
    console.log(
      `[real:clean:B/schools] records=${schoolsCleanResult.records.length}, issues=${schoolsAllIssues.length}`,
    );
    schoolsRecordsCount = schoolsCleanResult.records.length;
    schoolsIssuesCount = schoolsAllIssues.length;
    schoolsTaskCount = 1;
  }

  return {
    totalRecords:
      adminCleanResult.records.length +
      legalDongCleanResult.records.length +
      hjdRecordsCount +
      mixRecordsCount +
      schoolsRecordsCount,
    totalIssues:
      adminCleanResult.issues.length +
      legalDongIssues.length +
      hjdIssuesCount +
      mixIssuesCount +
      schoolsIssuesCount,
    taskCount: 2 + hjdTaskCount + mixTaskCount + schoolsTaskCount,
  };
}

// ─── master 단계 실행 ──────────────────────────────────────────────────────
//
// clean 산출물 8개를 입력으로 buildMaster를 호출하고 6개 master JSON을 작성한다.
// (11-2 1차-4: legal_dong_codes.clean.json + legal_dong_master.json 추가.)
// (11-2 1차-5: admin_codes.clean.json + admin_code_master.json 추가.)
// clean 산출물 부재 시 명시적 에러로 종료 (자동 clean 실행 안 함).
// issue 분리는 datasetCategory + field + message 기반 — school·supportCenter는
// 둘 다 "B" 카테고리라 정밀 분리가 필요하다. G는 3-way 분리:
// - legalDong issue: message에 "legalDong" 키워드 포함 → legal_dong_master.json
// - adminCode issue: message에 "adminCode" 키워드 포함 → admin_code_master.json
// - 그 외 G issue (geocoding 매칭 실패 등) → region_master.json
const MASTER_INPUT_FILES = [
  join(CLEAN_DIR, "G", "region_codes.clean.json"),
  join(CLEAN_DIR, "G", "geocoding.clean.json"),
  join(CLEAN_DIR, "A", "special_education.clean.json"),
  join(CLEAN_DIR, "A", "disabled_population.clean.json"),
  join(CLEAN_DIR, "B", "school_basic.clean.json"),
  join(CLEAN_DIR, "B", "support_center.clean.json"),
  // 11-2 1차-4 신규 — legalDong dimension master 입력
  join(CLEAN_DIR, "G", "legal_dong_codes.clean.json"),
  // 11-2 1차-5 신규 — adminCode dimension master 입력
  join(CLEAN_DIR, "G", "admin_codes.clean.json"),
] as const;

interface MasterStageSummary {
  regionCount: number;
  demandCount: number;
  schoolCount: number;
  supportCenterCount: number;
  legalDongCount: number;
  adminCodeCount: number;
  crossrefCount: number;
  totalIssues: number;
}

interface MasterOutputFile<TRecord> {
  _meta: {
    // 11-3 1차-23 — `"real:B-schools-master"` 추가 (B school master.real 산출물).
    // 11-3 1차-34 — `"real:B-support-center-master"` 추가 (B-4 supportCenter master.real).
    // 11-3 1차-36 — `"real:A-demand-master"` 추가 (A demand master.real 산출물).
    source:
      | "demo:fixture-etl"
      | "real:B-schools-master"
      | "real:B-support-center-master"
      | "real:A-demand-master";
    stage: "master";
    datasetCategory: "G" | "A" | "B";
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: TRecord[];
  issues: DataQualityIssue[];
}

export function runMasterStage(): MasterStageSummary {
  // 1. clean 산출물 부재 검증
  for (const path of MASTER_INPUT_FILES) {
    if (!existsSync(path)) {
      throw new Error(
        `clean input not found: ${path}. Run 'npm run etl:fixture' first to generate clean outputs.`,
      );
    }
  }

  // 2. 7개 clean 산출물 로드 (records 배열만 추출)
  const regionCodeRecords = readJson<{ records: CleanedRegionCodeRecord[] }>(
    MASTER_INPUT_FILES[0],
  ).records;
  const geocodingRecords = readJson<{ records: CleanedGeocodingRecord[] }>(
    MASTER_INPUT_FILES[1],
  ).records;
  const specialEducationRecords = readJson<{
    records: CleanedSpecialEducationRecord[];
  }>(MASTER_INPUT_FILES[2]).records;
  const disabledPopulationRecords = readJson<{
    records: CleanedDisabledPopulationRecord[];
  }>(MASTER_INPUT_FILES[3]).records;
  const schoolBasicRecords = readJson<{
    records: CleanedSchoolBasicRecord[];
  }>(MASTER_INPUT_FILES[4]).records;
  const supportCenterRecords = readJson<{
    records: CleanedSupportCenterRecord[];
  }>(MASTER_INPUT_FILES[5]).records;
  // 11-2 1차-4 — legalDong dimension master 입력
  const legalDongCodeRecords = readJson<{
    records: CleanedLegalDongRecord[];
  }>(MASTER_INPUT_FILES[6]).records;
  // 11-2 1차-5 — adminCode dimension master 입력
  const adminCodeRecords = readJson<{
    records: CleanedRegionCodeRecord[];
  }>(MASTER_INPUT_FILES[7]).records;

  // 3. buildMaster 호출 (pure)
  const result = buildMaster({
    regionCodeRecords,
    geocodingRecords,
    specialEducationRecords,
    disabledPopulationRecords,
    schoolBasicRecords,
    supportCenterRecords,
    legalDongCodeRecords,
    adminCodeRecords,
  });

  // 4. issue 파일별 분리
  // - A는 datasetCategory만으로 분리.
  // - G는 4-way 분리 (region / legalDong / adminCode / crossref):
  //   * legalDong issue: datasetCategory==="G" && field==="sigunguCode" &&
  //     message가 "legalDong" 키워드 포함 → legal_dong_master.json
  //   * adminCode issue: datasetCategory==="G" && field==="sigunguCode" &&
  //     message가 "adminCode" 키워드 포함 → admin_code_master.json
  //   * crossref issue: datasetCategory==="G" && field==="crossref"
  //     → admin_legal_dong_crossref.json  (11-2 1차-7 신규)
  //   * 그 외 G issue (예: regionCode 형식 위반, geocoding 매칭 실패) → region_master.json
  // - B는 school과 supportCenter가 같은 카테고리라 field + message 기반 정밀 분리:
  //   * schoolName 필드 → school
  //   * institutionName 필드 → supportCenter
  //   * regionCode 필드 → buildMaster의 message에 'school' 또는 'supportCenter' 포함 여부로 분류
  // - 어떤 분류에도 매칭되지 않는 B issue가 발생하면 unclassifiedB로 두 master 파일에 모두
  //   포함시켜 누락을 방지 (현재 buildMaster.ts 메시지 기준 발생 가능성 0).
  function isLegalDongIssue(issue: DataQualityIssue): boolean {
    return (
      issue.datasetCategory === "G" &&
      issue.field === "sigunguCode" &&
      issue.message.includes("legalDong")
    );
  }
  function isAdminCodeIssue(issue: DataQualityIssue): boolean {
    return (
      issue.datasetCategory === "G" &&
      issue.field === "sigunguCode" &&
      issue.message.includes("adminCode")
    );
  }
  function isCrossrefIssue(issue: DataQualityIssue): boolean {
    return issue.datasetCategory === "G" && issue.field === "crossref";
  }
  const legalDongIssues = result.issues.filter(isLegalDongIssue);
  const adminCodeIssues = result.issues.filter(isAdminCodeIssue);
  const crossrefIssues = result.issues.filter(isCrossrefIssue);
  const gIssues = result.issues.filter(
    (i) =>
      i.datasetCategory === "G" &&
      !isLegalDongIssue(i) &&
      !isAdminCodeIssue(i) &&
      !isCrossrefIssue(i),
  );
  const aIssues = result.issues.filter((i) => i.datasetCategory === "A");

  function classifyB(issue: DataQualityIssue): "school" | "supportCenter" | "unknown" {
    if (issue.datasetCategory !== "B") return "unknown";
    if (issue.field === "schoolName") return "school";
    if (issue.field === "institutionName") return "supportCenter";
    if (issue.field === "regionCode") {
      const msg = issue.message;
      if (msg.includes("supportCenter")) return "supportCenter";
      if (msg.includes("school")) return "school";
    }
    return "unknown";
  }

  const schoolIssues: DataQualityIssue[] = [];
  const supportCenterIssues: DataQualityIssue[] = [];
  for (const issue of result.issues) {
    const cls = classifyB(issue);
    if (cls === "school") schoolIssues.push(issue);
    else if (cls === "supportCenter") supportCenterIssues.push(issue);
    else if (issue.datasetCategory === "B") {
      // unclassified B issue — 양쪽에 모두 포함해 누락 방지
      schoolIssues.push(issue);
      supportCenterIssues.push(issue);
    }
  }

  // 5. 4개 master 파일 작성
  const generatedAt = new Date().toISOString();

  const regionFile: MasterOutputFile<MasterRegionRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "G",
      recordCount: result.regionMaster.length,
      issueCount: gIssues.length,
      generatedAt,
    },
    records: result.regionMaster,
    issues: gIssues,
  };
  writeJson(join(MASTER_DIR, "region_master.json"), regionFile);

  const demandFile: MasterOutputFile<MasterDemandRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "A",
      recordCount: result.demandMaster.length,
      issueCount: aIssues.length,
      generatedAt,
    },
    records: result.demandMaster,
    issues: aIssues,
  };
  writeJson(join(MASTER_DIR, "demand_master.json"), demandFile);

  const schoolFile: MasterOutputFile<MasterSchoolRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "B",
      recordCount: result.schoolMaster.length,
      issueCount: schoolIssues.length,
      generatedAt,
    },
    records: result.schoolMaster,
    issues: schoolIssues,
  };
  writeJson(join(MASTER_DIR, "school_master.json"), schoolFile);

  const supportCenterFile: MasterOutputFile<MasterSupportCenterRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "B",
      recordCount: result.supportCenterMaster.length,
      issueCount: supportCenterIssues.length,
      generatedAt,
    },
    records: result.supportCenterMaster,
    issues: supportCenterIssues,
  };
  writeJson(join(MASTER_DIR, "support_center_master.json"), supportCenterFile);

  // 11-2 1차-4 — legalDong dimension master (G, region_master와 별도 파일)
  const legalDongFile: MasterOutputFile<MasterLegalDongRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "G",
      recordCount: result.legalDongMaster.length,
      issueCount: legalDongIssues.length,
      generatedAt,
    },
    records: result.legalDongMaster,
    issues: legalDongIssues,
  };
  writeJson(join(MASTER_DIR, "legal_dong_master.json"), legalDongFile);

  // 11-2 1차-5 — adminCode dimension master (G, region_master와 별도 파일)
  const adminCodeFile: MasterOutputFile<MasterAdminCodeRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "G",
      recordCount: result.adminCodeMaster.length,
      issueCount: adminCodeIssues.length,
      generatedAt,
    },
    records: result.adminCodeMaster,
    issues: adminCodeIssues,
  };
  writeJson(join(MASTER_DIR, "admin_code_master.json"), adminCodeFile);

  // 11-2 1차-7 — admin × legalDong cross-reference (G, derived quality artifact)
  const crossrefFile: MasterOutputFile<MasterAdminLegalDongCrossrefRecord> = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "master",
      datasetCategory: "G",
      recordCount: result.adminLegalDongCrossref.length,
      issueCount: crossrefIssues.length,
      generatedAt,
    },
    records: result.adminLegalDongCrossref,
    issues: crossrefIssues,
  };
  writeJson(join(MASTER_DIR, "admin_legal_dong_crossref.json"), crossrefFile);

  console.log(
    `[master:region]        records=${result.regionMaster.length}, issues=${gIssues.length}`,
  );
  console.log(
    `[master:demand]        records=${result.demandMaster.length}, issues=${aIssues.length}`,
  );
  console.log(
    `[master:school]        records=${result.schoolMaster.length}, issues=${schoolIssues.length}`,
  );
  console.log(
    `[master:supportCenter] records=${result.supportCenterMaster.length}, issues=${supportCenterIssues.length}`,
  );
  console.log(
    `[master:legalDong]     records=${result.legalDongMaster.length}, issues=${legalDongIssues.length}`,
  );
  console.log(
    `[master:adminCode]     records=${result.adminCodeMaster.length}, issues=${adminCodeIssues.length}`,
  );
  console.log(
    `[master:crossref]      records=${result.adminLegalDongCrossref.length}, issues=${crossrefIssues.length}`,
  );

  return {
    regionCount: result.regionMaster.length,
    demandCount: result.demandMaster.length,
    schoolCount: result.schoolMaster.length,
    supportCenterCount: result.supportCenterMaster.length,
    legalDongCount: result.legalDongMaster.length,
    adminCodeCount: result.adminCodeMaster.length,
    crossrefCount: result.adminLegalDongCrossref.length,
    totalIssues: result.issues.length,
  };
}

// ─── 11-3 1차-23·1차-34·1차-36 — real 모드 master 단계 실행 ─────────────────
//
// 1차-23: B school master.real 산출 (schools + G admin lookup).
// 1차-34: B-4 supportCenter master.real 산출 (repo fixture proxy 사용)을 동일 stage에 통합.
// 1차-36: A demand master.real 산출 (repo fixture proxy 사용)을 동일 stage에 통합 —
//         Block C field +2 (specialEducationStudentCount / registeredDisabledCount).
//
// 입력:
//   - data/clean.real/B/schools.clean.json (1차-2 schools clean)
//   - data/clean.real/G/admin_codes.clean.json (1차-15 G clean)
//   - data/fixtures/B_special_support_center_sample.json (1차-34, repo fixture proxy)
//   - data/fixtures/A_special_education_sample.json (1차-36, repo fixture proxy)
//   - data/fixtures/A_disabled_population_sample.json (1차-36, repo fixture proxy)
// 출력:
//   - data/master.real/B/school_master.json (1차-23)
//   - data/master.real/B/support_center_master.json (1차-34)
//   - data/master.real/A/demand_master.json (1차-36 신규)
// 정책:
//   - school: buildSchoolMasterReal가 (sidoName + sigunguName) → regionCode join.
//   - supportCenter: fixture가 KOSTAT regionCode pre-baked → cleanSupportCenter →
//     buildSupportCenterMasterReal로 admin_codes set 검증.
//   - demand: A fixtures가 KOSTAT regionCode pre-baked → cleanSpecialEducation /
//     cleanDisabledPopulation → buildDemandMasterReal로 admin_codes set 검증 + outer join.
//   - 매칭 실패 record는 master records에서 제외 + warning issue.
//   - MasterSchoolRecord / MasterSupportCenterRecord / MasterDemandRecord schema 무변경.
//   - _meta.source: "real:B-schools-master" / "real:B-support-center-master" /
//                   "real:A-demand-master".
//   - 새 stage entry / npm script 추가 0건 — `--stage master` 확장.
export interface RealMasterStageSummary {
  recordCount: number;
  issueCount: number;
  /** 1차-34 신규 — supportCenter master.real 산출 결과 분리 보고. */
  supportCenterRecordCount: number;
  supportCenterIssueCount: number;
  /** 1차-36 신규 — A demand master.real 산출 결과 분리 보고. */
  demandRecordCount: number;
  demandIssueCount: number;
}

const SUPPORT_CENTER_FIXTURE_PATH = join(
  FIXTURE_DIR,
  "B_special_support_center_sample.json",
);

// 11-3 1차-36 — A demand 도메인 repo fixture proxy 경로 (1차-34 supportCenter 패턴 일관).
const SPECIAL_EDUCATION_FIXTURE_PATH = join(
  FIXTURE_DIR,
  "A_special_education_sample.json",
);
const DISABLED_POPULATION_FIXTURE_PATH = join(
  FIXTURE_DIR,
  "A_disabled_population_sample.json",
);

export function runRealMasterStage(): RealMasterStageSummary {
  const schoolsPath = join(CLEAN_REAL_DIR, "B", "schools.clean.json");
  const adminPath = join(CLEAN_REAL_DIR, "G", "admin_codes.clean.json");

  if (!existsSync(schoolsPath)) {
    throw new Error(
      `[runEtl real master] 입력 파일이 존재하지 않습니다: ${schoolsPath}. 먼저 'npm run etl:real:clean -- --schools <path> --admin-codes <path> --legal-dong-codes <path>'로 B/schools clean 산출물을 생성하세요.`,
    );
  }
  if (!existsSync(adminPath)) {
    throw new Error(
      `[runEtl real master] 입력 파일이 존재하지 않습니다: ${adminPath}. 먼저 'npm run etl:real:clean -- --admin-codes <path> --legal-dong-codes <path>'로 G/admin_codes clean 산출물을 생성하세요.`,
    );
  }
  if (!existsSync(SUPPORT_CENTER_FIXTURE_PATH)) {
    throw new Error(
      `[runEtl real master] B-4 supportCenter fixture 부재: ${SUPPORT_CENTER_FIXTURE_PATH}. data/fixtures/B_special_support_center_sample.json은 repo에 commit되어 있어야 합니다.`,
    );
  }
  // 11-3 1차-36 — A demand 도메인 fixture proxy 검증 (1차-34 supportCenter 패턴 일관).
  if (!existsSync(SPECIAL_EDUCATION_FIXTURE_PATH)) {
    throw new Error(
      `[runEtl real master] A special_education fixture 부재: ${SPECIAL_EDUCATION_FIXTURE_PATH}. data/fixtures/A_special_education_sample.json은 repo에 commit되어 있어야 합니다.`,
    );
  }
  if (!existsSync(DISABLED_POPULATION_FIXTURE_PATH)) {
    throw new Error(
      `[runEtl real master] A disabled_population fixture 부재: ${DISABLED_POPULATION_FIXTURE_PATH}. data/fixtures/A_disabled_population_sample.json은 repo에 commit되어 있어야 합니다.`,
    );
  }

  const schoolsFile = readJson<{
    _meta?: { source?: string };
    records: CleanedSchoolForMaster[];
  }>(schoolsPath);
  const adminFile = readJson<{ records: CleanedRegionCodeRecord[] }>(adminPath);

  // 11-3 1차-125 — NEIS clean output에 한해 address에서 sigunguName 파생.
  // 정책: clean schools `_meta.source`가 `real:neis-*` 패턴일 때만 적용.
  // fixture (`fixture:*`) / `real:schools-json` / 그 외 source는 미적용 — 회귀 표면 0.
  // NEIS는 sigunguName 필드 자체가 부재이므로 buildSchoolMasterReal의 sidoName+sigunguName
  // lookup이 100% 실패함을 방지. 단방향 5단계 원칙(§4) 준수 — 단일 record 다른 field
  // 파생이며 cross-source join은 master 단계가 계속 책임.
  const schoolsSource = schoolsFile._meta?.source ?? "";
  const isNeisSource = schoolsSource.startsWith("real:neis-");
  let schoolsForMaster: CleanedSchoolForMaster[] = schoolsFile.records;
  if (isNeisSource) {
    const derived = deriveSchoolSigunguFromAddress(schoolsFile.records);
    schoolsForMaster = derived.records;
    // 값 출력 0건 정책 — count만 (학교명/주소/code는 노출 0건).
    console.log(
      `[real:master:B/schools] NEIS sigunguName 파생 — total=${derived.summary.total} derived=${derived.summary.derivedCount} unchanged=${derived.summary.unchangedCount} unresolved=${derived.summary.unresolvedCount}`,
    );
  }

  // ── 1차-23 — B school master ───────────────────────────────────────────
  const schoolResult = buildSchoolMasterReal({
    schools: schoolsForMaster,
    adminCodes: adminFile.records,
  });

  const generatedAt = new Date().toISOString();
  const schoolOutput: MasterOutputFile<MasterSchoolRecord> = {
    _meta: {
      source: "real:B-schools-master",
      stage: "master",
      datasetCategory: "B",
      recordCount: schoolResult.records.length,
      issueCount: schoolResult.issues.length,
      generatedAt,
    },
    records: schoolResult.records,
    issues: schoolResult.issues,
  };
  writeJson(
    join(MASTER_REAL_DIR, "B", "school_master.json"),
    schoolOutput,
  );

  console.log(
    `[real:master:B/school] records=${schoolResult.records.length}, issues=${schoolResult.issues.length}`,
  );

  // ── 1차-34 — B-4 supportCenter master (repo fixture proxy 사용) ─────────
  // fixture는 raw SupportCenterInput shape (sourceId/institutionName/address/regionCode).
  // cleanSupportCenter → CleanedSupportCenterRecord[] → buildSupportCenterMasterReal로
  // admin_codes set 검증.
  const supportCenterFile = readJson<{
    records: Parameters<typeof cleanSupportCenter>[0];
  }>(SUPPORT_CENTER_FIXTURE_PATH);
  const cleanedSupportCenter = cleanSupportCenter(supportCenterFile.records);
  const supportCenterMasterResult = buildSupportCenterMasterReal({
    cleanedRecords: cleanedSupportCenter.records,
    adminCodes: adminFile.records,
  });
  // cleanSupportCenter issues + buildSupportCenterMasterReal issues 모두 첨부.
  const supportCenterAllIssues = [
    ...cleanedSupportCenter.issues,
    ...supportCenterMasterResult.issues,
  ];
  const supportCenterOutput: MasterOutputFile<MasterSupportCenterRecord> = {
    _meta: {
      source: "real:B-support-center-master",
      stage: "master",
      datasetCategory: "B",
      recordCount: supportCenterMasterResult.records.length,
      issueCount: supportCenterAllIssues.length,
      generatedAt,
    },
    records: supportCenterMasterResult.records,
    issues: supportCenterAllIssues,
  };
  writeJson(
    join(MASTER_REAL_DIR, "B", "support_center_master.json"),
    supportCenterOutput,
  );

  console.log(
    `[real:master:B/support_center] records=${supportCenterMasterResult.records.length}, issues=${supportCenterAllIssues.length}`,
  );

  // ── 1차-36 — A demand master (repo fixture proxy 사용) ──────────────────
  // fixture는 raw shape (regionCode/specialEducationStudentCount/year 등).
  // cleanSpecialEducation / cleanDisabledPopulation → CleanedRecord[] →
  // buildDemandMasterReal로 admin_codes set 검증 + outer join.
  const specialEducationFile = readJson<{
    records: Parameters<typeof cleanSpecialEducation>[0];
  }>(SPECIAL_EDUCATION_FIXTURE_PATH);
  const disabledPopulationFile = readJson<{
    records: Parameters<typeof cleanDisabledPopulation>[0];
  }>(DISABLED_POPULATION_FIXTURE_PATH);
  const cleanedSpecialEducation = cleanSpecialEducation(
    specialEducationFile.records,
  );
  const cleanedDisabledPopulation = cleanDisabledPopulation(
    disabledPopulationFile.records,
  );
  const demandMasterResult = buildDemandMasterReal({
    specialEducation: cleanedSpecialEducation.records,
    disabledPopulation: cleanedDisabledPopulation.records,
    adminCodes: adminFile.records,
  });
  // cleanSpecialEducation / cleanDisabledPopulation issues + buildDemandMasterReal issues 모두 첨부.
  const demandAllIssues = [
    ...cleanedSpecialEducation.issues,
    ...cleanedDisabledPopulation.issues,
    ...demandMasterResult.issues,
  ];
  const demandOutput: MasterOutputFile<MasterDemandRecord> = {
    _meta: {
      source: "real:A-demand-master",
      stage: "master",
      datasetCategory: "A",
      recordCount: demandMasterResult.records.length,
      issueCount: demandAllIssues.length,
      generatedAt,
    },
    records: demandMasterResult.records,
    issues: demandAllIssues,
  };
  writeJson(
    join(MASTER_REAL_DIR, "A", "demand_master.json"),
    demandOutput,
  );

  console.log(
    `[real:master:A/demand] records=${demandMasterResult.records.length}, issues=${demandAllIssues.length}`,
  );

  return {
    recordCount: schoolResult.records.length,
    issueCount: schoolResult.issues.length,
    supportCenterRecordCount: supportCenterMasterResult.records.length,
    supportCenterIssueCount: supportCenterAllIssues.length,
    demandRecordCount: demandMasterResult.records.length,
    demandIssueCount: demandAllIssues.length,
  };
}

// ─── 11-3 1차-30 — real 모드 B region_summary mart 단계 실행 ──────────────
//
// 입력: data/clean.real/G/admin_codes.clean.json + data/master.real/B/school_master.json
// 출력: data/mart.real/B/region_summary.mart.json
// 정책: buildRegionSummaryMartReal이 admin_codes → regionMaster 변환 + 기존
//       buildRegionSummaryMart 호출. demand/supportCenter는 빈 배열.
//       _meta.source = "real:B-region-summary-mart" (1차-23 master.real source 라벨과
//       의미 영역 분리 — region summary mart는 1차-30 신규 산출물).
export interface RealMartStageSummary {
  recordCount: number;
  issueCount: number;
}

interface MartRealOutputFile {
  _meta: {
    source: "real:B-region-summary-mart";
    stage: "mart";
    datasetCategory: "region-summary";
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: MartRegionSummaryRecord[];
  issues: DataQualityIssue[];
}

export function runRealMartStage(): RealMartStageSummary {
  const adminPath = join(CLEAN_REAL_DIR, "G", "admin_codes.clean.json");
  const schoolMasterPath = join(
    MASTER_REAL_DIR,
    "B",
    "school_master.json",
  );
  // 11-3 1차-34 신규 — supportCenter master.real (1차-34 stage master 산출).
  // 부재 시 빈 배열 fallback (1차-30 동작 유지, 사용자 합의값 §5).
  const supportCenterMasterPath = join(
    MASTER_REAL_DIR,
    "B",
    "support_center_master.json",
  );
  // 11-3 1차-36 신규 — A demand master.real (1차-36 stage master 산출).
  // 부재 시 빈 배열 fallback (1차-30 / 1차-34 동작 유지). 1차-34 supportCenter 패턴과 일관.
  const demandMasterPath = join(
    MASTER_REAL_DIR,
    "A",
    "demand_master.json",
  );

  if (!existsSync(adminPath)) {
    throw new Error(
      `[runEtl real mart] 입력 파일이 존재하지 않습니다: ${adminPath}. 먼저 'npm run etl:real:clean -- --admin-codes <path> --legal-dong-codes <path>'로 G/admin_codes clean 산출물을 생성하세요.`,
    );
  }
  if (!existsSync(schoolMasterPath)) {
    throw new Error(
      `[runEtl real mart] 입력 파일이 존재하지 않습니다: ${schoolMasterPath}. 먼저 'tsx scripts/etl/runEtl.ts --mode real --stage master'로 B/school_master 산출물을 생성하세요.`,
    );
  }

  const adminFile = readJson<{ records: CleanedRegionCodeRecord[] }>(adminPath);
  const schoolMasterFile = readJson<{ records: MasterSchoolRecord[] }>(
    schoolMasterPath,
  );

  // 11-3 1차-34 — supportCenter master.real을 optional input으로 로드. 부재 시 빈 배열
  // fallback (사용자 합의값 §5 — "support_center_master.json 부재 시 빈 배열 fallback").
  // 1차-30 mart.real 동작을 그대로 유지하면서 1차-34 산출물이 있으면 supportCenterCount 보강.
  const supportCenterMaster: MasterSupportCenterRecord[] = existsSync(
    supportCenterMasterPath,
  )
    ? readJson<{ records: MasterSupportCenterRecord[] }>(
        supportCenterMasterPath,
      ).records
    : [];

  // 11-3 1차-36 — A demand master.real을 optional input으로 로드. 부재 시 빈 배열 fallback.
  // 1차-30 / 1차-34 동작을 그대로 유지하면서 1차-36 산출물이 있으면 region_summary의
  // specialEducationStudentCount / registeredDisabledCount를 보강 (Block C field +2).
  const demandMaster: MasterDemandRecord[] = existsSync(demandMasterPath)
    ? readJson<{ records: MasterDemandRecord[] }>(demandMasterPath).records
    : [];

  const result = buildRegionSummaryMartReal({
    adminCodes: adminFile.records,
    schoolMaster: schoolMasterFile.records,
    supportCenterMaster,
    demandMaster,
  });

  const generatedAt = new Date().toISOString();
  const output: MartRealOutputFile = {
    _meta: {
      source: "real:B-region-summary-mart",
      stage: "mart",
      datasetCategory: "region-summary",
      recordCount: result.records.length,
      issueCount: result.issues.length,
      generatedAt,
    },
    records: result.records,
    issues: result.issues,
  };
  writeJson(
    join(MART_REAL_DIR, "B", "region_summary.mart.json"),
    output,
  );

  console.log(
    `[real:mart:B/region_summary] records=${result.records.length}, issues=${result.issues.length}`,
  );

  return {
    recordCount: result.records.length,
    issueCount: result.issues.length,
  };
}

// ─── 11-3 1차-38 — real 모드 B transition_index indicator 단계 실행 ──────────
//
// 입력:
//   - data/mart.real/B/region_summary.mart.json (1차-30 mart.real 산출)
//   - data/master.real/B/school_master.json (1차-23 master.real 산출)
//   - data/master.real/B/support_center_master.json (1차-34 master.real 산출)
// 출력:
//   - data/indicator.real/B/transition_index.real.json (`_meta.source = "real:B-transition-index"`)
// 정책:
//   - 기존 `buildIndicatorOutput` pure builder 재사용 — wrapper 신규 0건, 산식 무수정.
//   - mart.real region_summary는 1차-36 A demand가 이미 반영되어 있음 →
//     buildIndicatorOutput이 mart record의 specialEducationStudentCount /
//     registeredDisabledCount를 활용해 demandIndex 산출. 별도 demand_master 직접 입력
//     받지 않음 (사용자 합의값 §2).
//   - indicatorVersion = "mvp-v1" (buildIndicatorOutput의 INDICATOR_VERSION 그대로).
//   - C/D/E/F 도메인 미도입 → trainingSupplyIndex / employmentIndex / welfareIndex /
//     accessibilityIndex 모두 0 근접 산출 (fixture와 동일 정책).
//   - 새 stage entry / npm script 추가 0건 — `--stage indicator` 확장.
//   - data/indicator.real/는 .gitignore 보호 (1차-24 / 1차-30 패턴 일관).
//   - frontend src/* 무수정 — 본 단계는 산출 인프라만, etlAdapter 소비는 1차-40+ 별도.
export interface RealIndicatorStageSummary {
  recordCount: number;
  issueCount: number;
}

interface IndicatorRealOutputFile {
  _meta: {
    source: "real:B-transition-index";
    stage: "indicator";
    indicatorVersion: "mvp-v1";
    recordCount: number;
    issueCount: number;
    generatedAt: string;
    baseYear: typeof INDICATOR_BASE_YEAR;
    calculatedAt: typeof INDICATOR_CALCULATED_AT;
  };
  records: TransitionIndex[];
  issues: DataQualityIssue[];
}

export function runRealIndicatorStage(): RealIndicatorStageSummary {
  const martPath = join(MART_REAL_DIR, "B", "region_summary.mart.json");
  const schoolMasterPath = join(MASTER_REAL_DIR, "B", "school_master.json");
  const supportCenterMasterPath = join(
    MASTER_REAL_DIR,
    "B",
    "support_center_master.json",
  );

  if (!existsSync(martPath)) {
    throw new Error(
      `[runEtl real indicator] 입력 파일이 존재하지 않습니다: ${martPath}. 먼저 'tsx scripts/etl/runEtl.ts --mode real --stage mart'로 B/region_summary mart.real 산출물을 생성하세요.`,
    );
  }
  if (!existsSync(schoolMasterPath)) {
    throw new Error(
      `[runEtl real indicator] 입력 파일이 존재하지 않습니다: ${schoolMasterPath}. 먼저 'tsx scripts/etl/runEtl.ts --mode real --stage master'로 B/school_master 산출물을 생성하세요.`,
    );
  }
  if (!existsSync(supportCenterMasterPath)) {
    throw new Error(
      `[runEtl real indicator] 입력 파일이 존재하지 않습니다: ${supportCenterMasterPath}. 먼저 'tsx scripts/etl/runEtl.ts --mode real --stage master'로 B/support_center_master 산출물을 생성하세요.`,
    );
  }

  const martRecords = readJson<{ records: MartRegionSummaryRecord[] }>(
    martPath,
  ).records;
  const schoolMaster = readJson<{ records: MasterSchoolRecord[] }>(
    schoolMasterPath,
  ).records;
  const supportCenterMaster = readJson<{
    records: MasterSupportCenterRecord[];
  }>(supportCenterMasterPath).records;

  // 기존 buildIndicatorOutput pure builder 재사용 (산식 / shape 변환 모두 그대로).
  // src/lib/indicators / scripts/etl/indicator/buildIndicatorOutput.ts 무수정.
  const result = buildIndicatorOutput({
    martRecords,
    schoolMaster,
    supportCenterMaster,
  });

  const generatedAt = new Date().toISOString();
  const output: IndicatorRealOutputFile = {
    _meta: {
      source: "real:B-transition-index",
      stage: "indicator",
      indicatorVersion: "mvp-v1",
      recordCount: result.records.length,
      issueCount: result.issues.length,
      generatedAt,
      baseYear: INDICATOR_BASE_YEAR,
      calculatedAt: INDICATOR_CALCULATED_AT,
    },
    records: result.records,
    issues: result.issues,
  };
  writeJson(
    join(INDICATOR_REAL_DIR, "B", "transition_index.real.json"),
    output,
  );

  console.log(
    `[real:indicator:B/transition_index] records=${result.records.length}, issues=${result.issues.length}`,
  );

  return {
    recordCount: result.records.length,
    issueCount: result.issues.length,
  };
}

// ─── mart 단계 실행 ────────────────────────────────────────────────────────
//
// master 산출물 4개를 입력으로 buildRegionSummaryMart를 호출하고 단일 region
// summary mart JSON을 작성한다. master 산출물 부재 시 명시적 에러로 종료
// (자동 master 실행 안 함).
//
// 11-1 2차 3차 시점 C/D/E/F 도메인 부재 → _meta.partialFixture=true,
// missingDomains=["C","D","E","F"]로 명시.
const MART_INPUT_FILES = [
  join(MASTER_DIR, "region_master.json"),
  join(MASTER_DIR, "demand_master.json"),
  join(MASTER_DIR, "school_master.json"),
  join(MASTER_DIR, "support_center_master.json"),
] as const;

interface MartStageSummary {
  recordCount: number;
  issueCount: number;
}

interface MartOutputFile {
  _meta: {
    source: "demo:fixture-etl";
    stage: "mart";
    datasetCategory: "region-summary";
    recordCount: number;
    issueCount: number;
    generatedAt: string;
    partialFixture: true;
    missingDomains: ["C", "D", "E", "F"];
  };
  records: MartRegionSummaryRecord[];
  issues: DataQualityIssue[];
}

export function runMartStage(): MartStageSummary {
  // 1. master 산출물 부재 검증
  for (const path of MART_INPUT_FILES) {
    if (!existsSync(path)) {
      throw new Error(
        `master input not found: ${path}. Run 'npx tsx scripts/etl/runEtl.ts --mode fixture --stage master' first to generate master outputs.`,
      );
    }
  }

  // 2. 4개 master 산출물 로드 (records 배열만 추출)
  const regionMaster = readJson<{ records: MasterRegionRecord[] }>(
    MART_INPUT_FILES[0],
  ).records;
  const demandMaster = readJson<{ records: MasterDemandRecord[] }>(
    MART_INPUT_FILES[1],
  ).records;
  const schoolMaster = readJson<{ records: MasterSchoolRecord[] }>(
    MART_INPUT_FILES[2],
  ).records;
  const supportCenterMaster = readJson<{
    records: MasterSupportCenterRecord[];
  }>(MART_INPUT_FILES[3]).records;

  // 3. buildRegionSummaryMart 호출 (pure)
  const result = buildRegionSummaryMart({
    regionMaster,
    demandMaster,
    schoolMaster,
    supportCenterMaster,
  });

  // 4. mart 파일 작성
  const generatedAt = new Date().toISOString();
  const output: MartOutputFile = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "mart",
      datasetCategory: "region-summary",
      recordCount: result.records.length,
      issueCount: result.issues.length,
      generatedAt,
      partialFixture: true,
      missingDomains: ["C", "D", "E", "F"],
    },
    records: result.records,
    issues: result.issues,
  };
  writeJson(join(MART_DIR, "region_summary_mart.json"), output);

  console.log(
    `[mart:region_summary] records=${result.records.length}, issues=${result.issues.length}`,
  );

  return {
    recordCount: result.records.length,
    issueCount: result.issues.length,
  };
}

// ─── indicator 단계 실행 ───────────────────────────────────────────────────
//
// mart 산출물(region_summary_mart.json) + master 산출물 중 school/support_center를
// 입력으로 buildIndicatorOutput을 호출하고 단일 indicator JSON을 작성한다.
// 선행 산출물 부재 시 명시적 에러로 종료 (자동 mart/master 실행 X).
//
// indicatorVersion / baseYear / calculatedAt은 buildIndicatorOutput의 고정값
// (INDICATOR_BASE_YEAR=2026, INDICATOR_CALCULATED_AT="2026-05-11T00:00:00+09:00",
//  INDICATOR_VERSION="mvp-v1")을 그대로 사용해 결정적 산출물을 만든다.
const INDICATOR_INPUT_FILES = {
  mart: join(MART_DIR, "region_summary_mart.json"),
  school: join(MASTER_DIR, "school_master.json"),
  supportCenter: join(MASTER_DIR, "support_center_master.json"),
} as const;

interface IndicatorStageSummary {
  recordCount: number;
  issueCount: number;
}

export function runIndicatorStage(): IndicatorStageSummary {
  // 1. 선행 산출물 부재 검증
  if (!existsSync(INDICATOR_INPUT_FILES.mart)) {
    throw new Error(
      `mart output not found: ${INDICATOR_INPUT_FILES.mart}. Run stage mart first ('npx tsx scripts/etl/runEtl.ts --mode fixture --stage mart').`,
    );
  }
  if (!existsSync(INDICATOR_INPUT_FILES.school)) {
    throw new Error(
      `master output not found: ${INDICATOR_INPUT_FILES.school}. Run stage master first.`,
    );
  }
  if (!existsSync(INDICATOR_INPUT_FILES.supportCenter)) {
    throw new Error(
      `master output not found: ${INDICATOR_INPUT_FILES.supportCenter}. Run stage master first.`,
    );
  }

  // 2. records 배열 로드
  const martRecords = readJson<{ records: MartRegionSummaryRecord[] }>(
    INDICATOR_INPUT_FILES.mart,
  ).records;
  const schoolMaster = readJson<{ records: MasterSchoolRecord[] }>(
    INDICATOR_INPUT_FILES.school,
  ).records;
  const supportCenterMaster = readJson<{
    records: MasterSupportCenterRecord[];
  }>(INDICATOR_INPUT_FILES.supportCenter).records;

  // 3. buildIndicatorOutput 호출 (pure)
  const result = buildIndicatorOutput({
    martRecords,
    schoolMaster,
    supportCenterMaster,
  });

  // 4. indicator 파일 작성
  const generatedAt = new Date().toISOString();
  const output: IndicatorOutputFile = {
    _meta: {
      source: "demo:fixture-etl",
      stage: "indicator",
      indicatorVersion: "mvp-v1",
      recordCount: result.records.length,
      issueCount: result.issues.length,
      generatedAt,
      partialFixture: true,
      missingDomains: ["C", "D", "E", "F"],
      baseYear: INDICATOR_BASE_YEAR,
      calculatedAt: INDICATOR_CALCULATED_AT,
    },
    records: result.records,
    issues: result.issues,
  };
  writeJson(join(INDICATOR_DIR, "transition_index_fixture.json"), output);

  console.log(
    `[indicator:transition_index] records=${result.records.length}, issues=${result.issues.length}`,
  );

  return {
    recordCount: result.records.length,
    issueCount: result.issues.length,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────
function main(): void {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `[runEtl] mode=${args.mode || "(none)"}, stage=${args.stage || "(none)"}`,
  );

  if (args.mode !== "fixture" && args.mode !== "real") {
    console.error(
      `[runEtl] --mode는 fixture 또는 real만 지원합니다 (받은 mode: '${args.mode}').`,
    );
    process.exitCode = 1;
    return;
  }

  // 11-2 1차-13 — real 모드는 clean stage만 지원. validateRealModeArgs가
  // stage 종류 + --admin-codes / --legal-dong-codes 인자 + 파일 존재를 검증한다.
  // 11-3 1차-23 — `--stage master` 추가 지원 (B school master.real, G admin lookup).
  // 11-3 1차-30 — `--stage mart` 추가 지원 (B region_summary mart.real).
  if (args.mode === "real") {
    try {
      validateRealModeArgs(args);
      if (args.stage === "master") {
        const masterSummary = runRealMasterStage();
        console.log(
          `[runEtl real] DONE stage=master records=${masterSummary.recordCount} issues=${masterSummary.issueCount}`,
        );
      } else if (args.stage === "mart") {
        const martSummary = runRealMartStage();
        console.log(
          `[runEtl real] DONE stage=mart records=${martSummary.recordCount} issues=${martSummary.issueCount}`,
        );
      } else if (args.stage === "indicator") {
        // 11-3 1차-38 — `--stage indicator` 추가 (B transition_index indicator.real).
        const indicatorSummary = runRealIndicatorStage();
        console.log(
          `[runEtl real] DONE stage=indicator records=${indicatorSummary.recordCount} issues=${indicatorSummary.issueCount}`,
        );
      } else {
        const summary = runCleanStage(args);
        console.log(
          `[runEtl real] DONE stage=clean tasks=${summary.taskCount} totalRecords=${summary.totalRecords} totalIssues=${summary.totalIssues}`,
        );
      }
    } catch (e) {
      console.error(
        "[runEtl real] failed:",
        e instanceof Error ? e.message : e,
      );
      process.exitCode = 1;
    }
    return;
  }

  if (
    args.stage !== "clean" &&
    args.stage !== "master" &&
    args.stage !== "mart" &&
    args.stage !== "indicator" &&
    args.stage !== "all"
  ) {
    console.error(
      `[runEtl] only --stage clean / master / mart / indicator / all are supported (got: '${args.stage}').`,
    );
    process.exitCode = 1;
    return;
  }

  try {
    if (args.stage === "clean") {
      const summary = runCleanStage(args);
      console.log(
        `[runEtl] DONE stage=clean tasks=${summary.taskCount} totalRecords=${summary.totalRecords} totalIssues=${summary.totalIssues}`,
      );
    } else if (args.stage === "master") {
      const summary = runMasterStage();
      const totalRecords =
        summary.regionCount +
        summary.demandCount +
        summary.schoolCount +
        summary.supportCenterCount +
        summary.legalDongCount +
        summary.adminCodeCount +
        summary.crossrefCount;
      console.log(
        `[runEtl] DONE stage=master totalRecords=${totalRecords} totalIssues=${summary.totalIssues}`,
      );
    } else if (args.stage === "mart") {
      const summary = runMartStage();
      console.log(
        `[runEtl] DONE stage=mart recordCount=${summary.recordCount} issueCount=${summary.issueCount}`,
      );
    } else if (args.stage === "indicator") {
      const summary = runIndicatorStage();
      console.log(
        `[runEtl] DONE stage=indicator recordCount=${summary.recordCount} issueCount=${summary.issueCount}`,
      );
    } else {
      // --stage all: clean → master → mart → indicator 순차 실행.
      // 각 stage는 자체 console.log 요약을 출력하므로 추가 출력 없이 바로 다음 단계로.
      // 중간 단계가 throw하면 catch에서 exitCode=1 처리되고 후속 단계는 실행되지 않는다.
      const cleanSummary = runCleanStage();
      const masterSummary = runMasterStage();
      const martSummary = runMartStage();
      const indicatorSummary = runIndicatorStage();

      const masterRecords =
        masterSummary.regionCount +
        masterSummary.demandCount +
        masterSummary.schoolCount +
        masterSummary.supportCenterCount +
        masterSummary.legalDongCount +
        masterSummary.adminCodeCount +
        masterSummary.crossrefCount;

      console.log(
        `[runEtl] DONE stage=all cleanRecords=${cleanSummary.totalRecords} masterRecords=${masterRecords} martRecords=${martSummary.recordCount} indicatorRecords=${indicatorSummary.recordCount}`,
      );
    }
  } catch (e) {
    console.error("[runEtl] failed:", e);
    process.exitCode = 1;
  }
}

// 11-2 1차-13 — ES Module main guard.
// 본 파일을 다른 모듈(예: vitest 테스트 파일)이 import할 때 main()이 자동 실행되지
// 않도록 한다. process.argv[1]은 Node가 실행한 진입점 파일의 절대 경로이며,
// import.meta.url을 fileURLToPath로 변환한 결과와 일치할 때만 본 파일이 CLI로
// 실행된 상황이다. tsx로 직접 실행 / npm script로 실행 / vitest import 모두
// 정확히 판별된다.
if (
  process.argv[1] !== undefined &&
  process.argv[1] === fileURLToPath(import.meta.url)
) {
  main();
}
