import { readFileSync } from "node:fs";

/**
 * UTF-8 텍스트 파일을 읽어 문자열로 반환한다.
 *
 * 11-2 1차-3에서 CSV fixture 로딩에 사용된다. 형식 검증·BOM 제거·라인 분할은
 * 호출자(ingest 함수) 책임이며, 본 어댑터는 파일 → string 변환에만 관여한다.
 *
 * readJson.ts와 같은 io 폴더 패턴을 따른다.
 */
export function readText(path: string): string {
  return readFileSync(path, "utf-8");
}
