/**
 * 11-2 1차-15 binary 파일 read helper.
 *
 * 실 행안부 KIKcd_B/H/mix는 CP949 인코딩이라 `fs.readFileSync(path, "utf-8")`로 읽으면
 * 한글이 깨진다. 본 helper는 인코딩 변환 없이 raw byte sequence(`Uint8Array`)만 반환하고,
 * 디코드는 호출자(`decodeCp949` 등)가 담당한다.
 *
 * 책임:
 * - `fs.readFileSync(path)` thin wrapper
 * - Node `Buffer` → 표준 `Uint8Array`로 노출 (decodeCp949의 입력 타입과 일치)
 *
 * 비책임:
 * - 인코딩 디코드 (별도 module)
 * - 파일 존재 검증 (호출자가 `existsSync` 또는 try/catch 처리)
 */

import { readFileSync } from "node:fs";

/**
 * 파일을 binary로 읽어 `Uint8Array` 반환.
 *
 * Node의 `Buffer`는 `Uint8Array`의 subclass이므로 동일 byte view를 그대로 노출.
 * 파일이 없으면 `fs.readFileSync`가 `ENOENT` Error를 throw 한다 (호출자가 catch).
 */
export function readBytes(path: string): Uint8Array {
  const buf = readFileSync(path);
  // Buffer는 Uint8Array subclass이지만 명시적으로 동일 memory view를 가진
  // 표준 Uint8Array를 반환해 호출자 타입을 좁힌다 (copy 없음).
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
