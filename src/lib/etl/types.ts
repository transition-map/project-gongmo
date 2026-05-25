/**
 * 8단계 ETL 인터페이스 스텁의 공용 타입.
 *
 * - 본 모듈은 Node API(fs/path/process/dotenv 등)를 import하지 않는다.
 * - 실제 fetch·파일 I/O·인증키 사용 없음. 9단계 이후에 구현한다.
 * - DataQualityIssue·DatasetCategory는 3단계 타입을 그대로 재export.
 *   src/types/* 수정 없음.
 */

import type { DataQualityIssue, DatasetCategory } from "../../types";

export type { DataQualityIssue, DatasetCategory };

/** ETL 단계 식별자 (CLAUDE.md §4) */
export type PipelineStage = "raw" | "clean" | "master" | "mart" | "indicator";

/**
 * ingest 함수 입력 컨텍스트.
 *
 * - apiKeyEnvVar는 **환경변수 이름 문자열만** 담는다. 실제 키 값은 절대 X.
 *   (VITE_ prefix 사용 금지 — VITE_*는 클라이언트 번들에 노출되므로 인증키에 부적절)
 * - baseDir은 raw 단계 출력 경로의 string. 8단계는 파일을 만들지 않는다.
 */
export interface IngestContext {
  source: string;
  datasetCategory: DatasetCategory;
  /** 인증키가 들어갈 환경변수 이름. 예: "ETL_API_KEY_NEIS". 실제 값은 X. */
  apiKeyEnvVar?: string;
  baseDir: string;
  /** ISO 8601. 미지정 시 호출자가 정함. */
  fetchedAt?: string;
}

/** ingest 결과 메타. 실레코드는 outputPath의 파일에 저장될 예정 (8단계 미구현). */
export interface IngestResult {
  source: string;
  datasetCategory: DatasetCategory;
  recordCount: number;
  fetchedAt: string;
  outputPath: string;
  issues: DataQualityIssue[];
}

/**
 * DataQualityIssue 누적 콜백.
 * 각 normalize 함수가 부수효과 없이 issue를 보고할 때 호출자가 주입한다.
 */
export type IssueCollector = (issue: DataQualityIssue) => void;

/** raw·clean 단계의 비정형 레코드 컨테이너. 형식 결정은 9단계. */
export type RawRecord = Record<string, unknown>;
export type CleanRecord = Record<string, unknown>;
