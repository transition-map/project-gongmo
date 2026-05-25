/**
 * 11-3 1차-1 ingest — B 학교 기본 정보 JSON → IngestedSchoolRecord[] 산출.
 *
 * **Pure function** — fs / process.env / 외부 API 의존 0건. 호출자가 파일 읽기를
 * 처리해 UTF-8 string으로 전달한다.
 *
 * **1차-1 범위**:
 *   - format "json"만 지원 (CSV/XLSX/fixed-width는 1차-6+).
 *   - 입력 JSON array를 whitelist mapping으로 IngestedSchoolRecord shape에 매핑.
 *   - PII 필드(phone/email/principalName/faxNumber/homepageUrl/adminStaffName 등)는
 *     IngestedSchoolRecord에 슬롯이 없어 자동 누락.
 *   - 정규화·dedup·범위 검증·G lookup은 본 ingest에서 수행 X (cleanSchools / master.real로 보류).
 *
 * **meta 정책** (CLAUDE.md §16.6 정합):
 *   - `license`는 `input.source` prefix 기반 자동 분기 (1차-2 신규):
 *     - source가 `"real:"`로 시작 → `license = "unknown"` (사람 라이선스 검증 전까지 미확정)
 *     - 그 외(즉 `"fixture:"` 또는 호출자 정의) → `license = "demo-only"` (1차-1 호환)
 *     - 공공누리 유형 등 실제 라이선스는 자동 가정 X — 사용자가 실 source review 후 수동 갱신
 *   - `sourcePolicyStatus: "pending-real-source-review"` (양쪽 source 모두 동일).
 *   - `source`: 호출자가 입력으로 지정 (1차-1 mini fixture는 `"fixture:B-schools"`,
 *     1차-2 real schools JSON은 `"real:schools-json"`).
 */

import type { DataQualityIssue } from "../../../src/types";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface IngestSchoolsInput {
  /** UTF-8 JSON 텍스트. 호출자가 파일 read 책임. */
  text: string;
  /**
   * 산출물 meta.source 라벨. mini fixture는 "fixture:B-schools".
   * real source 도입 시 "real:schoolinfo" / "real:neis-export" 등으로 확장.
   */
  source: string;
  /** 1차-1은 "json"만 허용. 그 외 값은 한국어 에러로 throw. */
  format: "json" | string;
  /** ISO 8601, 결정적 동작용 override. 미주입 시 `new Date().toISOString()`. */
  collectedAt?: string;
}

/**
 * 학교 1건의 ingest 결과 shape.
 *
 * **PII 차단**: 본 interface에 phone/email/principalName/faxNumber/homepageUrl/
 * adminStaffName 등 PII·불필요 필드 슬롯 0건. raw에 해당 컬럼이 있어도 매핑 시
 * 자동 누락 (CLAUDE.md §5 PII 차단 항목 일관).
 *
 * 좌표 부재 시 latitude/longitude는 `null` (1차-1 정책). 좌표 범위 검증·역지오코딩은
 * cleanSchools / master.real로 보류.
 */
export interface IngestedSchoolRecord {
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

export interface IngestSchoolsResult {
  schoolRecords: IngestedSchoolRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: string;
    sourcePolicyStatus: "pending-real-source-review";
    /**
     * 11-3 1차-2 — `input.source` prefix 기반 자동 분기.
     *   - `"real:..."`  → `"unknown"` (실 source는 사용자 라이선스 확인 전까지 미확정)
     *   - 그 외(`"fixture:..."` 등) → `"demo-only"`
     */
    license: "demo-only" | "unknown";
    collectedAt: string;
    schoolRecordCount: number;
    issueCount: number;
  };
}

// ─── ingest entry ─────────────────────────────────────────────────────────
export function ingestSchools(
  input: IngestSchoolsInput,
): IngestSchoolsResult {
  if (input.format !== "json") {
    throw new Error(
      `[ingestSchools] 지원하지 않는 format: '${input.format}'. 1차-1은 'json'만 지원합니다.`,
    );
  }

  const collectedAt = input.collectedAt ?? new Date().toISOString();
  const issues: DataQualityIssue[] = [];

  const parsed: unknown = JSON.parse(input.text);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `[ingestSchools] JSON 최상위는 array여야 합니다. 받은 타입: ${typeof parsed}.`,
    );
  }

  const schoolRecords: IngestedSchoolRecord[] = parsed.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      schoolId: typeof r.schoolId === "string" ? r.schoolId : "",
      neisSchoolCode:
        typeof r.neisSchoolCode === "string" ? r.neisSchoolCode : null,
      schoolName: typeof r.schoolName === "string" ? r.schoolName : "",
      schoolLevel: typeof r.schoolLevel === "string" ? r.schoolLevel : "other",
      schoolType: typeof r.schoolType === "string" ? r.schoolType : null,
      establishmentType:
        typeof r.establishmentType === "string" ? r.establishmentType : null,
      address: typeof r.address === "string" ? r.address : null,
      sidoName: typeof r.sidoName === "string" ? r.sidoName : null,
      sigunguName: typeof r.sigunguName === "string" ? r.sigunguName : null,
      latitude: typeof r.latitude === "number" ? r.latitude : null,
      longitude: typeof r.longitude === "number" ? r.longitude : null,
    };
  });

  // 11-3 1차-2 — source prefix 기반 license 분기.
  //   real source(`real:...`)는 실 데이터라 사용자 라이선스 확인 전까지 "unknown".
  //   fixture source(`fixture:...`)는 demo 데이터라 "demo-only".
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
    },
  };
}
