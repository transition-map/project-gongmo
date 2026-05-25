/**
 * 11-2 1차-16 ingest — 행안부 KIKcd_H fixed-width 텍스트 → 행정동 record 산출.
 *
 * KIKcd_H(행정동코드 10자리, CP949 fixed-width)에서 **행정동 단위 record만** 산출한다.
 * KIKcd_B의 `ingestKikcdB`와는 별도 함수 — 행정동(haengjeongDong)과 법정동(legalDong)은
 * 의미가 다른 코드 체계이므로 도메인 분리.
 *
 * **Pure function** — fs / process.env / 외부 API 의존 0건. 호출자가 파일 읽기 +
 * CP949 디코드(`io/decodeCp949`)를 처리해 UTF-8 string으로 전달한다.
 *
 * **데이터 출처**: 행정안전부 행정표준코드관리시스템 jscode 패키지의 KIKcd_H
 * (행정동코드 10자리, fixed-width 텍스트, CP949). 1차-14 분석으로 헤더가 KIKcd_B와
 * 다름을 확인 — "동리명" 컬럼이 없고 컬럼 6개 (KIKcd_B는 7개).
 *
 * **분류 정책 (1차-16 사용자 합의값)**:
 *   - 시도 행 (`endsWith("00000000")`) → 제외, issue 없음.
 *   - 시군구 행 (`endsWith("00000")` + 시군구명 != "" + 읍면동명 == "")
 *       → 제외, issue 없음. (admin records는 KIKcd_B single source — 중복 회피.)
 *   - 행정동 행 (그 외 유효 10자리, 읍면동명 != "") → `hjdRecords` 1건 추가.
 *   - 말소 행 (`parseExpirationDate(말소일자) === true`) → 제외 + info issue.
 *   - 형식 위반 행 (10자리 숫자 아님) → 제외 + warning issue.
 *
 * **meta 정책 (CLAUDE.md §16.6 정합, 1차-15 ingestKikcdB와 일관)**:
 *   - `license: "unknown"` — 사용자가 행안부 다운로드 페이지에서 라이선스 확인 전까지 미확정.
 *   - `sourcePolicyStatus: "pending-real-source-review"`.
 *   - `source: "real:kikcd-h"`.
 *   - meta 6 key (ingestKikcdB는 7키 — admin 파생 안 하므로 adminRecordCount 부재).
 */

import type { DataQualityIssue, RegionCodeType } from "../../../src/types";
import { isValidLegalDongCode, parseExpirationDate } from "./guards";
import { parseFixedWidthHeader, type ColumnSpec } from "./parseFixedWidthHeader";
import { sliceByDisplayWidth } from "./sliceByDisplayWidth";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface IngestKikcdHInput {
  text: string;
  collectedAt?: string;
}

export interface KikcdHRecord {
  regionCode: string; // 10자리 = hjdCode
  regionCodeType: RegionCodeType; // 항상 "haengjeongDong"
  sidoCode: string; // 2자리
  sigunguCode: string; // 5자리 (slice 0..5)
  hjdCode: string; // 10자리 전체
  sidoName: string;
  sigunguName: string;
  hjdName: string; // 행정동명 (KIKcd_H의 "읍면동명" 컬럼)
}

export interface IngestKikcdHResult {
  hjdRecords: KikcdHRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: "real:kikcd-h";
    sourcePolicyStatus: "pending-real-source-review";
    license: "unknown";
    collectedAt: string;
    hjdRecordCount: number;
    issueCount: number;
  };
}

// ─── 헤더 정의 ─────────────────────────────────────────────────────────────
// KIKcd_H는 KIKcd_B와 달리 "동리명" 컬럼이 없음 (행정동은 리 단위 부재).
const REQUIRED_HEADERS = [
  "행정동코드",
  "시도명",
  "시군구명",
  "읍면동명",
  "생성일자",
  "말소일자",
] as const;

// ─── ingest entry ─────────────────────────────────────────────────────────
export function ingestKikcdH(input: IngestKikcdHInput): IngestKikcdHResult {
  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const hjdRecords: KikcdHRecord[] = [];
  const issues: DataQualityIssue[] = [];

  const lines = splitLines(input.text);
  if (lines.length === 0) {
    return buildResult({ hjdRecords, issues, collectedAt });
  }

  const headerLine = lines[0];
  if (headerLine.trim().length === 0) {
    return buildResult({ hjdRecords, issues, collectedAt });
  }

  const specs = parseFixedWidthHeader(headerLine, REQUIRED_HEADERS);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;

    const row = parseRow(line, specs);
    const hjdCode = row["행정동코드"];
    const sidoName = row["시도명"];
    const sigunguName = row["시군구명"];
    const hjdName = row["읍면동명"];
    const expirationDate = row["말소일자"];

    // 1) 말소 행 — 제외 + info issue
    if (parseExpirationDate(expirationDate)) {
      issues.push({
        severity: "info",
        datasetCategory: "G",
        field: "abolished",
        message: `행정동 코드 ${hjdCode || "(코드 부재)"}가 말소(말소일자=${expirationDate}) 상태로 records에서 제외됨`,
        source: "real:kikcd-h",
      });
      continue;
    }

    // 2) 형식 위반 — 10자리 숫자 아니면 warning issue + 제외
    if (!isValidLegalDongCode(hjdCode)) {
      issues.push({
        severity: "warning",
        datasetCategory: "G",
        field: "hjdCode",
        message: `행정동코드가 10자리 숫자 형식이 아니라 records에서 제외됨: '${hjdCode}'`,
        source: "real:kikcd-h",
      });
      continue;
    }

    // 3) 시도 행 (endsWith "00000000") — 제외, issue 없음
    if (hjdCode.endsWith("00000000")) {
      continue;
    }

    // 4) 시군구 행 (endsWith "00000" + 시군구명 != "" + 읍면동명 == "")
    //    → 제외, issue 없음. admin은 KIKcd_B single source 유지 (1차-16 합의).
    if (
      hjdCode.endsWith("00000") &&
      sigunguName.length > 0 &&
      hjdName.length === 0
    ) {
      continue;
    }

    // 5) 그 외 — 행정동 행 → hjdRecords 추가
    hjdRecords.push({
      regionCode: hjdCode,
      regionCodeType: "haengjeongDong",
      sidoCode: hjdCode.slice(0, 2),
      sigunguCode: hjdCode.slice(0, 5),
      hjdCode,
      sidoName,
      sigunguName,
      hjdName,
    });
  }

  return buildResult({ hjdRecords, issues, collectedAt });
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
  hjdRecords: KikcdHRecord[];
  issues: DataQualityIssue[];
  collectedAt: string;
}): IngestKikcdHResult {
  const { hjdRecords, issues, collectedAt } = parts;
  return {
    hjdRecords,
    issues,
    meta: {
      source: "real:kikcd-h",
      sourcePolicyStatus: "pending-real-source-review",
      license: "unknown",
      collectedAt,
      hjdRecordCount: hjdRecords.length,
      issueCount: issues.length,
    },
  };
}
