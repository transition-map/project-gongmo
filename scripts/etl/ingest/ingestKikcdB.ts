/**
 * 11-2 1차-15 ingest — 행안부 KIKcd_B fixed-width 텍스트 → 통합 record 산출.
 *
 * 한 파일에서 두 record 묶음을 **동시에** 산출한다:
 *   1. `legalDongRecords` — 진정 법정동 단위 (읍면동·리). `RawLegalDongRecord` shape.
 *   2. `adminRecords`    — 시군구 5자리 단위 (KIKcd_B에서 파생). `RawAdminCodeRecord` shape.
 *
 * **Pure function** — fs / process.env / 외부 API 의존 0건. 호출자가 파일 읽기 +
 * CP949 디코드(`io/decodeCp949`)를 처리해 UTF-8 string으로 전달한다.
 *
 * **데이터 출처**: 행정안전부 행정표준코드관리시스템 jscode 패키지의 KIKcd_B
 * (법정동코드 10자리, fixed-width 텍스트, CP949 인코딩).
 *
 * **분류 정책 (1차-15)**:
 *   - 시도 행 (`endsWith("00000000")`) → 둘 다 제외 (시도 단위는 본 단계 범위 외).
 *   - 시군구 행 (`endsWith("00000")` + 시군구명 != "" + 읍면동명 == "")
 *       → `adminRecords` 1건 추가 (regionCode = code.slice(0, 5)).
 *       → `legalDongRecords` 제외 (legalDong은 읍면동/리 단위 한정).
 *   - 읍면동/리 행 (`endsWith("00000")` 아닌 유효 10자리) → `legalDongRecords` 1건.
 *   - 말소 행 (`parseExpirationDate(말소일자) === true`) → 둘 다 제외 + info issue.
 *   - 형식 위반 행 (10자리 숫자 아님) → 둘 다 제외 + warning issue.
 *
 * **meta 정책 (CLAUDE.md §16.6 정합)**:
 *   - `license: "unknown"` — 사용자가 행안부 다운로드 페이지에서 라이선스 확인 전까지 미확정.
 *   - `sourcePolicyStatus: "pending-real-source-review"` — 사용자 검토 워크플로 대기.
 *   - 두 필드 값공간은 분리 — license는 라이선스 종류, sourcePolicyStatus는 리뷰 상태.
 *
 * **fixed-width parser 한계 (1차-15)**:
 *   - 따옴표·escape·멀티라인 셀 미지원 (KIKcd_B는 단순 공백 패딩이라 안전).
 *   - 헤더 동적 검출만 — HWPX Layout 사양서 기반 상수 fallback은 1차-16+ 보강 후보.
 */

import type { DataQualityIssue, RegionCodeType } from "../../../src/types";
import { isValidLegalDongCode, parseExpirationDate } from "./guards";
import { parseFixedWidthHeader, type ColumnSpec } from "./parseFixedWidthHeader";
import { sliceByDisplayWidth } from "./sliceByDisplayWidth";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface IngestKikcdBInput {
  /**
   * CP949 디코드 후 UTF-8 string. 호출자가 `io/decodeCp949` 등으로 디코드 책임.
   * BOM은 1차-15 KIKcd_B에서 발견되지 않았으나, 만약 포함되면 호출자가 strip한 후 전달.
   */
  text: string;
  /**
   * ISO 8601, 결정적 동작용 override. 미주입 시 `new Date().toISOString()`.
   * 테스트는 결정성을 위해 명시적으로 주입한다.
   */
  collectedAt?: string;
}

/**
 * KIKcd_B에서 파생한 법정동 (읍면동·리) record.
 * 1차-2 `RawLegalDongRecord`와 shape 호환 — 후속 cleaner(cleanLegalDongCodes)에
 * 그대로 주입 가능.
 */
export interface KikcdBLegalDongRecord {
  regionCode: string; // 10자리 = legalDongCode
  regionCodeType: RegionCodeType; // 항상 "legalDong"
  sidoCode: string; // 2자리
  sigunguCode: string; // 5자리 (slice 0..5)
  legalDongCode: string; // 10자리 전체
  sidoName: string;
  sigunguName: string;
  emdName: string;
}

/**
 * KIKcd_B에서 파생한 시군구 5자리 admin record.
 * 1차-1 `RawAdminCodeRecord`와 shape 호환 — 후속 cleaner(cleanRegionCodes)에
 * 그대로 주입 가능.
 */
export interface KikcdBAdminRecord {
  regionCode: string; // 5자리 = sigunguCode
  regionCodeType: RegionCodeType; // 항상 "sigungu"
  sidoCode: string; // 2자리
  sidoName: string;
  sigunguCode: string; // 5자리
  sigunguName: string;
}

/**
 * ingestKikcdB 통합 결과.
 *
 * meta shape는 정확히 7개 key만 보유 (RED 테스트로 강제).
 * 1차-1의 `originalSource` 같은 추가 필드는 본 ingest에서 사용하지 않는다.
 */
export interface IngestKikcdBResult {
  legalDongRecords: KikcdBLegalDongRecord[];
  adminRecords: KikcdBAdminRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: "real:kikcd-b";
    sourcePolicyStatus: "pending-real-source-review";
    license: "unknown";
    collectedAt: string;
    legalDongRecordCount: number;
    adminRecordCount: number;
    issueCount: number;
  };
}

