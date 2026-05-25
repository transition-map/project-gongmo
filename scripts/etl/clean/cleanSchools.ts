/**
 * 11-3 1차-3 — B 학교 기본 정보 cleaner (본 정규화·검증).
 * 11-3 1차-5 — schoolLevel/schoolType/establishmentType enum **case-insensitive 정규화** 도입.
 * 11-3 1차-7 — schoolLevel/establishmentType **한글 enum 값 매핑** 도입 (안 B).
 * 11-3 1차-9 — schoolType **한글 enum 값 매핑** 도입 (안 B, 4 한글 키 → 4 영문 canonical).
 *              cross-enum boundary rule: "특수"는 schoolType 전용 / "특수학교"는 schoolLevel 전용.
 * 11-3 1차-11 — **한글 enum 변형 매핑 확장** (schoolType 3변형 / schoolLevel "기타" / establishmentType 2변형).
 *               "국공립"은 national+public 합성 의미라 매핑 미도입 (null + warning fallback 유지).
 * 11-3 1차-13 — **schoolType deeper 변형 매핑 확장** ("대안고"/"기타고"/"일반계").
 *               "공업고"/"상업고"/"외국어고"/"과학고" 등 특성화·목적형 고교는 alternative vs other
 *               분류 합의 부재로 1차-15+ 보류 (null + warning fallback 유지).
 * 11-3 1차-15 — **neisSchoolCode 형식 검증** (Soft preserve) 도입.
 *               valid pattern `^B\d{9}$`. null / empty / whitespace-only는 null로 정규화 + silent.
 *               형식 위반 non-empty 값은 trimmed value preserve + warning(field: `neisSchoolCode`).
 *               record drop 0건 — neisSchoolCode는 보조 식별자이므로 schoolId(필수 식별자) 정책과 섞지 않는다.
 * 11-3 1차-17 — **schoolName keyword presence 검증** (Soft preserve) 도입.
 *               valid pattern `/(학교|유치원)/` — schoolName 어디서든 키워드 1회 이상 등장.
 *               빈 schoolName은 1차-3 step 4 empty warning만 유지 (1차-17 keyword 분기 미경유).
 *               keyword 부재 non-empty schoolName은 normalized value preserve + warning(field: `schoolName`).
 *               silent transform (suffix 자동 확장 / 약어 → 정식 명칭 / 분교 정리 등)은 1차-17에서 미도입.
 *
 * **Pure function** — 입력 array·입력 record 객체 mutate 0건. 출력 records는
 * 새 배열 + 새 객체로 구성.
 *
 * **10-step in-memory pipeline (사용자 합의값 §1-3 / 1차-3 합의 §3 / 1차-5 합의 §1 / 1차-15 합의 §1-2 / 1차-17 합의 §1-2)**:
 *   1. **trim** — schoolName / address / sidoName / sigunguName에 `trim() + replace(/\s+/g, " ")` 적용.
 *      neisSchoolCode는 trim만 (1차-3 합의 §3-9). schoolId는 trim 후 필수 검사. silent transform.
 *   2. **schoolId 필수** — trim 후 빈 문자열·null이면 **DROP** + warning issue (field: `schoolId`).
 *   3. **schoolId dedup** — 첫 occurrence 보존, 2회차+는 **DROP** + warning issue (field: `duplicate`).
 *   4. **schoolName 빈** — trim 후 빈 문자열이면 record는 보존(빈 문자열 그대로) + warning issue (field: `schoolName`).
 *   5. **schoolLevel enum** — `normalizeEnumValue` (trim + toLowerCase) 후 allowlist 검사.
 *      valid면 lowercase canonical 값으로 records 보존 (silent). 허용 외면 `"other"` fallback + warning (field: `schoolLevel`).
 *   6. **schoolType enum** — `normalizeEnumValue` 후 allowlist 검사. null은 silent. valid면 lowercase canonical 보존 (silent).
 *      허용 외 non-null이면 null fallback + warning issue (field: `schoolType`).
 *   7. **establishmentType enum** — `normalizeEnumValue` 후 allowlist 검사. null은 silent. valid면 lowercase canonical 보존 (silent).
 *      허용 외 non-null이면 null fallback + warning issue (field: `establishmentType`).
 *   8. **coordinate pair-level** — 양쪽 null이면 silent. 한쪽만 null이거나 한쪽이라도 범위 외
 *      (lat ∉ [33, 39] 또는 lng ∉ [124, 132])면 양쪽 null fallback + warning issue (field: `coordinate`).
 *   9. **neisSchoolCode 형식 검증 (1차-15)** — trim 후 null / "" / whitespace-only → null + silent.
 *      `^B\d{9}$` valid → 그대로 보존 + silent. non-empty invalid → trimmed value preserve +
 *      warning issue (field: `neisSchoolCode`). record drop 0건 (보조 식별자).
 *  10. **schoolName keyword presence 검증 (1차-17)** — normalized schoolName(이미 step 1
 *      trim + collapse + step 4 empty 검사 후)을 대상으로 `/(학교|유치원)/` 키워드 포함 검사.
 *      빈 schoolName은 1차-3 step 4 정책만 적용 (본 step 미경유). non-empty 중 키워드 부재 →
 *      normalized value preserve + warning issue (field: `schoolName`). record drop 0건.
 *      silent transform (약어 확장 / 분교 정리 등)은 미도입.
 *
 * **drop / preserve 정책 (1차-3 합의 §3 / 1차-15 합의 §2 / 1차-17 합의 §2)**:
 *   - **Hard drop** (식별 불가): schoolId 누락 / schoolId 중복 2회차+.
 *   - **Soft preserve** (값 품질): schoolName 빈 / enum 위반 / 좌표 범위 위반 /
 *     neisSchoolCode 형식 위반 (1차-15) / schoolName 키워드 부재 (1차-17) —
 *     fallback 값 또는 normalized value 보존.
 *
 * **issue 정책**:
 *   - 모든 issue는 `severity: "warning"`, `datasetCategory: "B"`.
 *   - `source` field는 input.meta.source를 그대로 전파 (`"fixture:B-schools"` or `"real:schools-json"`).
 *   - 한 record가 enum + coordinate를 동시 위반할 수 있어 issue 다수 발행 가능 (records.length ≠ issues.length 정상).
 *   - enum issue 메시지는 normalize 전 **원본 입력 값**을 인용 (raw 분석 친화).
 *
 * **enum case-insensitive 정규화 (1차-5 합의 §1-3)**:
 *   - `normalizeEnumValue(v) = v.trim().toLowerCase()` (null은 null 반환).
 *   - case/space 변형이 valid enum으로 normalize → **silent** + records에 lowercase canonical 저장
 *     (예: `"Elementary"` → `"elementary"`, `"PUBLIC"` → `"public"`, `" Private "` → `"private"`).
 *   - normalize 후에도 allowlist 밖 → 1차-7 한글 매핑 시도 → 매핑 hit silent / miss fallback.
 *   - **cross-enum 경계 보존**: `schoolLevel`에 `"PUBLIC"` 입력 시 normalize → `"public"`이지만
 *     schoolLevel allowlist 밖이므로 `"other"` + warning (establishmentType과 경계 안 넘음).
 *
 * **한글 enum 값 매핑 (1차-7·1차-9 합의 §1-3, 안 B)**:
 *   - `KOREAN_SCHOOL_LEVEL_MAP` (한글 8키 → 영문 5종, 1차-7): 유치원→kindergarten,
 *     초등학교/초등→elementary, 중학교/중등→middle, 고등학교/고등→high, 특수학교→special.
 *   - `KOREAN_ESTABLISHMENT_TYPE_MAP` (한글 3키 → 영문 3종, 1차-7): 국립→national, 공립→public, 사립→private.
 *   - `KOREAN_SCHOOL_TYPE_MAP` (한글 4키 → 영문 4종, **1차-9 신규**, 안 B): 일반→general,
 *     특수→special, 대안→alternative, 기타→other.
 *   - **cross-enum boundary rule (1차-9 명문화)**: `"특수"`(suffix 없음)는 schoolType 전용,
 *     `"특수학교"`(suffix 있음)는 schoolLevel 전용. 각 Map에 해당 키만 포함하여 cross-enum
 *     매칭을 차단한다.
 *     - schoolType `"특수"` → silent `"special"` / schoolType `"특수학교"` → null + warning
 *     - schoolLevel `"특수학교"` → silent `"special"` / schoolLevel `"특수"` → `"other"` + warning
 *   - 적용 시점: step 5/6/7에서 영문 allowlist 검사 실패 후 fallback 분기 안에서 한글 매핑 시도.
 *     매핑 hit → silent + records에 영문 lowercase canonical 저장. miss → 기존 1차-3 fallback + warning.
 *   - 매핑 키는 `normalizeEnumValue` 결과(`trim() + toLowerCase()`). 한글은 case 무관이라 trim 효과가 핵심
 *     (`" 초등학교 "` → trim → `"초등학교"` → 매핑 → `"elementary"`, `" 특수 "` → `"특수"` → `"special"`).
 *   - 미매핑 한글(예: `"산업학교"`, `"국공립"`, `"전문"`, `"대안학교"`)은 1차-3 fallback 유지.
 *   - 변형 매핑(schoolType `"대안학교"`/`"기타학교"`, establishmentType `"국공립"` 등)은 1차-10+ 보류.
 *
 * **G lookup 보류**: address → regionCode / legalDongCode / hjdCode 매핑은 master.real 단계로 보류
 * (사용자 합의 §11). cleanSchools는 address / sidoName / sigunguName 원본 trim 후 보존까지만 수행.
 * 지오코딩 API 호출 절대 금지.
 */

