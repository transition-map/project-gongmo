/**
 * 11-3 1차-67 — curated region text schema infrastructure.
 *
 * `data/fixtures/curated_region_text_sample.json` registry를 import해 frontend에서
 * 사용할 수 있는 schema·helper 인프라를 제공한다.
 *
 * **정책 (data/fixtures/README.md 일관)**:
 * - AI 정책 문구 생성 금지 — `_meta.policy.aiGeneratedAllowed: false` 강제.
 * - 사람 검수 결과만 등록 — `_meta.policy.humanReviewRequired: true`.
 * - 1차-67은 **schema-only**: `records`는 빈 배열로 시작하며 실제 mainIssue /
 *   policyUse / teacherUse 문구는 사용자가 별도 단계에서 사람 검수 결과로만 채운다.
 * - **regionAdapter fallback chain에 연결하지 않는다** (1차-67) — opt-in path
 *   infrastructure만. fallback chain 진입은 1차-69+ 별도 합의에서만 가능.
 * - **regionCode → 기관 자동 매칭이 아니다** — `getCuratedRegionText(regionCode)`는
 *   정확 매칭(exact lookup)만 수행. byRegion / forRegion / matchByPattern 등
 *   자동 추천 helper는 미도입.
 * - **공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가
 *   필요합니다.**
 */

import fixture from "../../data/fixtures/curated_region_text_sample.json";

/**
 * 11-3 1차-67 — region code 분류.
 *
 * - `sigungu`: KOSTAT 시군구 5자리 (예: "11680")
 * - `sido`: KOSTAT 시도 2자리 (예: "11")
 * - `demo`: 시연용 DEMO ID (예: "DEMO-SIGUNGU-01")
 *
 * 후속 단계에서 사용자가 fixture를 채울 때 regionCode 형식에 맞춰 명시. 1차-67은
 * schema-only라 records 빈 배열, 본 필드는 사실상 미사용.
 */
export type CuratedRegionCodeType = "sigungu" | "sido" | "demo";

/**
 * 11-3 1차-67 — region별 사람 작성·검토 분석 문구 record.
 *
 * **schema-only 단계** (1차-67): records는 빈 배열로 시작. 실제 record 추가는 사용자가
 * 별도 단계에서 사람 검수 결과로만 진행한다.
 *
 * **AI 생성 금지**: `aiGenerated`는 `false` 리터럴 타입으로 고정 — 테스트가 모든 record에
 * false임을 강제한다.
 *
 * **PII 회피**: `curator`는 실명·연락처·이메일이 아니라 가공명 또는 역할명 권장
 * (예: `"교사 검토자 A"` / `"정책 담당 B"` / `"전환교육 연구원 C"`).
 */
export interface CuratedRegionText {
  /**
   * Stable identifier. regionCode 정확 매칭 lookup key.
   * 후속 단계에서 KOSTAT 5자리("11680" 등) 또는 시연용 DEMO ID("DEMO-SIGUNGU-01") 사용.
   */
  regionCode: string;
  /** region code 분류. 1차-67 schema-only 단계는 사실상 미사용. */
  regionCodeType?: CuratedRegionCodeType;
  /** 1~2문장. 사람이 직접 작성·검수한 region 분석 주요 원인 문구. */
  mainIssue?: string;
  /** 1~2문장. 사람 검수 결과의 교육청 정책 활용 방향. */
  policyUse?: string;
  /** 1~2문장. 사람 검수 결과의 교사 상담 활용 방향. */
  teacherUse?: string;
  /**
   * 검수자 가공명 또는 역할명. **PII 회피** — 실명·연락처·이메일 금지.
   * 예: `"교사 검토자 A"` / `"정책 담당 B"` / `"전환교육 연구원 C"`.
   */
  curator: string;
  /** 검수 완료 일자 (ISO 8601, KST 권장 예: "2026-06-01T00:00:00+09:00"). */
  reviewedAt: string;
  /** 검수 버전 (예: `"v1.0"`). 동일 region 재검수 시 `"v2.0"` 등으로 증분. */
  reviewVersion: string;
  /** 외부 보고서 인용 시 출처 안내 (선택). 본문 발췌·복제 금지. */
  sourceNote?: string;
  /**
   * AI 생성 여부. **본 registry는 항상 false** — AI 정책 문구 생성 금지 정책.
   * 테스트가 모든 record에 false임을 강제한다.
   */
  aiGenerated: false;
}

export interface CuratedRegionTextMeta {
  source?: string;
  license?: string;
  datasetCategory?: string;
  generatedAt?: string;
  note?: string;
  policy?: {
    aiGeneratedAllowed?: boolean;
    humanReviewRequired?: boolean;
    /**
     * "사람 검수 완료" 라벨 부여를 위해 record에 필수로 존재해야 하는 필드 목록.
     * 1차-67 시점 기본값: `["curator", "reviewedAt"]`.
     */
    minimumReviewFields?: string[];
  };
}

interface CuratedRegionTextFixtureFile {
  _meta?: CuratedRegionTextMeta;
  records?: CuratedRegionText[];
}

const file = fixture as CuratedRegionTextFixtureFile;
const allRecords: CuratedRegionText[] = file.records ?? [];

/**
 * 전체 curated region text records 반환 (registry 순서 그대로).
 *
 * 1차-67은 schema-only라 항상 빈 배열 반환. 후속 단계에서 사용자가 fixture에
 * 사람 검수 record를 추가하면 자연스럽게 반환 길이가 늘어난다.
 */
export function getCuratedRegionTexts(): CuratedRegionText[] {
  return allRecords;
}

/**
 * 정확 매칭(exact lookup)으로 regionCode에 해당하는 curated record를 1건 반환.
 *
 * **자동 추천이 아님**: regionCode prefix 매칭 / fuzzy 매칭 / region 인접성 매칭
 * 등은 미도입. `record.regionCode === regionCode` 동등 비교만.
 *
 * @param regionCode 매칭할 regionCode (정확 일치).
 * @returns 매칭된 1건 또는 `undefined` (1차-67 schema-only는 항상 undefined).
 */
export function getCuratedRegionText(
  regionCode: string,
): CuratedRegionText | undefined {
  return allRecords.find((r) => r.regionCode === regionCode);
}

/** fixture meta (UI 안내·테스트용). */
export const curatedRegionTextMeta: CuratedRegionTextMeta | undefined =
  file._meta;
