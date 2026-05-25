/**
 * 묶음 B — 학교·교육 여건 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 교육통계서비스
 * - 학교알리미
 * - NEIS
 * - 특수교육지원센터 현황
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_NEIS
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestSchool(ctx: IngestContext): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestSchool (Category B) is not implemented in stage 8 (stub only).",
  );
}