import type { DataQualityIssue } from "../../../src/types";
import type { IngestedSchoolRecord } from "../ingest/ingestSchools";

// ─── 입력·출력 타입 ────────────────────────────────────────────────────────
export interface CleanSchoolsInput {
  schoolRecords: IngestedSchoolRecord[];
  meta: {
    source: string;
    sourcePolicyStatus: "pending-real-source-review";
    /**
     * 11-3 1차-2 — `"demo-only" | "unknown"` union으로 확장 (ingestSchools와 일관).
     * cleanSchools는 input.meta.license를 임의로 변경하지 않고 그대로 상속한다.
     */
    license: "demo-only" | "unknown";
    collectedAt: string;
    schoolRecordCount: number;
    issueCount: number;
  };
}

/**
 * 1차-3 본구현에서도 CleanedSchoolRecord는 IngestedSchoolRecord와 동일 shape.
 * 필드 값만 정규화·fallback이 적용된다 (필드 추가·삭제 0건).
 */
export type CleanedSchoolRecord = IngestedSchoolRecord;

export interface CleanSchoolsResult {
  records: CleanedSchoolRecord[];
  issues: DataQualityIssue[];
  meta: {
    source: string;
    sourcePolicyStatus: "pending-real-source-review";
    /**
     * 11-3 1차-2 — input meta로부터 그대로 상속 (`"demo-only" | "unknown"`).
     */
    license: "demo-only" | "unknown";
    collectedAt: string;
    cleanedRecordCount: number;
    issueCount: number;
  };
}

