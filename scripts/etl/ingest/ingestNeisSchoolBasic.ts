/**
 * 11-3 1차-75 ingest scaffold — NEIS schoolInfo OpenAPI 응답 → IngestedSchoolRecord[].
 *
 * **Pure function** — fs / process.env / 외부 API 호출 의존 0건. 호출자가 NEIS
 * OpenAPI 응답 JSON 문자열을 전달하면 본 함수는 parser/normalizer만 수행한다.
 *
 * **1차-75 scaffold 범위 (CLAUDE.md §17 1차-74+ 계획 단계 합의값)**:
 * - **fetch / axios / URL builder / live API helper 도입 0건** — parser-only.
 * - 실제 NEIS OpenAPI endpoint 호출은 후속 사용자 manual 단계에서만 (Claude Code 호출 0건).
 * - API key 사용·로그 출력 0건. 본 모듈은 key를 받지 않으며 key 의존도 0.
 * - frontend(src/*)에서 본 모듈을 import해 client bundle에 포함시키는 일은 없도록 한다
 *   (scripts/etl/ 경로는 Node 실행 전용).
 *
 * **응답 처리 정책**:
 * - NEIS schoolInfo wrapper: `{ schoolInfo: [{ head: [...] }, { row: [...] }] }`
 *   - head[0].list_total_count / head[1].RESULT.CODE 보존 (meta로 expose)
 *   - body.row 배열을 매핑 대상으로 사용
 * - 최상위가 `{ RESULT: { CODE, MESSAGE } }` (error response — wrapper 없음):
 *   - CODE === "INFO-200" → 빈 records + `info` issue ("해당 데이터 없음" 안내)
 *   - 그 외 → 빈 records + `warning` issue (잘못된 요청 변수 등 API error)
 * - 최상위가 빈 객체 `{}` 또는 schoolInfo 부재 → 빈 records (issue 0건)
 * - JSON.parse 실패 → 한국어 메시지로 throw
 *
 * **PII 차단 (CLAUDE.md §5 정합)**:
 * - NEIS schoolInfo OpenAPI 응답은 기관(학교) 단위라 학생/보호자 PII 부재.
 * - 그러나 다른 NEIS endpoint(학생 정보 등) 응답을 잘못 ingest해도 안전하도록,
 *   IngestedSchoolRecord 슬롯 외 필드는 자동 누락 (ingestSchools.ts 1차-1 정책 일관).
 *
 * **매핑 정책 (NEIS schoolInfo → IngestedSchoolRecord)**:
 *
 * | NEIS 필드          | IngestedSchoolRecord 필드 | 비고 |
 * |---|---|---|
 * | SD_SCHUL_CODE     | neisSchoolCode + schoolId | `schoolId = "school:neis:${SD_SCHUL_CODE}"` |
 * | SCHUL_NM          | schoolName                | |
 * | SCHUL_KND_SC_NM   | schoolLevel               | 한글 그대로 ("초등학교" 등) — cleanSchools 1차-7 한글 매핑이 영문 canonical 변환 |
 * | FOND_SC_NM        | establishmentType         | 한글 그대로 ("공립" 등) — cleanSchools 1차-7 매핑 |
 * | ORG_RDNMA         | address                   | 도로명 주소 |
 * | LCTN_SC_NM        | sidoName                  | 시도 명 |
 * | (없음)            | schoolType                | null — NEIS schoolInfo 응답에 일반/특수 구분 별도 필드 없음 |
 * | (없음)            | sigunguName               | null — 별도 G admin_codes lookup으로 master.real 단계에서 부여 |
 * | (없음)            | latitude / longitude      | null — 좌표 별도 geocoding 단계 |
 *
 * **license 정책 (1차-2 source-based 분기 동형, CLAUDE.md §17.5)**:
 * - `source.startsWith("real:")` → `license: "unknown"`
 * - 그 외 (`"fixture:..."` 등) → `license: "demo-only"`
 * - 공공누리 유형 자동 가정 0건 — 사용자가 사람 검토 후 수동 갱신
 *
 * **본 모듈을 frontend(src/*)에서 import 금지** — scripts/etl/ 경로의 Node 전용
 * 함수. Vite client bundle에는 절대 포함되지 않아야 함 (정책 위반 시 회귀 테스트로
 * 검출 가능).
 */

