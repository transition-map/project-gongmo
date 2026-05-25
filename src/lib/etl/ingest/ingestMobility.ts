/**
 * 묶음 F — 이동권·접근성 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 장애인 편의시설
 * - 교통약자 이동지원센터
 * - 특별교통수단
 * - 저상버스 도입 현황
 * - 버스정류장 위치
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_MOLIT
 * - ETL_API_KEY_TAGO
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestMobility(
  ctx: IngestContext,
): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestMobility (Category F) is not implemented in stage 8 (stub only).",
  );
}