// ─── 정책 상수 (1차-3) ──────────────────────────────────────────────────────
//
// enum allowlist는 module-level Set으로 두어 매번 새로 생성하지 않도록 한다.
// 외부 export 없음 — 테스트는 enum 위반/허용 값을 직접 string literal로 사용.
const ALLOWED_SCHOOL_LEVEL = new Set<string>([
  "kindergarten",
  "elementary",
  "middle",
  "high",
  "special",
  "other",
]);
const ALLOWED_SCHOOL_TYPE = new Set<string>([
  "general",
  "special",
  "alternative",
  "other",
]);
const ALLOWED_ESTABLISHMENT_TYPE = new Set<string>([
  "national",
  "public",
  "private",
]);

// 11-3 1차-7 — 한글 enum 매핑 (안 B: schoolLevel + establishmentType만).
//   매핑 키는 normalizeEnumValue 결과(`trim() + toLowerCase()`)를 사용한다 — 한글은
//   case 무관이라 trim 효과가 핵심 (`" 초등학교 "` → trim → `"초등학교"` → 매핑).
//   매핑 hit 시 영문 lowercase canonical 값으로 records 저장 (silent — issue 발행 X).
//   미매핑 한글은 기존 1차-3 fallback 정책 유지.
//   schoolType 한글 매핑은 1차-8+로 보류 (cross-enum `"특수"` vs `"특수학교"` 합의 필요).
// 11-3 1차-11 — `"기타"` → `"other"` 1키 추가 (1차-7 시점에는 보류).
const KOREAN_SCHOOL_LEVEL_MAP = new Map<string, string>([
  ["유치원", "kindergarten"],
  ["초등학교", "elementary"],
  ["초등", "elementary"],
  ["중학교", "middle"],
  ["중등", "middle"],
  ["고등학교", "high"],
  ["고등", "high"],
  ["특수학교", "special"],
  ["기타", "other"], // 1차-11
]);

