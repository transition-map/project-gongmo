#!/usr/bin/env tsx
/**
 * 11-3 1차-79 CLI entry — NEIS schoolInfo OpenAPI live fetch.
 *
 * **사용자 manual 실행 전용**. Claude Code / CI / Vercel은 본 entry를 호출하지 않는다.
 *
 * **실행 사전 조건 (사용자 책임)**:
 * 1. 공공데이터포털(https://www.data.go.kr/)에서 본인 계정으로 인증키 발급
 * 2. 프로젝트 루트에 `.env.local` 생성 (`*.local` line 13 gitignore 보호)
 * 3. `.env.local`에 `ETL_API_KEY_NEIS=본인_발급_키` 입력
 * 4. (선택) 본 CLI 첫 실행 전 `--dry-run`으로 URL 마스킹·저장 경로 확인
 *
 * **사용 예시**:
 *   npm run etl:real:neis-fetch -- --page 1 --size 100 --dry-run
 *   npm run etl:real:neis-fetch -- --page 1 --size 100
 *
 * **CLI 정책**:
 * - `process.env.ETL_API_KEY_NEIS` 값을 console에 출력 0건. 존재 여부 검사만.
 * - 마스킹된 URL만 콘솔 안내 (`KEY=***`).
 * - 산출물 저장 경로는 `data/raw.api/B/neis/<YYYYMMDD>-page<page>.json` (gitignore line 32).
 * - fetch / write 모두 `runNeisFetch`에 위임 — dependency-injection 없이 default(global fetch +
 *   Node fs.promises) 사용.
 *
 * **본 CLI는 1차-79 코드 단계 commit 시점에는 호출되지 않음**. 사용자가 `.env.local` 입력
 * 후 직접 실행할 때만 활성화.
 */

import { runNeisFetch } from "../ingest/fetchNeisSchoolBasic";

interface ParsedArgs {
  page: number;
  size: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  let page = 1;
  let size = 100;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--page" && i + 1 < argv.length) {
      const n = Number(argv[i + 1]);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(
          `[neisFetch CLI] --page는 1 이상의 정수여야 합니다. 받은 값: '${argv[i + 1]}'.`,
        );
      }
      page = n;
      i++;
    } else if (arg === "--size" && i + 1 < argv.length) {
      const n = Number(argv[i + 1]);
      if (!Number.isInteger(n) || n < 1 || n > 1000) {
        throw new Error(
          `[neisFetch CLI] --size는 1~1000 범위 정수여야 합니다. 받은 값: '${argv[i + 1]}'.`,
        );
      }
      size = n;
      i++;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return { page, size, dryRun };
}

function printUsage(): void {
  console.log(`
NEIS schoolInfo OpenAPI live fetch CLI (11-3 1차-79)

사용:
  npm run etl:real:neis-fetch -- --page 1 --size 100 --dry-run
  npm run etl:real:neis-fetch -- --page 1 --size 100

옵션:
  --page <n>     NEIS pIndex (기본 1, 1 이상 정수)
  --size <n>     NEIS pSize (기본 100, 1~1000)
  --dry-run      URL 마스킹·저장 경로만 계산하고 실제 fetch / write 0건
  --help, -h     본 안내문 출력

사전 조건:
  - 공공데이터포털(https://www.data.go.kr/)에서 본인 인증키 발급
  - 프로젝트 루트 .env.local에 ETL_API_KEY_NEIS=본인_발급_키 입력
  - .env.local은 *.local gitignore 보호. commit 절대 금지.

저장 경로:
  data/raw.api/B/neis/<YYYYMMDD>-page<page>.json
  (gitignore line 32 보호 — commit 0건)
`);
}

function getTodayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ETL_API_KEY_NEIS ?? "";
  const today = getTodayYYYYMMDD();

  console.log(
    `[neisFetch CLI] page=${args.page} size=${args.size} dryRun=${args.dryRun}`,
  );

  try {
    const result = await runNeisFetch({
      apiKey,
      page: args.page,
      size: args.size,
      today,
      dryRun: args.dryRun,
    });

    // key 값 미노출 — maskedUrl + outputPath만 출력.
    console.log(`[neisFetch CLI] URL (masked): ${result.maskedUrl}`);
    console.log(`[neisFetch CLI] Output path: ${result.outputPath}`);

    if (result.dryRun) {
      console.log(
        "[neisFetch CLI] DRY-RUN — 실제 fetch / write 호출 0건. 본 URL·경로가 OK이면 --dry-run을 빼고 다시 실행하세요.",
      );
    } else {
      console.log(
        `[neisFetch CLI] DONE — recordCount=${result.recordCount} apiResultCode=${result.apiResultCode}`,
      );
    }
  } catch (e) {
    // 에러 메시지는 runNeisFetch가 이미 key·raw body 미포함 한국어로 준비. 그대로 출력.
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[neisFetch CLI] 실패: ${msg}`);
    process.exit(1);
  }
}

// CLI entry — 본 모듈이 직접 실행될 때만 main() 호출.
// import로 본 모듈을 참조하는 경우(테스트 등)는 main()을 자동 실행하지 않는다.
const isDirectInvocation = (() => {
  // tsx node 실행 시 import.meta.url과 process.argv[1] file path 비교.
  if (typeof process === "undefined" || process.argv.length < 2) return false;
  const argv1 = process.argv[1] ?? "";
  return argv1.endsWith("neisFetch.ts") || argv1.endsWith("neisFetch");
})();

if (isDirectInvocation) {
  void main();
}