import type { DataQualityIssue } from "../../../src/types";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface IngestNeisSchoolBasicInput {
  /** UTF-8 JSON 문자열 — NEIS schoolInfo OpenAPI 응답 또는 test fixture. */
  text: string;
  /**
   * 산출물 meta.source 라벨. 후속 단계에서 실 API 응답은 `"real:neis-openapi-school-basic"`,
   * test fixture는 `"fixture:B-neis-school-basic"` 형태로 사용 권장.
   */
  source: string;
  /** ISO 8601, 결정적 동작용 override. 미주입 시 `new Date().toISOString()`. */
  collectedAt?: string;
}

/**
 * 1차-1 `IngestedSchoolRecord` shape를 그대로 재사용 (scripts/etl/ingest/ingestSchools.ts).
 * 별도 local interface 정의 0건 — cleanSchools / buildSchoolMasterReal로 이어지는
 * downstream pipeline과 완전 호환.
 */
export interface IngestedNeisSchoolRecord {
  schoolId: string;
  neisSchoolCode: string | null;
  schoolName: string;
  schoolLevel: string;
  schoolType: string | null;
  establishmentType: string | null;
  address: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface IngestNeisSchoolBasicResult {
  schoolRecords: IngestedNeisSchoolRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: string;
    sourcePolicyStatus: "pending-real-source-review";
    license: "demo-only" | "unknown";
    collectedAt: string;
    schoolRecordCount: number;
    issueCount: number;
    /**
     * NEIS API response의 `head.RESULT.CODE` (예: "INFO-000" 정상 / "INFO-200" 데이터 없음 /
     * "ERROR-300" 등). 디버그·라이선스 추적 용도. RESULT 부재 시 undefined.
     */
    apiResultCode?: string;
    /**
     * NEIS API response의 `head.list_total_count`. 페이지네이션 검증·로깅 용도.
     * 부재 또는 NaN 시 undefined.
     */
    apiTotalCount?: number;
  };
}

// ─── ingest entry ─────────────────────────────────────────────────────────
export function ingestNeisSchoolBasic(
  input: IngestNeisSchoolBasicInput,
): IngestNeisSchoolBasicResult {
  const collectedAt = input.collectedAt ?? new Date().toISOString();

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `[ingestNeisSchoolBasic] JSON parse 실패: ${msg}. 입력은 NEIS schoolInfo OpenAPI 응답 또는 test fixture여야 합니다.`,
      { cause: e },
    );
  }

  const issues: DataQualityIssue[] = [];

  const { rows, apiResultCode, apiResultMessage, apiTotalCount } =
    extractNeisRows(parsed);

  // RESULT.CODE 기반 issue 발행 (records=빈 배열인 케이스)
  if (rows.length === 0 && apiResultCode !== undefined && apiResultCode !== "INFO-000") {
    if (apiResultCode === "INFO-200") {
      issues.push({
        severity: "info",
        field: "apiResultCode",
        message: `NEIS API 응답 INFO-200: ${apiResultMessage ?? "해당하는 데이터가 없습니다."}`,
        datasetCategory: "B",
        source: input.source,
      });
    } else {
      issues.push({
        severity: "warning",
        field: "apiResultCode",
        message: `NEIS API 응답 ${apiResultCode}: ${apiResultMessage ?? "알 수 없는 응답"}`,
        datasetCategory: "B",
        source: input.source,
      });
    }
  }

  const schoolRecords: IngestedNeisSchoolRecord[] = rows.map(mapNeisRowToSchool);

  const license: "demo-only" | "unknown" = input.source.startsWith("real:")
    ? "unknown"
    : "demo-only";

  return {
    schoolRecords,
    issues,
    meta: {
      source: input.source,
      sourcePolicyStatus: "pending-real-source-review",
      license,
      collectedAt,
      schoolRecordCount: schoolRecords.length,
      issueCount: issues.length,
      apiResultCode,
      apiTotalCount,
    },
  };
}

