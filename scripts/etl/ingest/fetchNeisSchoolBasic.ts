/**
 * 11-3 1차-79 ingest — NEIS schoolInfo OpenAPI live fetch scaffold.
 *
 * **로컬 ETL 전용 NEIS live fetch scaffold** (CLAUDE.md §10 / §17.32 정합).
 * 본 모듈은 사용자가 manual로 `npm run etl:real:neis-fetch -- --page 1 --size 100`을
 * 실행할 때만 활성화된다. Claude Code / CI / Vercel은 본 모듈의 fetch를 호출하지
 * 않는다.
 *
 * **핵심 안전 정책**:
 * - **API key 비노출**: `apiKey` 값을 `console.log` / `throw new Error` / URL 로그 출력에
 *   포함하지 않는다. URL을 로깅할 때는 `maskNeisUrlKey()`로 `KEY=value` → `KEY=***`
 *   치환 후 사용.
 * - **error message에 key·raw body 미포함**: HTTP 4xx/5xx / network error 모두 한국어
 *   카테고리로만 throw — 원본 body는 raw 파일에만 저장.
 * - **frontend 미포함**: 본 모듈은 `scripts/etl/` Node 전용 경로. Vite tree-shaking으로
 *   client bundle에 미포함됨이 1차-77 사후 검증으로 확정.
 * - **dependency-injection 패턴**: `fetchImpl?` / `writeImpl?` 인자로 테스트 시 mock 주입
 *   가능 — 실제 NEIS endpoint 호출 / 실제 fs.write 0건으로 테스트 통과.
 * - **dry-run 모드**: `dryRun: true`이면 fetch / write 모두 skip하고 maskedUrl + outputPath만
 *   계산해 반환 — 사용자가 실제 호출 전 안전 검증용.
 *
 * **저장 정책 (1차-78+ 계획 §8 합의값)**:
 * - 경로: `data/raw.api/B/neis/<YYYYMMDD>-page<page>.json` (gitignore line 32 보호).
 * - 실제 파일 저장은 사용자 manual 실행 시점에만. 본 코드 단계 commit에서는 0건.
 *
 * **본 모듈을 frontend(src/*)에서 import 금지** — Node 전용 경로.
 */

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface BuildNeisSchoolInfoUrlInput {
  apiKey: string;
  /** 1부터 시작. NEIS pIndex. */
  page: number;
  /** 1~1000. NEIS pSize 일반 한도. */
  size: number;
  /** NEIS endpoint base. 기본값 `https://open.neis.go.kr/hub/schoolInfo`. */
  endpointBase?: string;
}

export interface FetchNeisSchoolBasicRawInput {
  apiKey: string;
  page: number;
  size: number;
  /**
   * 테스트용 mock fetch 주입. 미지정 시 global `fetch` (Node 18+) 사용.
   * 본 인자는 테스트에서만 사용한다는 약속 — production code path는 global fetch 직접 활용.
   */
  fetchImpl?: typeof fetch;
  endpointBase?: string;
}

export interface ComputeNeisRawOutputPathInput {
  page: number;
  /** ISO date `YYYYMMDD` 형식. 예: "20260522". */
  today: string;
  /** 기본값 `data/raw.api`. 테스트에서 임시 디렉터리 등으로 override 가능. */
  baseDir?: string;
}

export interface SaveNeisSchoolInfoRawInput {
  raw: string;
  outputPath: string;
  /**
   * 테스트용 mock write 주입. 미지정 시 Node fs.promises.writeFile + mkdir 사용
   * (단, 본 코드 단계는 사용자 manual 실행 외에 호출자 0건이라 실제 호출 시점은 CLI에서만).
   */
  writeImpl?: (path: string, data: string) => Promise<void>;
}

export interface RunNeisFetchInput {
  apiKey: string;
  page: number;
  size: number;
  today: string;
  /** true면 fetch / write 모두 skip하고 maskedUrl + outputPath만 계산. */
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  writeImpl?: (path: string, data: string) => Promise<void>;
  endpointBase?: string;
  baseDir?: string;
}

