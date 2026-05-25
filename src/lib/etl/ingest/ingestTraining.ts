/**
 * 묶음 C — 진로체험·훈련 공급 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 워크넷 (장애인 훈련 정보)
 * - 꿈길 (진로체험)
 * - HRD-Net
 * - 장애인 민간훈련기관
 * - 발달장애인훈련센터
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_HRDNET
 * - ETL_API_KEY_WORKNET
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestTraining(
  ctx: IngestContext,
): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestTraining (Category C) is not implemented in stage 8 (stub only).",
  );
}
