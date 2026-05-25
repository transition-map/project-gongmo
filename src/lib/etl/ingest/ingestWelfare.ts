/**
 * 묶음 E — 복지·생활지원 인프라 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 장애인복지관 현황
 * - 장애인 주간이용시설
 * - 직업재활시설
 * - 복지관 프로그램
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_MOHW
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestWelfare(
  ctx: IngestContext,
): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestWelfare (Category E) is not implemented in stage 8 (stub only).",
  );
}