export interface RunNeisFetchResult {
  dryRun: boolean;
  /** API key 마스킹된 URL (로그·사용자 안내용). */
  maskedUrl: string;
  /** 산출물 저장 경로. dryRun=true이면 계산만 수행, 실제 파일 미생성. */
  outputPath: string;
  /** dryRun=true이면 undefined. NEIS API response의 row count. */
  recordCount?: number;
  /** dryRun=true이면 undefined. NEIS API response의 RESULT.CODE. */
  apiResultCode?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────
const DEFAULT_ENDPOINT_BASE = "https://open.neis.go.kr/hub/schoolInfo";
const DEFAULT_BASE_DIR = "data/raw.api";

/**
 * NEIS schoolInfo OpenAPI URL 구성.
 *
 * **key 값이 URL에 raw로 들어가므로** 본 결과를 로그 출력 시 반드시 `maskNeisUrlKey()`로
 * 마스킹할 것. 본 함수 자체는 console 출력 0건 — 호출자 책임.
 */
export function buildNeisSchoolInfoUrl(
  input: BuildNeisSchoolInfoUrlInput,
): string {
  if (input.apiKey.length === 0) {
    throw new Error(
      "[buildNeisSchoolInfoUrl] ETL_API_KEY_NEIS 환경변수가 비어 있습니다. .env.local 파일에 본인 발급 키를 입력하세요.",
    );
  }
  if (!Number.isInteger(input.page) || input.page < 1) {
    throw new Error(
      `[buildNeisSchoolInfoUrl] page는 1 이상의 정수여야 합니다. 받은 값: ${input.page}.`,
    );
  }
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > 1000) {
    throw new Error(
      `[buildNeisSchoolInfoUrl] size는 1~1000 범위 정수여야 합니다. 받은 값: ${input.size}.`,
    );
  }
  const base = input.endpointBase ?? DEFAULT_ENDPOINT_BASE;
  const params = new URLSearchParams({
    Type: "json",
    KEY: input.apiKey,
    pIndex: String(input.page),
    pSize: String(input.size),
  });
  return `${base}?${params.toString()}`;
}

/**
 * URL의 `KEY=value` 부분을 `KEY=***`로 치환. console.log / error message / 사용자 안내문에
 * URL을 노출할 때 반드시 본 helper로 마스킹.
 */
export function maskNeisUrlKey(url: string): string {
  return url.replace(/(\bKEY=)[^&]*/i, "$1***");
}

/**
 * NEIS schoolInfo endpoint를 호출해 raw response text를 반환.
 *
 * - HTTP 4xx/5xx 응답 시 한국어 메시지로 throw — error message에 raw body / key 0건.
 * - network error / fetch reject 시 한국어 메시지로 wrap throw.
 */
export async function fetchNeisSchoolBasicRaw(
  input: FetchNeisSchoolBasicRawInput,
): Promise<string> {
  const url = buildNeisSchoolInfoUrl({
    apiKey: input.apiKey,
    page: input.page,
    size: input.size,
    endpointBase: input.endpointBase,
  });
  const masked = maskNeisUrlKey(url);
  const fetchFn = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(url);
  } catch (e) {
    // network error: e.message는 사용자에게 노출하지 않고 cause로만 attach
    // (Node fetch network error는 통상 URL/key를 message에 포함하지 않으나 안전 회피).
    throw new Error(
      `[fetchNeisSchoolBasicRaw] NEIS 네트워크 호출 실패. URL=${masked}.`,
      { cause: e },
    );
  }

  if (!response.ok) {
    // HTTP error: raw body / key 미노출. status만 사용자에게 안내.
    const status = response.status;
    const category =
      status === 401 || status === 403
        ? "인증"
        : status === 429
          ? "쿼터 제한"
          : status >= 500
            ? "서버"
            : "요청";
    throw new Error(
      `[fetchNeisSchoolBasicRaw] NEIS HTTP ${status} ${category} 오류. URL=${masked}.`,
    );
  }

  return await response.text();
}

/** raw 저장 경로 계산: `<baseDir>/B/neis/<YYYYMMDD>-page<page>.json`. */
export function computeNeisRawOutputPath(
  input: ComputeNeisRawOutputPathInput,
): string {
  if (!/^\d{8}$/.test(input.today)) {
    throw new Error(
      `[computeNeisRawOutputPath] today는 YYYYMMDD 형식이어야 합니다. 받은 값: '${input.today}'.`,
    );
  }
  if (!Number.isInteger(input.page) || input.page < 1) {
    throw new Error(
      `[computeNeisRawOutputPath] page는 1 이상의 정수여야 합니다. 받은 값: ${input.page}.`,
    );
  }
  const baseDir = input.baseDir ?? DEFAULT_BASE_DIR;
  return `${baseDir}/B/neis/${input.today}-page${input.page}.json`;
}

/**
 * raw text를 outputPath에 저장. writeImpl 미지정 시 Node fs.promises.writeFile + mkdir 사용
 * (CLI 호출 경로). 본 함수 자체는 console 출력 0건.
 */
export async function saveNeisSchoolInfoRaw(
  input: SaveNeisSchoolInfoRawInput,
): Promise<void> {
  const writeFn = input.writeImpl ?? defaultWriteImpl;
  try {
    await writeFn(input.outputPath, input.raw);
  } catch (e) {
    // raw body / 파일 시스템 원본 메시지를 사용자 메시지에 미포함 — cause로만 attach.
    throw new Error(
      `[saveNeisSchoolInfoRaw] raw 저장 실패. 경로=${input.outputPath}.`,
      { cause: e },
    );
  }
}

