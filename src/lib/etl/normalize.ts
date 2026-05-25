/**
 * 8단계 ETL 정규화 함수 모음.
 *
 * - **throw하지 않는다.** 모든 함수는 비정상 입력에도 안전한 fallback을 반환한다.
 * - DataQualityIssue 누적은 IssueCollector 콜백 방식 (선택적 주입).
 * - SHA-256 등 안정적 hash는 사용하지 않는다. 내부 `slug()`는 8단계 임시 helper.
 * - Node API(fs/path/process/dotenv 등) import 없음.
 */

import type {
  Coordinate,
  CoordinateSource,
  GeocodingStatus,
  InstitutionType,
  RegionCodeType,
} from "../../types";
import type {
  DatasetCategory,
  DataQualityIssue,
  IssueCollector,
} from "./types";

// ─── 내부 helper ────────────────────────────────────────────────────────────
function reportIssue(
  collector: IssueCollector | undefined,
  severity: "warning" | "error",
  field: string | undefined,
  message: string,
  datasetCategory?: DatasetCategory,
): void {
  if (!collector) return;
  const issue: DataQualityIssue = {
    severity,
    field,
    message,
    datasetCategory,
  };
  collector(issue);
}

/**
 * stage 8 temporary slug; replace with stable hash in stage 9.
 * (소문자화 + 공백→하이픈 + 일부 특수문자 제거. 한글 유지.)
 */
function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseNum(v: number | string | undefined | null): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

