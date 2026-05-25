/**
 * 11-2 1차-1 ingest — 행정구역(시군구 5자리) CSV → RawAdminCodeRecord[].
 *
 * **Pure function** — fs / process.env / 외부 API 의존 0건. 호출자가 파일 읽기,
 * 인코딩 변환(EUC-KR → UTF-8 등)을 처리한 후 csvText 문자열로 전달한다.
 *
 * **데이터 출처**: 행정안전부 행정표준코드관리시스템(code.go.kr)의 CSV 구조를
 * 참고한 형식. 본 1차-1 단계의 mini fixture는 demo CSV이며, 실제 행안부 원본을
 * 반영하는 단계에서 license / sourcePolicyStatus를 갱신한다.
 *
 * **수기 split parser 한계** (1차-1 시점):
 * - 따옴표로 감싼 필드(`"강남, 구"`)와 멀티라인 필드 미지원.
 * - 시군구명에 쉼표가 포함되는 케이스가 발견되면 별도 보고 후 parser 보강.
 * - 1차-1 mini fixture는 위 케이스 0건이라 안전.
 *
 * **폐지 코드 처리**:
 * - 폐지여부 "Y" 또는 "폐지"인 행은 records에서 제외.
 * - 동시에 DataQualityIssue(info / G / abolished)로 보고.
 * - 후속 cleaner의 5자리 게이트가 다시 한 번 차단 (이중 안전망).
 */

import type {
  DataQualityIssue,
  RegionCodeType,
} from "../../../src/types";
import {
  isValidSidoCode,
  isValidSigunguCode,
  parseAbolishedFlag,
} from "./guards";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface IngestRegionCodesInput {
  /** CSV 본문 (UTF-8 string). caller가 fs 읽기·인코딩 변환·BOM 보존 책임. */
  csvText: string;
  /**
   * ISO 8601, 결정적 동작용 override. 미주입 시 new Date().toISOString().
   * 테스트는 결정성을 위해 명시적으로 주입한다.
   */
  collectedAt?: string;
}

/**
 * 행정구역 시군구 5자리 raw record.
 * 기존 cleanRegionCodes의 입력(RegionCodeInput)과 호환되도록 `regionCode` 키 사용.
 */
export interface RawAdminCodeRecord {
  regionCode: string;          // 5-digit, sigunguCode와 동일 값
  regionCodeType: RegionCodeType;  // 항상 "sigungu"
  sidoCode: string;            // 2-digit
  sidoName: string;
  sigunguCode: string;         // 5-digit
  sigunguName: string;
}

/**
 * ingestRegionCodes 통합 결과.
 *
 * meta.license / sourcePolicyStatus 표기 원칙:
 * - 본 1차-1 mini fixture는 demo CSV이므로 license="demo-only",
 *   sourcePolicyStatus="pending-real-source-review"를 사용한다.
 * - 실 행안부 CSV 다운로드 단계에서 이용조건을 확인한 뒤 갱신.
 */
export interface IngestRegionCodesResult {
  records: RawAdminCodeRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: "demo:admin-code-mini";
    originalSource: "행정안전부 행정표준코드관리시스템(code.go.kr) 구조 참고";
    license: "demo-only";
    sourcePolicyStatus: "pending-real-source-review";
    collectedAt: string;
    recordCount: number;
    issueCount: number;
  };
}

// ─── CSV 헤더 정의 ─────────────────────────────────────────────────────────
const REQUIRED_HEADERS = [
  "시도코드",
  "시도명",
  "시군구코드",
  "시군구명",
  "폐지여부",
] as const;
type HeaderKey = (typeof REQUIRED_HEADERS)[number];

// ─── ingest entry ─────────────────────────────────────────────────────────
/**
 * CSV 본문을 받아 RawAdminCodeRecord array + DataQualityIssue array + meta를 반환.
 *
 * - 빈 csvText / 헤더만 있고 데이터 0행 → records=[], issues=[], throw 안 함.
 * - 필수 헤더 누락 → Error throw (caller가 catch).
 */
