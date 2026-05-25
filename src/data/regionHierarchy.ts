/**
 * 11-3 1차-137 — region hierarchy lookup helper.
 *
 * 1차-136 fixture(`data/fixtures/region_hierarchy_subset.json`, 27 verified
 * subset entries)를 3단계 cascading select UI(StudentProfile, 1차-138+ 별도
 * 합의)에 흘려보낼 read-only helper layer.
 *
 * **출처 (rawSourcesUsed)**:
 * - `data/clean.real/G/admin_codes.clean.json` (1차-15 KIKcd_B real clean — 271 시군구)
 * - `data/clean.real/G/legal_dong_codes.clean.json` (1차-15 — 20,282 EMD)
 * - `src/data/regionCatalog.ts` (1차-89 — 17 시도 readinessStatus)
 * - `data/mart.real/B/region_summary.mart.json` (1차-129 — 강남구 schoolCount=7 등)
 *
 * **정책 (1차-89 / 1차-67 / 1차-135 동형)**:
 * - 모든 record `aiGenerated: false` 강제 — `_meta.policy.aiGeneratedAllowed: false`.
 * - 사람 검수 결과만 등록 — `_meta.policy.humanReviewRequired: true`.
 * - **fake numeric 0건** — `schoolCount` / `currentGapIndex` / `trendRiskScore` /
 *   `yearlySupport` / `supportChange` / `specialSchoolCount` / `supportCenterCount`
 *   슬롯 부재 (TypeScript 타입 + 회귀 테스트로 차단).
 * - `sigunguCode` / `regionCode` 임시 생성 금지 — 세종(sidoCode=36)은 admin_codes
 *   부재라 `sigunguCode: null` / `sigunguName: null`로 정직 표시.
 * - `aiGenerated`는 `false` 리터럴 타입으로 강제 — true 값은 컴파일 에러.
 * - **mixed group 금지** — 한 sigunguCode 안에 adminGu + legalDong 혼재 금지
 *   (1차-137 회귀 테스트로 fixture 변경 시 즉시 표면화). 후속 fixture 확장에서
 *   mixed가 등장하면 정책 합의 후 `isIlbangu` 정의 재검토 필요.
 * - "NEIS 전국 지표 연결 완료" / "전국 실데이터 분석 완료" / "완전 실데이터 대시보드
 *   전환" / "실시간 API 서비스" 표현 0건.
 *
 * **자동 추천 helper 미도입 (1차-67 / 1차-89 동형)**: byRegion / forRegion /
 * matchByPattern / recommendForRegion / autoMatch / generateText / decidePolicy /
 * autoRecommendFinal 등 자동 매칭·추천 helper export 0건. cascade는 사용자 명시
 * 선택만.
 *
 * **무수정 contract (1차-137)**:
 * - `src/App.tsx` / `Dashboard.tsx` / `RegionalAnalysis.tsx` / `RecommendationResult.tsx`
 *   / `GeneratedOutputs.tsx` / `EthicsValidation.tsx` / `Header.tsx` 본 단계 무수정.
 * - `src/types/scenario.ts` (1차-89 schema) / `src/lib/scenario/*` (1차-93 4 builders) /
 *   `src/lib/dashboard/regionAdapter.ts` / `src/services/*` / `src/hooks/*` /
 *   `src/data/mocks/*` / `src/data/regions.json` / `src/data/regionCatalog.ts` /
 *   `src/data/studentProfileOptions.json` 모두 무수정.
 * - `scripts/etl/*` / `vite.config.ts` / `vercel.json` / `package.json` / `.env*` /
 *   `.gitignore` / CI 모두 무수정.
 * - `data/fixtures/region_hierarchy_subset.json` (1차-136) 무수정.
 *
 * UI 통합(StudentProfile 3단계 cascading select)은 1차-138+ 별도 합의 단계.
 */

import fixture from "../../data/fixtures/region_hierarchy_subset.json";

export type ThirdLevelType = "legalDong" | "adminDong" | "adminGu" | "none";

export type ReadinessStatus =
  | "dataReady"
  | "partial"
  | "codeOnly"
  | "unavailable";

export type MartCoverage =
  | "schoolCount > 0"
  | "분석지표 미연결"
  | "행정구역 코드만 확인";

/**
 * Region hierarchy 1 record schema.
 *
 * **fake numeric 필드 금지**: schoolCount / currentGapIndex / trendRiskScore /
 * yearlySupport / supportChange / specialSchoolCount / supportCenterCount 등 실제
 * raw 부재인 지표 슬롯 부재. 지표는 mart/indicator 단계의 region summary에서만
 * 표현한다 (1차-89 정책 일관).
 *
 * **PII 필드 금지**: 학생명·생년월일·진단명·연락처 등 슬롯 부재 (CLAUDE.md §5).
 */