// 11-3 1차-11 — 변형 매핑 2키 추가 (`"공립학교"` / `"사립학교"`).
//   `"국공립"`은 national+public 합성 의미라 안전한 단일 enum 축약 불가 → 매핑 미도입.
//   (1차-11 합의 §4) → null + warning fallback 유지.
const KOREAN_ESTABLISHMENT_TYPE_MAP = new Map<string, string>([
  ["국립", "national"],
  ["공립", "public"],
  ["사립", "private"],
  ["공립학교", "public"], // 1차-11 변형
  ["사립학교", "private"], // 1차-11 변형
]);

// 11-3 1차-9 — schoolType 한글 매핑 (안 B: 4 한글 키 → 4 영문 canonical).
// 11-3 1차-11 — 변형 매핑 3키 추가 (`"대안학교"` / `"기타학교"` / `"일반학교"`).
// 11-3 1차-13 — deeper 변형 매핑 3키 추가 (`"대안고"` / `"기타고"` / `"일반계"`).
//   cross-enum boundary rule (1차-9 명문화, 1차-11·1차-13 유지):
//     "특수"(suffix 없음)는 schoolType 전용 → 본 Map에 포함.
//     "특수학교"(suffix 있음)는 schoolLevel 전용 → 본 Map에 미포함 (1차-7 KOREAN_SCHOOL_LEVEL_MAP 전용).
//   따라서 schoolType에 "특수학교" 입력 시 → schoolType allowlist + 본 Map 둘 다 밖 → null + warning.
//   매핑 hit silent + records에 영문 lowercase canonical.
//   `"공업고"` / `"상업고"` / `"외국어고"` / `"과학고"` 등 특성화·목적형 고교는 alternative vs other
//   분류 합의 부재로 **1차-15+ 보류** (null + warning fallback 유지).
const KOREAN_SCHOOL_TYPE_MAP = new Map<string, string>([
  ["일반", "general"],
  ["특수", "special"],
  ["대안", "alternative"],
  ["기타", "other"],
  ["일반학교", "general"], // 1차-11 변형
  ["대안학교", "alternative"], // 1차-11 변형
  ["기타학교", "other"], // 1차-11 변형
  ["일반계", "general"], // 1차-13 deeper 변형 (일반계 고등학교 표준 분류)
  ["대안고", "alternative"], // 1차-13 deeper 변형
  ["기타고", "other"], // 1차-13 deeper 변형
]);