// ─── helpers (private) ────────────────────────────────────────────────────

interface NeisExtractResult {
  rows: Record<string, unknown>[];
  apiResultCode?: string;
  apiResultMessage?: string;
  apiTotalCount?: number;
}

function extractNeisRows(parsed: unknown): NeisExtractResult {
  if (parsed === null || typeof parsed !== "object") {
    return { rows: [] };
  }
  const obj = parsed as Record<string, unknown>;

  // Top-level error: { RESULT: { CODE, MESSAGE } } — wrapper 없음
  const topLevelResult = readResult(obj.RESULT);
  if (topLevelResult !== undefined) {
    return {
      rows: [],
      apiResultCode: topLevelResult.code,
      apiResultMessage: topLevelResult.message,
    };
  }

  // Standard wrapper: { schoolInfo: [{ head: [...] }, { row: [...] }] }
  const schoolInfo = obj.schoolInfo;
  if (!Array.isArray(schoolInfo) || schoolInfo.length === 0) {
    return { rows: [] };
  }

  let rows: Record<string, unknown>[] = [];
  let apiResultCode: string | undefined;
  let apiResultMessage: string | undefined;
  let apiTotalCount: number | undefined;

  for (const block of schoolInfo) {
    if (block === null || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;

    // head block: { head: [{ list_total_count: N }, { RESULT: { ... } }] }
    if (Array.isArray(b.head)) {
      for (const headItem of b.head) {
        if (headItem === null || typeof headItem !== "object") continue;
        const h = headItem as Record<string, unknown>;
        if (typeof h.list_total_count === "number" && !Number.isNaN(h.list_total_count)) {
          apiTotalCount = h.list_total_count;
        }
        const inner = readResult(h.RESULT);
        if (inner !== undefined) {
          apiResultCode = inner.code;
          apiResultMessage = inner.message;
        }
      }
    }

    // body block: { row: [...] }
    if (Array.isArray(b.row)) {
      const rawRows = b.row.filter(
        (r): r is Record<string, unknown> => r !== null && typeof r === "object",
      );
      rows = rawRows;
    }
  }

  return { rows, apiResultCode, apiResultMessage, apiTotalCount };
}

function readResult(value: unknown): { code: string; message?: string } | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  if (typeof r.CODE !== "string") return undefined;
  return {
    code: r.CODE,
    message: typeof r.MESSAGE === "string" ? r.MESSAGE : undefined,
  };
}

function mapNeisRowToSchool(row: Record<string, unknown>): IngestedNeisSchoolRecord {
  const neisSchoolCode =
    typeof row.SD_SCHUL_CODE === "string" && row.SD_SCHUL_CODE.length > 0
      ? row.SD_SCHUL_CODE
      : null;
  const schoolId =
    neisSchoolCode !== null ? `school:neis:${neisSchoolCode}` : "";
  return {
    schoolId,
    neisSchoolCode,
    schoolName: typeof row.SCHUL_NM === "string" ? row.SCHUL_NM : "",
    schoolLevel:
      typeof row.SCHUL_KND_SC_NM === "string" ? row.SCHUL_KND_SC_NM : "other",
    // NEIS schoolInfo는 schoolType(일반/특수 구분) 별도 필드 부재 → null
    schoolType: null,
    establishmentType:
      typeof row.FOND_SC_NM === "string" ? row.FOND_SC_NM : null,
    address: typeof row.ORG_RDNMA === "string" ? row.ORG_RDNMA : null,
    sidoName: typeof row.LCTN_SC_NM === "string" ? row.LCTN_SC_NM : null,
    // NEIS schoolInfo는 시군구·좌표 별도 필드 부재 → null (master.real G lookup 단계로 보류)
    sigunguName: null,
    latitude: null,
    longitude: null,
  };
}