// ─── 헤더 정의 ─────────────────────────────────────────────────────────────
const REQUIRED_HEADERS = [
  "법정동코드",
  "시도명",
  "시군구명",
  "읍면동명",
  "동리명",
  "생성일자",
  "말소일자",
] as const;

// ─── ingest entry ─────────────────────────────────────────────────────────
export function ingestKikcdB(input: IngestKikcdBInput): IngestKikcdBResult {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const legalDongRecords: KikcdBLegalDongRecord[] = [];
  const adminRecords: KikcdBAdminRecord[] = [];
  const issues: DataQualityIssue[] = [];

  const lines = splitLines(input.text);
  if (lines.length === 0) {
    return buildResult({ legalDongRecords, adminRecords, issues, collectedAt });
  }

  // 헤더 라인이 비어 있으면 case 1 (빈 입력)과 동일 — empty 결과 반환.
  // 본 ingest는 헤더 누락을 throw로 처리 (1차-1·1차-2 정책과 일관)하지만,
  // 빈 헤더 라인은 빈 입력 시그니처(empty string)로 간주.
  const headerLine = lines[0];
  if (headerLine.trim().length === 0) {
    return buildResult({ legalDongRecords, adminRecords, issues, collectedAt });
  }

  const specs = parseFixedWidthHeader(headerLine, REQUIRED_HEADERS);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    const row = parseRow(line, specs);
    const legalDongCode = row["법정동코드"];
    const sidoName = row["시도명"];
    const sigunguName = row["시군구명"];
    const emdName = row["읍면동명"];
    const expirationDate = row["말소일자"];

    // 1) 말소 행 — 둘 다 제외 + info issue
    if (parseExpirationDate(expirationDate)) {
      issues.push({
        severity: "info",
        datasetCategory: "G",
        field: "abolished",
        message: `법정동 코드 ${legalDongCode || "(코드 부재)"}가 말소(말소일자=${expirationDate}) 상태로 records에서 제외됨`,
        source: "real:kikcd-b",
      });
      continue;
    }

    // 2) 형식 위반 — 10자리 숫자 아니면 warning issue + 제외
    if (!isValidLegalDongCode(legalDongCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "legalDongCode",
        message: `법정동코드가 10자리 숫자 형식이 아니라 records에서 제외됨: '${legalDongCode}'`,
        source: "real:kikcd-b",
      });
      continue;
    }

    // 3) 시도 행 (endsWith "00000000") — 둘 다 제외, issue 없음
    if (legalDongCode.endsWith("00000000")) {
      continue;
    }

    // 4) 시군구 행 (endsWith "00000" + 시군구명 != "" + 읍면동명 == "")
    //    → adminRecords만 추가, legalDongRecords 제외
    if (
      legalDongCode.endsWith("00000") &&
      sigunguName.length > 0 &&
      emdName.length === 0
    ) {
      adminRecords.push({
        regionCode: legalDongCode.slice(0, 5),
        regionCodeType: "sigungu",
        sidoCode: legalDongCode.slice(0, 2),
        sidoName,
        sigunguCode: legalDongCode.slice(0, 5),
        sigunguName,
      });
      continue;
    }

    // 5) 그 외 (읍면동/리 행) → legalDongRecords만 추가
    legalDongRecords.push({
      regionCode: legalDongCode,
      regionCodeType: "legalDong",
      sidoCode: legalDongCode.slice(0, 2),
      sigunguCode: legalDongCode.slice(0, 5),
      legalDongCode,
      sidoName,
      sigunguName,
      emdName,
    });
  }

  return buildResult({ legalDongRecords, adminRecords, issues, collectedAt });
}

// ─── helpers ───────────────────────────────────────────────────────────────
/**
 * 텍스트를 줄 단위로 분리.
 * - UTF-8 BOM(U+FEFF) prefix 자동 제거 (1차-15 KIKcd_B는 BOM 없음이지만 안전망).
 * - CRLF / LF 모두 처리.
 */
function splitLines(text: string): string[] {
  if (text.length === 0) return [];
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (stripped.length === 0) return [];
  return stripped.split(/\r?\n/);
}

/**
 * 한 데이터 행을 ColumnSpec[]으로 슬라이스하여 `{ [key]: trimmed value }` 반환.
 * trim 후 빈 셀은 빈 문자열.
 */
function parseRow(
  line: string,
  specs: ColumnSpec[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of specs) {
    out[spec.key] = sliceByDisplayWidth(line, spec.displayStart, spec.displayEnd).trim();
  }
  return out;
}

function buildResult(parts: {
  legalDongRecords: KikcdBLegalDongRecord[];
  adminRecords: KikcdBAdminRecord[];
  issues: DataQualityIssue[];
  collectedAt: string;
}): IngestKikcdBResult {
  const { legalDongRecords, adminRecords, issues, collectedAt } = parts;
  return {
    legalDongRecords,
    adminRecords,
    issues,
    meta: {
      source: "real:kikcd-b",
      sourcePolicyStatus: "pending-real-source-review",
      license: "unknown",
      collectedAt,
      legalDongRecordCount: legalDongRecords.length,
      adminRecordCount: adminRecords.length,
      issueCount: issues.length,
    },
  };
}
