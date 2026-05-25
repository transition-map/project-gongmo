/**
 * 8단계 ETL pipeline 스텁.
 *
 * - 5개 stage 함수와 통합 진입점 `runPipeline`은 모두 stub. 호출 즉시 throw.
 * - 단계 간 입출력은 **파일 경로(string)만** 다룬다. 형식 결정은 9단계.
 * - 실제 실행 환경(Node CLI 등)·파일 I/O·fetch는 9단계 이후.
 */

import type {
  IngestContext,
  IngestResult,
  PipelineStage,
} from "./types";

const STAGE_8_NOT_IMPL =
  "ETL pipeline is not implemented in stage 8 (stub only).";

/** stage 결과 메타. 단계별 산출물의 레코드 수와 경로 등. */
export interface StageResult {
  stage: PipelineStage;
  recordCount: number;
  outputPath: string;
  /** 단계 수행 중 누적된 데이터 품질 이슈 수 */
  issueCount: number;
}

/**
 * Raw stage 진입점. 도메인별 ingest 함수를 받아 raw 데이터 수집을 위임.
 * 단계 자체는 stub. ingest 함수도 stub이라 실행 시 throw 전파.
 */
export async function runRawStage(
  ctx: IngestContext,
  ingestFn: (ctx: IngestContext) => Promise<IngestResult>,
): Promise<IngestResult> {
  void ctx;
  void ingestFn;
  throw new Error(STAGE_8_NOT_IMPL);
}

/** Clean stage. raw → clean 변환. 컬럼 표준화·결측·이상치 처리. */
export async function runCleanStage(
  rawPath: string,
  outPath: string,
): Promise<StageResult> {
  void rawPath;
  void outPath;
  throw new Error(STAGE_8_NOT_IMPL);
}

/** Master stage. 여러 clean 산출물을 공통 키 매핑으로 통합. */
export async function runMasterStage(
  cleanPaths: string[],
  outPath: string,
): Promise<StageResult> {
  void cleanPaths;
  void outPath;
  throw new Error(STAGE_8_NOT_IMPL);
}

/** Mart stage. 시군구·도메인 집계. RegionSummary·SchoolSummary 등 도메인 객체로 변환. */
export async function runMartStage(
  masterPath: string,
  outPath: string,
): Promise<StageResult> {
  void masterPath;
  void outPath;
  throw new Error(STAGE_8_NOT_IMPL);
}

/**
 * Indicator stage. mart → indicator. `buildTransitionIndex`(6단계) 호출 예정.
 * 산식 자체는 6단계 모듈을 그대로 재사용한다.
 */
export async function runIndicatorStage(
  martPath: string,
  outPath: string,
): Promise<StageResult> {
  void martPath;
  void outPath;
  throw new Error(STAGE_8_NOT_IMPL);
}

/** 통합 진입점. 지정된 stage를 순서대로 실행. 8단계는 stub. */
export async function runPipeline(stages: PipelineStage[]): Promise<void> {
  void stages;
  throw new Error(STAGE_8_NOT_IMPL);
}