/**
 * default write impl — Node fs.promises 사용. CLI 직접 호출 경로에서만 활성화.
 * 본 함수는 export하지 않음 — 테스트에서 우회 가능성 차단.
 */
async function defaultWriteImpl(path: string, data: string): Promise<void> {
  const fs = await import("node:fs/promises");
  const pathMod = await import("node:path");
  await fs.mkdir(pathMod.dirname(path), { recursive: true });
  await fs.writeFile(path, data, { encoding: "utf-8" });
}

/**
 * 통합 entry — buildUrl + fetch + save + parser 검증.
 *
 * **dry-run 모드** (`dryRun: true`):
 * - fetch / write 호출 0건.
 * - maskedUrl + outputPath만 계산해 반환.
 * - 사용자가 실제 호출 전 안전 검증용 (URL 마스킹 / 저장 경로 미리보기).
 *
 * **정상 모드** (`dryRun: false`):
 * - fetch 호출 → raw text 획득.
 * - parser 호출로 `recordCount` / `apiResultCode` 검증 (실패 시 throw).
 * - writeImpl로 raw 저장.
 */
export async function runNeisFetch(
  input: RunNeisFetchInput,
): Promise<RunNeisFetchResult> {
  if (input.apiKey.length === 0) {
    throw new Error(
      "[runNeisFetch] ETL_API_KEY_NEIS 환경변수가 설정되지 않았습니다. 프로젝트 루트의 .env.local 파일에 'ETL_API_KEY_NEIS=본인_발급_키' 행을 추가한 뒤 다시 실행하세요.",
    );
  }

  const dryRun = input.dryRun ?? false;
  const url = buildNeisSchoolInfoUrl({
    apiKey: input.apiKey,
    page: input.page,
    size: input.size,
    endpointBase: input.endpointBase,
  });
  const maskedUrl = maskNeisUrlKey(url);
  const outputPath = computeNeisRawOutputPath({
    page: input.page,
    today: input.today,
    baseDir: input.baseDir,
  });

  if (dryRun) {
    return { dryRun: true, maskedUrl, outputPath };
  }

  const raw = await fetchNeisSchoolBasicRaw({
    apiKey: input.apiKey,
    page: input.page,
    size: input.size,
    fetchImpl: input.fetchImpl,
    endpointBase: input.endpointBase,
  });

  // parser 검증으로 raw shape 확인 — 본 단계에서는 parsed 결과를 별도로 저장하지 않음.
  const parsed = parseRawForMeta(raw);

  await saveNeisSchoolInfoRaw({
    raw,
    outputPath,
    writeImpl: input.writeImpl,
  });

  return {
    dryRun: false,
    maskedUrl,
    outputPath,
    recordCount: parsed.recordCount,
    apiResultCode: parsed.apiResultCode,
  };
}

/**
 * raw JSON에서 recordCount / apiResultCode만 안전하게 추출. parser ingestNeisSchoolBasic
 * 와 동일 로직이지만 본 모듈 내부 사용 — 외부 의존성 추가 없이 NEIS schoolInfo wrapper만 처리.
 */
function parseRawForMeta(raw: string): {
  recordCount: number;
  apiResultCode?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      "[runNeisFetch] NEIS 응답이 유효한 JSON이 아닙니다. raw 파일은 저장되지 않았습니다.",
      { cause: e },
    );
  }
  if (parsed === null || typeof parsed !== "object") {
    return { recordCount: 0 };
  }
  const obj = parsed as Record<string, unknown>;

  // Top-level RESULT (error response wrapper 없음)
  const topResult = obj.RESULT;
  if (topResult !== null && typeof topResult === "object") {
    const r = topResult as Record<string, unknown>;
    return {
      recordCount: 0,
      apiResultCode: typeof r.CODE === "string" ? r.CODE : undefined,
    };
  }

  // schoolInfo wrapper
  const schoolInfo = obj.schoolInfo;
  if (!Array.isArray(schoolInfo)) {
    return { recordCount: 0 };
  }

  let recordCount = 0;
  let apiResultCode: string | undefined;
  for (const block of schoolInfo) {
    if (block === null || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (Array.isArray(b.head)) {
      for (const h of b.head) {
        if (h === null || typeof h !== "object") continue;
        const hr = h as Record<string, unknown>;
        const inner = hr.RESULT;
        if (inner !== null && typeof inner === "object") {
          const ir = inner as Record<string, unknown>;
          if (typeof ir.CODE === "string") apiResultCode = ir.CODE;
        }
      }
    }
    if (Array.isArray(b.row)) {
      recordCount = b.row.length;
    }
  }
  return { recordCount, apiResultCode };
}
