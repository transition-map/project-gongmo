import { readFileSync } from "node:fs";

/**
 * UTF-8 JSON 파일을 읽고 파싱한다. 형식 검증은 호출자 책임.
 */
export function readJson<T = unknown>(path: string): T {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as T;
}
