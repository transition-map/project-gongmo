import { writeFileSync } from "node:fs";
import { ensureDir } from "./ensureDir";

/**
 * 부모 디렉토리를 생성한 뒤 UTF-8 JSON으로 직렬화 저장.
 * indent 2, 끝에 newline 1줄.
 */
export function writeJson(path: string, data: unknown): void {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