// ─── 1. regionCode ─────────────────────────────────────────────────────────
export interface NormalizeRegionCodeInput {
  raw: string;
  expectedLevel?: RegionCodeType;
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeRegionCodeResult {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  legalDongCode?: string;
}

/**
 * KOSTAT 행정구역 코드 정규화.
 * - 자릿수로 sido/sigungu/haengjeongDong/legalDong 추론
 * - 비정상 형식이면 issue 보고 후 raw 그대로 fallback
 * - **선행 0 보존** — 항상 string으로 다룬다.
 */
export function normalizeRegionCode(
  input: NormalizeRegionCodeInput,
): NormalizeRegionCodeResult {
  const raw = (input.raw ?? "").trim();

  if (!/^\d{2,10}$/.test(raw)) {
    reportIssue(
      input.collectIssue,
      "warning",
      "regionCode",
      `unexpected regionCode format`,
      input.datasetCategory,
    );
    return {
      regionCode: raw,
      regionCodeType: input.expectedLevel ?? "sigungu",
    };
  }

  let inferred: RegionCodeType;
  if (raw.length === 2) inferred = "sido";
  else if (raw.length === 5) inferred = "sigungu";
  else if (raw.length === 8) inferred = "haengjeongDong";
  else if (raw.length === 10) inferred = "legalDong";
  else inferred = input.expectedLevel ?? "sigungu";

  if (input.expectedLevel && input.expectedLevel !== inferred) {
    reportIssue(
      input.collectIssue,
      "warning",
      "regionCode",
      `regionCode digit length does not match expectedLevel`,
      input.datasetCategory,
    );
  }

  return {
    regionCode: raw,
    regionCodeType: input.expectedLevel ?? inferred,
    sidoCode: raw.length >= 2 ? raw.slice(0, 2) : undefined,
    sigunguCode: raw.length >= 5 ? raw.slice(0, 5) : undefined,
    legalDongCode: raw.length === 10 ? raw : undefined,
  };
}

// ─── 2. schoolId ───────────────────────────────────────────────────────────
export interface NormalizeSchoolIdInput {
  neisSchoolCode?: string;
  schoolName: string;
  address?: string;
  source: string;
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeSchoolIdResult {
  schoolId: string;
  neisSchoolCode?: string;
}

/**
 * NEIS 학교 표준 코드가 있으면 그 값으로 schoolId 생성.
 * 부재 시 임시 ID `school:{source}:{slug(name+address)}` (stage 8 임시).
 */
export function normalizeSchoolId(
  input: NormalizeSchoolIdInput,
): NormalizeSchoolIdResult {
  const neis = (input.neisSchoolCode ?? "").trim();
  if (neis.length > 0) {
    return { schoolId: `school:neis:${neis}`, neisSchoolCode: neis };
  }
  const name = (input.schoolName ?? "").trim();
  if (name.length === 0) {
    reportIssue(
      input.collectIssue,
      "warning",
      "schoolName",
      "missing schoolName; falling back to source-only id",
      input.datasetCategory,
    );
    return { schoolId: `school:${input.source}:unknown` };
  }
  const slugged = slug(`${name}-${input.address ?? ""}`);
  return { schoolId: `school:${input.source}:${slugged || "unknown"}` };
}

// ─── 3. institutionId ──────────────────────────────────────────────────────
export interface NormalizeInstitutionIdInput {
  institutionType: InstitutionType;
  source: string;
  sourceId?: string;
  institutionName: string;
  address?: string;
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeInstitutionIdResult {
  institutionId: string;
}

/**
 * sourceId가 있으면 `inst:{type}:{source}:{sourceId}`,
 * 없으면 `inst:{type}:{source}:{slug(name+address)}` (stage 8 임시).
 */
export function normalizeInstitutionId(
  input: NormalizeInstitutionIdInput,
): NormalizeInstitutionIdResult {
  const sid = (input.sourceId ?? "").trim();
  if (sid.length > 0) {
    return {
      institutionId: `inst:${input.institutionType}:${input.source}:${sid}`,
    };
  }
  const name = (input.institutionName ?? "").trim();
  if (name.length === 0) {
    reportIssue(
      input.collectIssue,
      "warning",
      "institutionName",
      "missing institutionName; falling back to source-only id",
      input.datasetCategory,
    );
    return {
      institutionId: `inst:${input.institutionType}:${input.source}:unknown`,
    };
  }
  const slugged = slug(`${name}-${input.address ?? ""}`);
  return {
    institutionId: `inst:${input.institutionType}:${input.source}:${slugged || "unknown"}`,
  };
}

// ─── 4. jobCode ────────────────────────────────────────────────────────────
export interface NormalizeJobCodeInput {
  raw: string;
  preferredSystem?: "keco" | "worknet";
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeJobCodeResult {
  jobCode?: string;
  worknetJobCode?: string;
}

/**
 * KECO(4~7자리 숫자)는 jobCode, 그 외 형식은 worknetJobCode로 분류.
 * preferredSystem이 명시되면 우선순위 변경 가능.
 */
export function normalizeJobCode(
  input: NormalizeJobCodeInput,
): NormalizeJobCodeResult {
  const raw = (input.raw ?? "").trim();
  if (raw.length === 0) return {};

  if (/^\d{4,7}$/.test(raw)) {
    if (input.preferredSystem === "worknet") {
      return { worknetJobCode: raw };
    }
    return { jobCode: raw };
  }

  reportIssue(
    input.collectIssue,
    "warning",
    "jobCode",
    "non-KECO format; classified as worknetJobCode",
    input.datasetCategory,
  );
  return { worknetJobCode: raw };
}

// ─── 5. ncsCode ────────────────────────────────────────────────────────────
export interface NormalizeNcsCodeInput {
  raw: string;
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeNcsCodeResult {
  ncsCode?: string;
}

/**
 * NCS 능력단위 코드 형식 검증: `XX-X-XXX-X` (대분류-중분류-세분류-능력단위).
 * 매칭되지 않으면 undefined + issue.
 */
export function normalizeNcsCode(
  input: NormalizeNcsCodeInput,
): NormalizeNcsCodeResult {
  const raw = (input.raw ?? "").trim();
  if (raw.length === 0) return {};
  if (/^\d{2}-\d{1}-\d{3}-\d{1}$/.test(raw)) {
    return { ncsCode: raw };
  }
  reportIssue(
    input.collectIssue,
    "warning",
    "ncsCode",
    "ncsCode does not match XX-X-XXX-X format",
    input.datasetCategory,
  );
  return {};
}

// ─── 6. coordinate ─────────────────────────────────────────────────────────
export interface NormalizeCoordinateInput {
  rawLat?: number | string;
  rawLng?: number | string;
  source?: CoordinateSource;
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeCoordinateResult {
  coordinate: Coordinate;
}

/**
 * WGS84 (lat, lng) 정규화.
 * - 한반도 대략 범위(lat 33~39, lng 124~132) 검증
 * - 범위 벗어나면 issue + geocodingStatus="approximate"
 * - 좌표 부재 시 geocodingStatus="missing"
 */
export function normalizeCoordinate(
  input: NormalizeCoordinateInput,
): NormalizeCoordinateResult {
  const lat = parseNum(input.rawLat);
  const lng = parseNum(input.rawLng);

  if (lat === undefined || lng === undefined) {
    reportIssue(
      input.collectIssue,
      "warning",
      "coordinate",
      "missing or non-numeric lat/lng",
      input.datasetCategory,
    );
    return {
      coordinate: {
        lat,
        lng,
        coordinateSource: input.source ?? "unknown",
        geocodingStatus: "missing",
      },
    };
  }

  const inRange = lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
  let geocodingStatus: GeocodingStatus = "verified";
  if (!inRange) {
    reportIssue(
      input.collectIssue,
      "warning",
      "coordinate",
      "lat/lng outside Korean peninsula range",
      input.datasetCategory,
    );
    geocodingStatus = "approximate";
  }

  return {
    coordinate: {
      lat: round6(lat),
      lng: round6(lng),
      coordinateSource: input.source ?? "geocoded",
      geocodingStatus,
    },
  };
}

// ─── 7. address ────────────────────────────────────────────────────────────
export interface NormalizeAddressInput {
  raw: string;
  datasetCategory?: DatasetCategory;
  collectIssue?: IssueCollector;
}

export interface NormalizeAddressResult {
  address: string;
  sidoName?: string;
  sigunguName?: string;
  emdName?: string;
}

/**
 * 주소 문자열 trim + 공백 정리 + 시도 표기 일부 통일.
 *
 * 8단계는 토큰 단순 분리만 (sido/sigungu/emd).
 * 정확한 행정구역 매핑 테이블은 9단계로 미룸.
 */
export function normalizeAddress(
  input: NormalizeAddressInput,
): NormalizeAddressResult {
  const raw = (input.raw ?? "").trim();
  if (raw.length === 0) {
    reportIssue(
      input.collectIssue,
      "warning",
      "address",
      "empty address",
      input.datasetCategory,
    );
    return { address: "" };
  }

  const cleaned = raw.replace(/\s+/g, " ").trim();
  // 시도 표기 일부 통일 (단순 케이스).
  // `\b`(word boundary)는 한글 다음 공백에서 동작하지 않으므로 (?=\s|$) lookahead 사용.
  const normalized = cleaned
    .replace(/^서울시(?=\s|$)/, "서울특별시")
    .replace(/^부산시(?=\s|$)/, "부산광역시")
    .replace(/^대구시(?=\s|$)/, "대구광역시")
    .replace(/^인천시(?=\s|$)/, "인천광역시")
    .replace(/^광주시(?=\s|$)/, "광주광역시")
    .replace(/^대전시(?=\s|$)/, "대전광역시")
    .replace(/^울산시(?=\s|$)/, "울산광역시");

  const tokens = normalized.split(" ");
  return {
    address: normalized,
    sidoName: tokens[0],
    sigunguName: tokens[1],
    emdName: tokens[2],
  };
}
