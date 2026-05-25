/**
 * 11-2 1차-15 CP949/EUC-KR 디코더.
 *
 * 실 행안부 KIKcd_B/H/mix 파일은 CP949 인코딩(BOM 없음)으로 배포되며 본 모듈이
 * `Uint8Array → string` 변환을 제공한다. Node 내장 `TextDecoder("euc-kr")`만
 * 사용하며 iconv-lite 등 외부 라이브러리 의존 0건 — Step A 사전 검증으로
 * Node 24 + full ICU 환경에서 "euc-kr" 라벨 정상 지원 확인됨.
 *
 * 책임:
 * - byte sequence → UTF-16 string 디코드 (non-fatal: 무효 바이트는 U+FFFD)
 * - 줄 구분자(CR/LF) 보존 — fixed-width row split에 필수
 * - decoder 인스턴스 singleton 재사용 (lazy)
 *
 * 비책임:
 * - 파일 읽기 (호출자가 fs/Uint8Array 준비)
 * - CSV/fixed-width 파싱
 * - 인코딩 자동 감지 (호출자가 CP949 보장)
 */

import { TextDecoder } from "node:util";

// Node 내장 `TextDecoder("euc-kr")`. lazy singleton — 호출 시점에 한 번 생성하고
// 이후 재사용. WHATWG Encoding Standard에서 "euc-kr"은 CP949(MS Korean) 매핑을
// 사용하므로 행안부 CP949 출력과 호환된다.
let cachedDecoder: InstanceType<typeof TextDecoder> | null = null;

function getDecoder(): InstanceType<typeof TextDecoder> {
  if (cachedDecoder !== null) return cachedDecoder;
  try {
    cachedDecoder = new TextDecoder("euc-kr");
    return cachedDecoder;
  } catch (e) {
    throw new Error(
      `[decodeCp949] 현재 Node 환경이 TextDecoder("euc-kr")를 지원하지 않습니다. ` +
        `Node 24+ full ICU 빌드를 사용 중인지 확인하거나, iconv-lite 도입을 별도 합의해 주세요.`,
      { cause: e },
    );
  }
}

/**
 * CP949(EUC-KR superset) byte sequence를 JavaScript string으로 디코드.
 *
 * - 빈 입력 → 빈 문자열
 * - non-fatal: CP949에서 유효하지 않은 byte 시퀀스는 U+FFFD(replacement char)로 대체
 * - 동일 입력은 항상 동일 출력 (결정적)
 */
export function decodeCp949(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  return getDecoder().decode(bytes);
}