// 대한민국 본토·도서 포괄 WGS84 범위 (CLAUDE.md §17.6 기재값 / 1차-3 합의 §3-7).
//   - lat: 마라도(33.11°N) ~ 휴전선 인근. 33 <= lat <= 39
//   - lng: 백령도(124.66°E) ~ 독도(131.87°E). 124 <= lng <= 132
const KOREA_LAT_MIN = 33;
const KOREA_LAT_MAX = 39;
const KOREA_LNG_MIN = 124;
const KOREA_LNG_MAX = 132;

// 11-3 1차-15 — neisSchoolCode 형식 검증 정규식 (사용자 합의값 §1).
//   B + 9자리 숫자 (예: "B000000001"). mini fixture 3건은 모두 이 패턴.
//   실 NEIS export 패턴은 1차-15+ 시점에 별도 검증 후 정규식 확장 가능.
const NEIS_SCHOOL_CODE_PATTERN = /^B\d{9}$/;

// 11-3 1차-17 — schoolName keyword presence 검증 정규식 (사용자 합의값 §1).
//   schoolName 어디서든 "학교" 또는 "유치원" 키워드가 1회 이상 등장하면 valid.
//   silent transform (suffix 자동 확장 / 약어 확장 / 분교 정리)은 1차-17에서 미도입.
//   추가 키워드(`"학원"` / `"대학"` 등)는 후속 단계에서 사용자 합의 후 확장 검토.
const SCHOOL_NAME_KEYWORD_PATTERN = /(학교|유치원)/;

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────
/** trim() + 내부 다중 공백을 단일 공백으로 collapse. null은 null 반환. */
function normalizeText(value: string | null): string | null {
  if (value === null) return null;
  return value.trim().replace(/\s+/g, " ");
}

/** trim만 수행 (collapse 없음). null은 null 반환. neisSchoolCode 전용 (1차-3 합의 §3-9). */
function trimOnly(value: string | null): string | null {
  if (value === null) return null;
  return value.trim();
}

/**
 * 11-3 1차-5 — enum 값 case-insensitive 정규화. `trim() + toLowerCase()`.
 * null은 null 반환 (nullable enum 처리). schoolLevel/schoolType/establishmentType step에서
 * allowlist 검사 직전에 적용한다. valid enum이면 lowercase canonical 값으로 records 보존.
 *
 * 예: `"Elementary"` → `"elementary"`, `" PRIVATE "` → `"private"`.
 * 한글 값은 case 무관이라 normalize 후 동일 (한글 매핑은 1차-6+ 보류).
 */
function normalizeEnumValue(value: string | null): string | null {
  if (value === null) return null;
  return value.trim().toLowerCase();
}