export interface RegionHierarchyEntry {
  sidoCode: string;
  sidoName: string;
  /** 세종(36)은 admin_codes 부재라 null로 정직 표시. */
  sigunguCode: string | null;
  /** 세종(36)은 admin_codes 부재라 null로 정직 표시. */
  sigunguName: string | null;
  /** 일반구 entries에서 향후 parent 시 명시용. 1차-136 fixture는 모두 null. */
  parentSigunguName: string | null;
  /** legalDong/adminGu는 실 코드, "none" 케이스 등 후속 확장에서 null 허용. */
  thirdLevelCode: string | null;
  thirdLevelName: string;
  thirdLevelType: ThirdLevelType;
  readinessStatus: ReadinessStatus;
  /** ETL 출처 라벨 (예: "real:kikcd-b"). */
  source: string;
  martCoverage: MartCoverage;
  /** 본 registry는 항상 false. AI 생성 record는 schema 단에서 차단. */
  aiGenerated: false;
}

export interface RegionHierarchyMeta {
  source: string;
  license: "human-curated";
  datasetCategory: "region-hierarchy";
  policy: {
    aiGeneratedAllowed: false;
    humanReviewRequired: boolean;
    minimumReviewFields: string[];
    fullTextCopyAllowed: boolean;
  };
  note: string;
  rawSourcesUsed: string[];
  curator: string;
  reviewedAt: string;
  reviewVersion: string;
}

interface RegionHierarchyFixtureFile {
  _meta?: RegionHierarchyMeta;
  records?: RegionHierarchyEntry[];
}

// fixture는 JSON이라 string union 타입을 직접 만족시키지 못함 — 사용자 검수
// fixture invariant 신뢰 + 회귀 테스트(`thirdLevelType union strict` 등)로
// schema 어긋남을 즉시 표면화한다. 1차-67 curatedRegionText / 1차-55
// officialResources 동형 패턴.
const file = fixture as unknown as RegionHierarchyFixtureFile;

/**
 * fixture records (ReadonlyArray로 노출 — mutate 차단).
 *
 * 1차-136 fixture 기준 27건. 후속 fixture 확장 시 자연 증가.
 */
export const regionHierarchyRecords: ReadonlyArray<RegionHierarchyEntry> =
  file.records ?? [];

/**
 * fixture meta (UI 안내·테스트용). 1차-67 `curatedRegionTextMeta` / 1차-55
 * `officialResourcesMeta` 패턴 동형 (`| undefined` optional 타입).
 */
export const regionHierarchyMeta: RegionHierarchyMeta | undefined = file._meta;

/**
 * 1단계: fixture에 등장하는 시도 목록 (sidoCode 오름차순, 중복 제거).
 *
 * 1차-136 verified subset 기준 **7 시도** (서울 11 / 부산 26 / 세종 36 / 경기 41 /
 * 충북 43 / 전남 46 / 강원 51). codeOnly 11 시도 중 10건 미수록 — 후속 단계에서
 * subset 확장 시 dataReady 거짓 표시 위험 검토.
 *
 * @returns `{ code, name }[]` — sidoCode 오름차순.
 */
export function getSidoList(): { code: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const r of regionHierarchyRecords) {
    if (!seen.has(r.sidoCode)) seen.set(r.sidoCode, r.sidoName);
  }
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * 2단계: 선택한 시도의 시군구 목록 (sigunguCode 오름차순, 중복 제거).
 *
 * **`isIlbangu` 판정**: 해당 sigunguCode group 중 **하나라도** `thirdLevelType ===
 * "adminGu"`이면 true. 1차-137 회귀 테스트(`mixed group 회귀`)가 같은 sigunguCode
 * 안에 adminGu + legalDong 혼재 0건을 강제하므로 안전. 후속 fixture에서 mixed가
 * 등장하면 본 helper의 정의 + 회귀 테스트 동시 재검토.
 *
 * 세종(`sidoCode="36"`)은 `sigunguCode: null`로 노출되며, UI는 2단계 skip 또는
 * `getThirdLevelForSidoWithoutSigungu()` 직접 호출 분기로 처리한다.
 *
 * @param sidoCode 시도 코드 (2자리).
 * @returns `{ code, name, isIlbangu }[]` — sigunguCode 오름차순.
 */
export function getSigunguBySido(
  sidoCode: string,
): { code: string | null; name: string; isIlbangu: boolean }[] {
  const filtered = regionHierarchyRecords.filter(
    (r) => r.sidoCode === sidoCode,
  );
  const seen = new Map<string | null, { name: string; isIlbangu: boolean }>();
  for (const r of filtered) {
    const existing = seen.get(r.sigunguCode);
    if (existing) {
      // 같은 sigunguCode group 내에서 adminGu가 한 번이라도 등장하면 isIlbangu=true.
      existing.isIlbangu = existing.isIlbangu || r.thirdLevelType === "adminGu";
    } else {
      seen.set(r.sigunguCode, {
        name: r.sigunguName ?? "시군구 정보 없음",
        isIlbangu: r.thirdLevelType === "adminGu",
      });
    }
  }
  return [...seen.entries()]
    .map(([code, v]) => ({ code, name: v.name, isIlbangu: v.isIlbangu }))
    .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
}