export function ingestRegionCodes(
  input: IngestRegionCodesInput,
): IngestRegionCodesResult {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const issues: DataQualityIssue[] = [];
  const records: RawAdminCodeRecord[] = [];

  const lines = splitCsvLines(input.csvText);
  if (lines.length === 0) {
    return buildEmptyResult(collectedAt);
  }

  const headerCells = splitCsvRow(lines[0]);
  const headerIndex = buildHeaderIndex(headerCells);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;
    const cells = splitCsvRow(line);

    const sidoCode = cell(cells, headerIndex, "시도코드");
    const sidoName = cell(cells, headerIndex, "시도명");
    const sigunguCode = cell(cells, headerIndex, "시군구코드");
    const sigunguName = cell(cells, headerIndex, "시군구명");
    const abolishedRaw = cell(cells, headerIndex, "폐지여부");

    // 1) 폐지 처리: records 제외 + issue 보고
    if (parseAbolishedFlag(abolishedRaw)) {
      issues.push({
        severity: "info",
        datasetCategory: "G",
        field: "abolished",
        message: `행정구역 코드 ${sigunguCode || "(코드 부재)"}가 폐지 상태로 ingest records에서 제외됨`,
        source: "demo:admin-code-mini",
      });
      continue;
    }

    // 2) 형식 검증: 시군구코드 5자리·시도코드 2자리 미충족 → issue 후 제외
    if (!isValidSigunguCode(sigunguCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `시군구코드가 5자리 숫자 형식이 아니라 ingest records에서 제외됨: '${sigunguCode}'`,
        source: "demo:admin-code-mini",
      });
      continue;
    }
    if (!isValidSidoCode(sidoCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sidoCode",
        message: `시도코드가 2자리 숫자 형식이 아니라 ingest records에서 제외됨: '${sidoCode}' (시군구 ${sigunguCode})`,
        source: "demo:admin-code-mini",
      });
      continue;
    }

    // 3) RawAdminCodeRecord 누적
    records.push({
      regionCode: sigunguCode,
      regionCodeType: "sigungu",
      sidoCode,
      sidoName,
      sigunguCode,
      sigunguName,
    });
  }

  return {
    records,
    issues,
    meta: {
      source: "demo:admin-code-mini",
      originalSource: "행정안전부 행정표준코드관리시스템(code.go.kr) 구조 참고",
      license: "demo-only",
      sourcePolicyStatus: "pending-real-source-review",
      collectedAt,
      recordCount: records.length,
      issueCount: issues.length,
    },
  };
}

// ─── helpers (수기 CSV 파서) ──────────────────────────────────────────────
/**
 * CSV 본문을 줄 단위로 분리.
 * - UTF-8 BOM (U+FEFF) prefix가 있으면 제거.
 * - CRLF / LF 모두 처리.
 * - trailing whitespace만 있는 줄은 caller가 빈 줄로 판단 가능.
 */
function splitCsvLines(text: string): string[] {
  if (text.length === 0) return [];
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (stripped.length === 0) return [];
  return stripped.split(/\r?\n/);
}

/**
 * CSV 한 행을 쉼표 기준으로 split.
 * 1차-1 한계: 따옴표 감싸기 / 멀티라인 / 쉼표 포함 필드 미지원.
 */
function splitCsvRow(line: string): string[] {
  return line.split(",").map((c) => c.trim());
}

/** 헤더 셀 배열 → 컬럼명 → 인덱스 맵. 필수 컬럼 누락 시 throw. */
function buildHeaderIndex(headerCells: string[]): Record<HeaderKey, number> {
  const trimmed = headerCells.map((c) => c.trim());
  const index = {} as Record<HeaderKey, number>;
  for (const required of REQUIRED_HEADERS) {
    const idx = trimmed.indexOf(required);
    if (idx === -1) {
      throw new Error(
        `ingestRegionCodes: 필수 헤더 '${required}' 누락. CSV 헤더에는 ${REQUIRED_HEADERS.join(", ")}이(가) 모두 포함되어야 합니다.`,
      );
    }
    index[required] = idx;
  }
  return index;
}

/** 한 행에서 컬럼 인덱스로 셀 값을 안전하게 추출. */
function cell(
  cells: string[],
  headerIndex: Record<HeaderKey, number>,
  key: HeaderKey,
): string {
  const idx = headerIndex[key];
  return cells[idx] ?? "";
}

/** 빈 CSV 입력의 표준 응답. */
function buildEmptyResult(collectedAt: string): IngestRegionCodesResult {
  return {
    records: [],
    issues: [],
    meta: {
      source: "demo:admin-code-mini",
      originalSource: "행정안전부 행정표준코드관리시스템(code.go.kr) 구조 참고",
      license: "demo-only",
      sourcePolicyStatus: "pending-real-source-review",
      collectedAt,
      recordCount: 0,
      issueCount: 0,
    },
  };
}
