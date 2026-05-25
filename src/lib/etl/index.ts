/**
 * 8단계 ETL barrel.
 *
 * - 모든 모듈은 인터페이스 스텁이며, 실제 fetch·파일 I/O·인증키 사용 없음.
 * - normalize 함수는 throw 없이 안전한 fallback을 반환 (재사용 가능).
 * - ingest·pipeline 함수는 호출 시 throw (실 구현은 9단계 이후).
 */

// 타입
export type {
  CleanRecord,
  DataQualityIssue,
  DatasetCategory,
  IngestContext,
  IngestResult,
  IssueCollector,
  PipelineStage,
  RawRecord,
} from "./types";

// 정규화 함수 (재사용 가능, throw 없음)
export {
  normalizeAddress,
  normalizeCoordinate,
  normalizeInstitutionId,
  normalizeJobCode,
  normalizeNcsCode,
  normalizeRegionCode,
  normalizeSchoolId,
} from "./normalize";

export type {
  NormalizeAddressInput,
  NormalizeAddressResult,
  NormalizeCoordinateInput,
  NormalizeCoordinateResult,
  NormalizeInstitutionIdInput,
  NormalizeInstitutionIdResult,
  NormalizeJobCodeInput,
  NormalizeJobCodeResult,
  NormalizeNcsCodeInput,
  NormalizeNcsCodeResult,
  NormalizeRegionCodeInput,
  NormalizeRegionCodeResult,
  NormalizeSchoolIdInput,
  NormalizeSchoolIdResult,
} from "./normalize";

// pipeline (전부 stub throw)
export {
  runCleanStage,
  runIndicatorStage,
  runMartStage,
  runMasterStage,
  runPipeline,
  runRawStage,
} from "./pipeline";
export type { StageResult } from "./pipeline";

// ingest 7개 (전부 stub throw)
export { ingestDemand } from "./ingest/ingestDemand";
export { ingestSchool } from "./ingest/ingestSchool";
export { ingestTraining } from "./ingest/ingestTraining";
export { ingestEmployment } from "./ingest/ingestEmployment";
export { ingestWelfare } from "./ingest/ingestWelfare";
export { ingestMobility } from "./ingest/ingestMobility";
export { ingestGeocoding } from "./ingest/ingestGeocoding";