/**
 * 3단계: 선택한 시군구의 읍면동 또는 일반구 목록 (fixture 순서 유지).
 *
 * `sigunguCode === null` 호출 시 세종 entries 직접 반환 (UI가 2단계 skip 분기로
 * 들어왔을 때). 그 외는 sigunguCode 일치 records 반환.
 *
 * **자동 추천 미도입**: 매칭 0건이면 빈 배열 — 호출자가 처리. UI 안내는 호출자가
 * `readinessStatus` / `martCoverage`에 따라 "분석지표 미연결" 등 정직 표시.
 *
 * @param sigunguCode 시군구 코드 (5자리) 또는 null (세종).
 * @returns `{ code, name, type, martCoverage, readinessStatus }[]`.
 */
export function getThirdLevelBySigungu(sigunguCode: string | null): {
  code: string | null;
  name: string;
  type: ThirdLevelType;
  martCoverage: MartCoverage;
  readinessStatus: ReadinessStatus;
}[] {
  return regionHierarchyRecords
    .filter((r) => r.sigunguCode === sigunguCode)
    .map((r) => ({
      code: r.thirdLevelCode,
      name: r.thirdLevelName,
      type: r.thirdLevelType,
      martCoverage: r.martCoverage,
      readinessStatus: r.readinessStatus,
    }));
}

/**
 * 세종처럼 시군구 단위가 없는 시도 전용 3단계 helper.
 *
 * 내부적으로는 해당 sidoCode 안에서 sigunguCode가 null인 records를 그대로 반환.
 * `getThirdLevelBySigungu(null)`과 동일 결과를 주되, UI 명시성을 위해 별도 helper로
 * 분리한다 (호출자가 "시도만 알고 시군구 모름" 시점에 자연스럽게 사용).
 *
 * @param sidoCode 시도 코드.
 * @returns `getThirdLevelBySigungu` 동형 shape.
 */
export function getThirdLevelForSidoWithoutSigungu(sidoCode: string): {
  code: string | null;
  name: string;
  type: ThirdLevelType;
  martCoverage: MartCoverage;
  readinessStatus: ReadinessStatus;
}[] {
  return regionHierarchyRecords
    .filter((r) => r.sidoCode === sidoCode && r.sigunguCode === null)
    .map((r) => ({
      code: r.thirdLevelCode,
      name: r.thirdLevelName,
      type: r.thirdLevelType,
      martCoverage: r.martCoverage,
      readinessStatus: r.readinessStatus,
    }));
}

/**
 * thirdLevelCode 정확 매칭(exact lookup)으로 1 entry 반환.
 *
 * **자동 추천이 아님**: thirdLevelCode prefix 매칭 / fuzzy 매칭 / 인접 EMD 매칭 등은
 * 미도입. `r.thirdLevelCode === code` 동등 비교만 (1차-67 / 1차-89 패턴 동형).
 *
 * @param thirdLevelCode 정확 코드 (legalDong 10자리 또는 adminGu 5자리). null이면
 *   즉시 undefined.
 * @returns 매칭된 1건 또는 undefined.
 */
export function getEntryByThirdLevelCode(
  thirdLevelCode: string | null,
): RegionHierarchyEntry | undefined {
  if (thirdLevelCode === null) return undefined;
  return regionHierarchyRecords.find(
    (r) => r.thirdLevelCode === thirdLevelCode,
  );
}

/**
 * 일반구 분리 정규식 helper.
 *
 * admin_codes의 composite sigunguName(예: "수원시 영통구")을 parent 시 + 일반구로
 * 분리. 일반 시군구(예: "강남구")는 그대로 parent로 반환하고 `gu`는 undefined.
 *
 * **1차-136 fixture는 이미 분리 저장**되어 본 helper는 미경유. 후속 fixture 확장
 * (admin_codes composite 직접 import 시) 또는 사용자 입력 정규화에 활용.
 *
 * @param sigunguName 시군구 명칭 (composite 또는 단일).
 * @returns `{ parent, gu? }` — `gu`가 있으면 일반구 cascade.
 */
export function parseIlbangu(sigunguName: string): {
  parent: string;
  gu?: string;
} {
  const match = sigunguName.match(/^(\S+시)\s+(\S+구)$/);
  return match ? { parent: match[1], gu: match[2] } : { parent: sigunguName };
}
