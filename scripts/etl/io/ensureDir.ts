import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 파일 경로의 부모 디렉토리를 재귀 생성.
 * 이미 존재하면 no-op (recursive: true).
 */
export function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}