// ─── clean entry ──────────────────────────────────────────────────────────
export function cleanSchools(input: CleanSchoolsInput): CleanSchoolsResult {
  const issues: DataQualityIssue[] = [];
  const records: CleanedSchoolRecord[] = [];
  const seenSchoolIds = new Set<string>();

  for (const r of input.schoolRecords) {
    // step 1: trim 정규화 (silent)
    const schoolId = (r.schoolId ?? "").trim();
    const neisSchoolCodeTrimmed = trimOnly(r.neisSchoolCode);
    const schoolName = normalizeText(r.schoolName) ?? "";
    const address = normalizeText(r.address);
    const sidoName = normalizeText(r.sidoName);
    const sigunguName = normalizeText(r.sigunguName);

    // step 2: schoolId 필수 — Hard drop
    if (schoolId.length === 0) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolId",
        message: "schoolId가 누락되어 record를 제외함",
        source: input.meta.source,
      });
      continue;
    }

    // step 3: schoolId dedup — Hard drop (2회차+)
    if (seenSchoolIds.has(schoolId)) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "duplicate",
        message: `schoolId '${schoolId}'가 중복되어 2회차 이후 record를 제외함`,
        source: input.meta.source,
      });
      continue;
    }
    seenSchoolIds.add(schoolId);

    // step 4: schoolName trim 후 빈 — Soft preserve + warning
    if (schoolName.length === 0) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolName",
        message: `schoolId '${schoolId}'의 schoolName이 trim 후 빈 문자열로 record를 보존함`,
        source: input.meta.source,
      });
    }

    // step 5: schoolLevel enum
    //   1차-5: case-insensitive normalize. valid면 lowercase canonical 보존 (silent).
    //   1차-7: allowlist miss 시 KOREAN_SCHOOL_LEVEL_MAP에서 한글 매핑 시도.
    //          매핑 hit → silent + 영문 lowercase canonical. miss → "other" + warning.
    //   issue message는 normalize 전 원본 값 인용 (raw 분석 친화).
    const normalizedSchoolLevel = normalizeEnumValue(r.schoolLevel);
    let schoolLevel: string;
    if (
      normalizedSchoolLevel !== null &&
      ALLOWED_SCHOOL_LEVEL.has(normalizedSchoolLevel)
    ) {
      schoolLevel = normalizedSchoolLevel;
    } else if (
      normalizedSchoolLevel !== null &&
      KOREAN_SCHOOL_LEVEL_MAP.has(normalizedSchoolLevel)
    ) {
      // 11-3 1차-7 — 한글 매핑 silent. Map.get은 has 통과 후 호출이라 non-null 보장.
      schoolLevel = KOREAN_SCHOOL_LEVEL_MAP.get(normalizedSchoolLevel) as string;
    } else {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolLevel",
        message: `schoolLevel '${r.schoolLevel}'이 허용 범위 외라 "other"로 fallback`,
        source: input.meta.source,
      });
      schoolLevel = "other";
    }

    // step 6: schoolType enum
    //   1차-5: case-insensitive normalize. null silent / valid → lowercase canonical.
    //   1차-9: allowlist miss 시 KOREAN_SCHOOL_TYPE_MAP에서 한글 매핑 시도.
    //          매핑 hit → silent + 영문 lowercase canonical. miss → null + warning.
    //   boundary rule: "특수"(schoolType) vs "특수학교"(schoolLevel) — Map별 독립 키.
    const normalizedSchoolType = normalizeEnumValue(r.schoolType);
    let schoolType: string | null;
    if (normalizedSchoolType === null) {
      schoolType = null;
    } else if (ALLOWED_SCHOOL_TYPE.has(normalizedSchoolType)) {
      schoolType = normalizedSchoolType;
    } else if (KOREAN_SCHOOL_TYPE_MAP.has(normalizedSchoolType)) {
      // 11-3 1차-9 — 한글 매핑 silent. Map.get은 has 통과 후라 non-null 보장.
      schoolType = KOREAN_SCHOOL_TYPE_MAP.get(normalizedSchoolType) as string;
    } else {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolType",
        message: `schoolType '${r.schoolType}'이 허용 범위 외라 null로 fallback`,
        source: input.meta.source,
      });
      schoolType = null;
    }

    // step 7: establishmentType enum
    //   1차-5: case-insensitive normalize. null silent / valid → lowercase canonical.
    //   1차-7: allowlist miss 시 KOREAN_ESTABLISHMENT_TYPE_MAP에서 한글 매핑 시도.
    //          매핑 hit → silent + 영문 lowercase canonical. miss → null + warning.
    const normalizedEstablishmentType = normalizeEnumValue(r.establishmentType);
    let establishmentType: string | null;
    if (normalizedEstablishmentType === null) {
      establishmentType = null;
    } else if (ALLOWED_ESTABLISHMENT_TYPE.has(normalizedEstablishmentType)) {
      establishmentType = normalizedEstablishmentType;
    } else if (KOREAN_ESTABLISHMENT_TYPE_MAP.has(normalizedEstablishmentType)) {
      // 11-3 1차-7 — 한글 매핑 silent. Map.get은 has 통과 후라 non-null 보장.
      establishmentType = KOREAN_ESTABLISHMENT_TYPE_MAP.get(
        normalizedEstablishmentType,
      ) as string;
    } else {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "establishmentType",
        message: `establishmentType '${r.establishmentType}'이 허용 범위 외라 null로 fallback`,
        source: input.meta.source,
      });
      establishmentType = null;
    }

    // step 8: coordinate pair-level — Soft preserve + pair null fallback
    let latitude = r.latitude;
    let longitude = r.longitude;
    if (latitude !== null || longitude !== null) {
      // 적어도 한쪽이 non-null인 경우만 검증 (둘 다 null은 silent)
      const oneSideNull = latitude === null || longitude === null;
      const latOutOfRange =
        latitude !== null &&
        (latitude < KOREA_LAT_MIN || latitude > KOREA_LAT_MAX);
      const lngOutOfRange =
        longitude !== null &&
        (longitude < KOREA_LNG_MIN || longitude > KOREA_LNG_MAX);
      if (oneSideNull || latOutOfRange || lngOutOfRange) {
        issues.push({
          severity: "warning",
          datasetCategory: "B",
          field: "coordinate",
          message: `좌표(lat=${latitude}, lng=${longitude})가 한국 범위(lat ${KOREA_LAT_MIN}~${KOREA_LAT_MAX}, lng ${KOREA_LNG_MIN}~${KOREA_LNG_MAX}) 외이거나 한쪽만 null이라 양쪽 null로 fallback`,
          source: input.meta.source,
        });
        latitude = null;
        longitude = null;
      }
    }

    // step 9: neisSchoolCode 형식 검증 (1차-15) — Soft preserve.
    //   - null 입력 → null silent.
    //   - trim 후 "" → null로 정규화 + silent (whitespace-only 포함).
    //   - `^B\d{9}$` valid → 그대로 보존 + silent.
    //   - non-empty invalid → trimmed value preserve + warning(field: "neisSchoolCode").
    //   - record drop 0건 (보조 식별자, schoolId 정책과 분리).
    let neisSchoolCode: string | null;
    if (neisSchoolCodeTrimmed === null || neisSchoolCodeTrimmed.length === 0) {
      neisSchoolCode = null;
    } else if (NEIS_SCHOOL_CODE_PATTERN.test(neisSchoolCodeTrimmed)) {
      neisSchoolCode = neisSchoolCodeTrimmed;
    } else {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "neisSchoolCode",
        message: `neisSchoolCode '${r.neisSchoolCode}'이 'B\\d{9}' 형식과 일치하지 않아 원본을 보존함`,
        source: input.meta.source,
      });
      neisSchoolCode = neisSchoolCodeTrimmed;
    }

    // step 10: schoolName keyword presence 검증 (1차-17) — Soft preserve.
    //   - normalized schoolName(step 1 trim/collapse 후)을 대상으로 keyword 검사.
    //   - 빈 schoolName은 step 4에서 이미 warning이 발행되었고 본 step은 미경유.
    //   - keyword 부재 non-empty → normalized value preserve + warning(field: "schoolName").
    //   - record drop 0건. silent transform(약어 확장 / 분교 정리 등) 미도입.
    if (schoolName.length > 0 && !SCHOOL_NAME_KEYWORD_PATTERN.test(schoolName)) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "schoolName",
        message: `schoolName '${schoolName}'에 '학교' 또는 '유치원' 키워드가 부재하여 원본을 보존함`,
        source: input.meta.source,
      });
    }

    // 새 record 객체 생성 — 입력 객체 mutate 금지 (pure function)
    records.push({
      schoolId,
      neisSchoolCode,
      schoolName,
      schoolLevel,
      schoolType,
      establishmentType,
      address,
      sidoName,
      sigunguName,
      latitude,
      longitude,
    });
  }

  return {
    records,
    issues,
    meta: {
      source: input.meta.source,
      sourcePolicyStatus: input.meta.sourcePolicyStatus,
      license: input.meta.license,
      collectedAt: input.meta.collectedAt,
      cleanedRecordCount: records.length,
      issueCount: issues.length,
    },
  };
}
