/**
 * 묶음 G — 표준화·공간 결합 데이터 ingest 스텁.
 *
 * 후보 출처:
 * - 법정동 코드
 * - 행정구역 코드
 * - 지오코더 (주소 → 좌표)
 * - 좌표 데이터
 *
 * 인증키 환경변수 이름(값 X):
 * - ETL_API_KEY_VWORLD
 * - ETL_API_KEY_KAKAO
 *
 * 본 도메인은 다른 묶음(A~F)과 결합 키 매핑(regionCode 등)에도 사용된다.
 * master 단계 의존성은 9단계 pipeline 설계에서 명확히 한다.
 *
 * Stage 8: stub only. 실제 fetch·파일 I/O·인증키 사용 없음.
 * 9단계 이후에 실 구현한다.
 */

import type { IngestContext, IngestResult } from "../types";

export async function ingestGeocoding(
  ctx: IngestContext,
): Promise<IngestResult> {
  void ctx;
  throw new Error(
    "ingestGeocoding (Category G) is not implemented in stage 8 (stub only).",
  );
}
