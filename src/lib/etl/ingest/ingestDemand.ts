/**
 * 묶음 A — 전환교육 수요 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 특수교육 통계
 * - 등록장애인 현황
 * - 주민등록 연령별 인구
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_EDU
 * - ETL_API_KEY_KOSIS
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestDemand(ctx: IngestContext): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestDemand (Category A) is not implemented in stage 8 (stub only).",
  );
}
