/**
 * 묶음 D — 일자리·고용 결과 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 장애인 구인 정보
 * - 장애인 취업 정보
 * - 장애인경제활동실태조사
 * - 의무고용 현황
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_KEAD
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestEmployment(
  ctx: IngestContext,
): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestEmployment (Category D) is not implemented in stage 8 (stub only).",
  );
}
