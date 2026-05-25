/**
 * 11-2 1차-17 ingest — 행안부 KIKmix fixed-width 텍스트 → 행정동↔법정동 매핑 records 산출.
 *
 * KIKmix(8 컬럼, CP949 fixed-width)는 행정동과 법정동의 매핑 pair를 행 단위로 보유.
 * 1 행정동이 N개 법정동에 매핑되는 1:N 관계가 일반적 (예: 청운효자동 → 청운동·신교동·궁정동·...).
 *
 * **Pure function** — fs / process.env / 외부 API 의존 0건. 호출자가 파일 읽기 +
 * CP949 디코드(`io/decodeCp949`)를 처리해 UTF-8 string으로 전달한다.
 *
 * **데이터 출처**: 행정안전부 행정표준코드관리시스템 jscode 패키지의 KIKmix
 * (행정동코드 + 법정동코드 매핑, fixed-width 텍스트, CP949).
 *
 * 헤더 (8 컬럼):
 *   행정동코드 시도명 시군구명 읍면동명 법정동코드 동리명 생성일자 말소일자
 *   - 읍면동명 컬럼 = 행정동명 (KIKcd_H 헤더와 동일)
 *   - 동리명 컬럼  = 법정동명 (KIKcd_B "읍면동명"+"동리명"이 합쳐진 의미)
 *
 * **분류 정책 (1차-17 사용자 합의값)**:
 *   - 말소 행 (`parseExpirationDate(말소일자) === true`) → 제외 + info issue.
 *   - 형식 위반 (hjdCode 또는 legalDongCode 10자리 아님) → 제외 + warning issue.
 *   - 시도 행 (`hjdCode.endsWith("00000000") AND legalDongCode.endsWith("00000000")`)
 *       → 제외, issue 없음.
 *   - 시군구 행 (양쪽 `endsWith("00000")` + 시군구명 != "" + 읍면동명 == "")
 *       → 제외, issue 없음.
 *   - sigungu prefix 불일치 (`hjdCode.slice(0,5) !== legalDongCode.slice(0,5)`)
 *       → records **포함** + warning issue (정보 보존 우선).
 *   - 중복 매핑 (동일 (hjdCode, legalDongCode) pair 2회 이상 등장)
 *       → records **포함** + info issue (2회차부터 issue 발행).
 *   - 그 외 (정상 매핑 행) → mappingRecords 추가.
 *
 * **meta 정책 (CLAUDE.md §16.6 정합, 1차-15·1차-16 ingest와 일관)**:
 *   - `license: "unknown"` — 사용자가 행안부 다운로드 페이지에서 라이선스 확인 전까지 미확정.
 *   - `sourcePolicyStatus: "pending-real-source-review"`.
 *   - `source: "real:kikmix"`.
 *   - meta 6 key (ingestKikcdB 7키 / ingestKikcdH 6키와 일관 — mapping record는 단일 도메인 카운트).
 *
 * **issue 분배** (1차-17 §10):
 *   - 본 ingest의 모든 issue는 호출자(runEtl)가 hjd_legal_dong_mapping.clean.json에만 첨부.
 *   - admin_codes / legal_dong_codes / hjd_codes 산출물에는 섞이지 않음.
 */

import type { DataQualityIssue } from "../../../src/types";
import { isValidLegalDongCode, parseExpirationDate } from "./guards";
import { parseFixedWidthHeader, type ColumnSpec } from "./parseFixedWidthHeader";
import { sliceByDisplayWidth } from "./sliceByDisplayWidth";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface IngestKikmixInput {
  /**
   * CP949 디코드 후 UTF-8 string. 호출자가 `io/decodeCp949` 등으로 디코드 책임.
   * BOM은 1차-17 KIKmix에서 발견되지 않았으나 안전망으로 본 함수가 strip.
   */
  text: string;
  /** ISO 8601, 결정적 동작용 override. 미주입 시 `new Date().toISOString()`. */
  collectedAt?: string;
}

/**
 * 행정동 ↔ 법정동 매핑 1 pair.
 * 단일 region이 아니라 두 region의 매핑이므로 `regionCode` / `regionCodeType` 필드 부재.
 */
export interface KikmixMappingRecord {
  hjdCode: string; // 10자리 행정동코드
  legalDongCode: string; // 10자리 법정동코드
  sidoCode: string; // 2자리 (hjdCode.slice(0, 2))
  sigunguCode: string; // 5자리 (hjdCode.slice(0, 5), 정상 시 legalDongCode.slice(0, 5)와 동일)
  sidoName: string;
  sigunguName: string;
  hjdName: string; // KIKmix "읍면동명" 컬럼 → 행정동명
  legalDongName: string; // KIKmix "동리명" 컬럼 → 법정동명
}

/**
 * ingestKikmix 통합 결과.
 *
 * meta shape는 정확히 6개 key만 보유 (RED 테스트로 강제).
 * 추가 필드(originalSource, rawFileName 등) 금지 (1차-17 사용자 합의값).
 */
export interface IngestKikmixResult {
  mappingRecords: KikmixMappingRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: "real:kikmix";
    sourcePolicyStatus: "pending-real-source-review";
    license: "unknown";
    collectedAt: string;
    mappingRecordCount: number;
    issueCount: number;
  };
}

