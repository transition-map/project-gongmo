/**
 * 11-2 1차-3 CSV → ingest → clean → CleanOutputFile 직렬화 헬퍼.
 *
 * 본 모듈은 runEtl.ts의 `runCleanStage()`가 JSON fixture 기반 cleaner와 별도로
 * CSV 기반 ingest+cleaner pipeline을 호출할 때 코드 중복을 줄이는 목적의 helper다.
 *
 * 책임:
 * 1. CSV 파일 path → readText로 string 로드
 * 2. ingest 함수에 csvText 주입 → raw records + ingest issues 획득
 * 3. clean 함수에 raw records 주입 → cleaned records + cleaner issues 획득
 * 4. CleanOutputFile (기존 shape) 형태로 직렬화 후 outputPath에 writeJson
 * 5. console 로그·summary 누적은 호출자(runEtl) 책임
 *
 * 비책임:
 * - issue / record 형식 검증 (ingest·cleaner 함수가 담당)
 * - master 단계 입력 추가 여부 결정 (안 B: MASTER_INPUT_FILES 무수정)
 *
 * issue 누적 순서: `[...ingestIssues, ...cleanerIssues]`
 * (ingest 단계의 폐지·형식 issue를 앞에, cleaner의 normalize issue를 뒤에 두어
 *  산출물 가독성을 우선한다 — 합의 [7-13] 4번.)
 */

import { readText } from "../io/readText";
import { writeJson } from "../io/writeJson";
import type {
  CleanOutputFile,
  CleanResult,
  DataQualityIssue,
} from "../types";

export interface CsvIngestStepResult {
  records: unknown[];
  issues: DataQualityIssue[];
}

export interface RunCsvCleanTaskInput {
  /** 콘솔 로그 라벨, 예: "G/admin_codes". */
  label: string;
  /** clean 산출물 _meta.datasetCategory. */
  datasetCategory: "G" | "A" | "B";
  /** CSV fixture 경로. */
  csvPath: string;
  /** 산출물 파일 경로. */
  outputPath: string;
  /** csvText → raw records + ingest issues. ingest 함수의 thin wrapper. */
  ingest: (csvText: string) => CsvIngestStepResult;
  /** raw records → cleaned records + cleaner issues. */
  clean: (records: unknown[]) => CleanResult<unknown>;
  /** ISO 8601, runEtl의 단일 generatedAt을 공유. */
  generatedAt: string;
}

export interface RunCsvCleanTaskResult {
  recordCount: number;
  issueCount: number;
}

/**
 * CSV 1개에 대해 ingest → clean → 직렬화를 수행한다.
 *
 * - throw하지 않는다 (단, readText / ingest / clean / writeJson이 throw하면 전파).
 * - 산출물 shape는 기존 `CleanOutputFile`과 동일. 신규 필드 추가 0건.
 */
export function runCsvCleanTask(
  input: RunCsvCleanTaskInput,
): RunCsvCleanTaskResult {
  const csvText = readText(input.csvPath);
  const ingested = input.ingest(csvText);
  const cleaned = input.clean(ingested.records);

  const issues: DataQualityIssue[] = [
    ...ingested.issues,
    ...cleaned.issues,
  ];

  const output: CleanOutputFile = {
    _meta: {
      source: "demo",
      datasetCategory: input.datasetCategory,
      stage: "clean",
      recordCount: cleaned.records.length,
      issueCount: issues.length,
      generatedAt: input.generatedAt,
    },
    records: cleaned.records,
    issues,
  };

  writeJson(input.outputPath, output);

  return {
    recordCount: cleaned.records.length,
    issueCount: issues.length,
  };
}