// ─── 헤더 정의 ─────────────────────────────────────────────────────────────
const REQUIRED_HEADERS = [
  "행정동코드",
  "시도명",
  "시군구명",
  "읍면동명",
  "법정동코드",
  "동리명",
  "생성일자",
  "말소일자",
] as const;

// ─── ingest entry ─────────────────────────────────────────────────────────
export function ingestKikmix(input: IngestKikmixInput): IngestKikmixResult {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const mappingRecords: KikmixMappingRecord[] = [];
  const issues: DataQualityIssue[] = [];
  // 중복 매핑 감지용 — `${hjdCode}:${legalDongCode}` 키.
  const seenPairs = new Set<string>();

  const lines = splitLines(input.text);
  if (lines.length === 0) {
    return buildResult({ mappingRecords, issues, collectedAt });
  }

  const headerLine = lines[0];
  if (headerLine.trim().length === 0) {
    return buildResult({ mappingRecords, issues, collectedAt });
  }

  const specs = parseFixedWidthHeader(headerLine, REQUIRED_HEADERS);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    const row = parseRow(line, specs);
    const hjdCode = row["행정동코드"];
    const legalDongCode = row["법정동코드"];
    const sidoName = row["시도명"];
    const sigunguName = row["시군구명"];
    const hjdName = row["읍면동명"];
    const legalDongName = row["동리명"];
    const expirationDate = row["말소일자"];

    // 1) 말소 행 — 제외 + info issue
    if (parseExpirationDate(expirationDate)) {
      issues.push({
        severity: "info",
        datasetCategory: "G",
        field: "abolished",
        message: `KIKmix 매핑 (${hjdCode}, ${legalDongCode})이 말소(말소일자=${expirationDate}) 상태로 records에서 제외됨`,
        source: "real:kikmix",
      });
      continue;
    }

    // 2) 형식 위반 — hjdCode 10자리 아니면 제외 + warning issue
    if (!isValidLegalDongCode(hjdCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "hjdCode",
        message: `행정동코드가 10자리 숫자 형식이 아니라 records에서 제외됨: '${hjdCode}'`,
        source: "real:kikmix",
      });
      continue;
    }
    // 2-bis) legalDongCode 형식 위반
    if (!isValidLegalDongCode(legalDongCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "legalDongCode",
        message: `법정동코드가 10자리 숫자 형식이 아니라 records에서 제외됨: '${legalDongCode}'`,
        source: "real:kikmix",
      });
      continue;
    }

    // 3) 시도 행 — 양쪽 코드 모두 endsWith "00000000" → 제외, issue 없음
    if (hjdCode.endsWith("00000000") && legalDongCode.endsWith("00000000")) {
      continue;
    }

    // 4) 시군구 행 — 양쪽 endsWith "00000" + 시군구명 != "" + 읍면동명 == "" → 제외, issue 없음
    if (
      hjdCode.endsWith("00000") &&
      legalDongCode.endsWith("00000") &&
      sigunguName.length > 0 &&
      hjdName.length === 0
    ) {
      continue;
    }

    // 5) sigungu prefix 불일치 — records 포함 + warning issue
    if (hjdCode.slice(0, 5) !== legalDongCode.slice(0, 5)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "sigunguCode",
        message: `행정동코드 ${hjdCode}(시군구 ${hjdCode.slice(0, 5)})와 법정동코드 ${legalDongCode}(시군구 ${legalDongCode.slice(0, 5)})의 시군구 prefix 불일치`,
        source: "real:kikmix",
      });
      // fallthrough — records에 포함
    }

    // 6) 중복 매핑 — records 포함 + info issue (2회차부터 발행)
    const pairKey = `${hjdCode}:${legalDongCode}`;
    if (seenPairs.has(pairKey)) {
      issues.push({
        severity: "info",
        datasetCategory: "G",
        field: "duplicate",
        message: `중복 KIKmix 매핑: (hjd=${hjdCode}, legalDong=${legalDongCode})`,
        source: "real:kikmix",
      });
      // fallthrough — records에 포함
    } else {
      seenPairs.add(pairKey);
    }

    // 7) 매핑 record 추가. sidoCode/sigunguCode는 hjdCode 기준 파생 (정상 시 legalDongCode와 일치).
    mappingRecords.push({
      hjdCode,
      legalDongCode,
      sidoCode: hjdCode.slice(0, 2),
      sigunguCode: hjdCode.slice(0, 5),
      sidoName,
      sigunguName,
      hjdName,
      legalDongName,
    });
  }

  return buildResult({ mappingRecords, issues, collectedAt });
}

// ─── helpers ───────────────────────────────────────────────────────────────
function splitLines(text: string): string[] {
  if (text.length === 0) return [];
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (stripped.length === 0) return [];
  return stripped.split(/\r?\n/);
}

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
  mappingRecords: KikmixMappingRecord[];
  issues: DataQualityIssue[];
  collectedAt: string;
}): IngestKikmixResult {
  const { mappingRecords, issues, collectedAt } = parts;
  return {
    mappingRecords,
    issues,
    meta: {
      source: "real:kikmix",
      sourcePolicyStatus: "pending-real-source-review",
      license: "unknown",
      collectedAt,
      mappingRecordCount: mappingRecords.length,
      issueCount: issues.length,
    },
  };
}
