/**
 * 11-2 1차-1 ingest 단계 type guard 모음.
 *
 * - ingest 함수 입력/출력의 형식 검증을 한곳에 모은다.
 * - 외부 출처(CSV·API 응답)의 형식 위반을 발견 즉시 좁히기 위한 runtime guard.
 * - zod / 외부 라이브러리 미사용. 자체 정규식·typeof 기반.
 * - 본 모듈은 fs / process.env / 외부 API 의존 0건.
 *
 * 위치 선택 근거: 1차-1, 1차-2 등 후속 ingestXxx 함수가 같은 폴더에서 import하기
 * 위해 `scripts/etl/ingest/` 하위에 둔다. cleaner/master 등이 같은 guard를
 * 필요로 하면 `scripts/etl/guards.ts`로 promote 가능.
 */

import type { RegionCodeType } from "../../../src/types";

// ─── 정규식 상수 ──────────────────────────────────────────────────────────
/** 5자리 숫자 시군구 코드 패턴 (예: "11680"). */
export const SIGUNGU_CODE_PATTERN = /^\d{5}$/;
/** 2자리 숫자 시도 코드 패턴 (예: "11"). */
export const SIDO_CODE_PATTERN = /^\d{2}$/;
/** 10자리 숫자 법정동 코드 패턴 (예: "1168010100"). 11-2 1차-2 추가. */
export const LEGAL_DONG_CODE_PATTERN = /^\d{10}$/;

// ─── 단순 타입 가드 ────────────────────────────────────────────────────────
/** unknown 값이 5자리 숫자 sigunguCode 문자열인지 검증. */
export function isValidSigunguCode(value: unknown): value is string {
  return typeof value === "string" && SIGUNGU_CODE_PATTERN.test(value);
}

/** unknown 값이 2자리 숫자 sidoCode 문자열인지 검증. */
export function isValidSidoCode(value: unknown): value is string {
  return typeof value === "string" && SIDO_CODE_PATTERN.test(value);
}

/** unknown 값이 10자리 숫자 법정동코드 문자열인지 검증. 11-2 1차-2 추가. */
export function isValidLegalDongCode(value: unknown): value is string {
  return typeof value === "string" && LEGAL_DONG_CODE_PATTERN.test(value);
}

// ─── 도메인 헬퍼 ───────────────────────────────────────────────────────────
/**
 * 폐지여부 문자열을 boolean으로 변환.
 * 행안부 행정표준코드 CSV의 일반 표기를 모두 흡수한다.
 * - "Y" / "y" / "폐지" → true
 * - "N" / "n" / "존재" / "" / undefined → false
 */
export function parseAbolishedFlag(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const v = raw.trim().toUpperCase();
  return v === "Y" || v === "폐지";
}

/**
 * 11-2 1차-15 추가 — 행안부 KIKcd_B/H/mix의 `말소일자` 컬럼을 boolean으로 변환.
 * 실 파일은 `폐지여부` 컬럼이 없고 `말소일자`(YYYYMMDD 8자리 또는 빈 값)로 폐지를 표현한다.
 *
 * - 빈 문자열 / 공백만 / undefined → false (유효)
 * - 8자리 숫자 (YYYYMMDD) → true (말소)
 * - 그 외 (형식 위반) → false (호출자가 별도 issue 보고 책임)
 */
export function parseExpirationDate(value: string | undefined): boolean {
  if (value === undefined) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return /^\d{8}$/.test(trimmed);
}

// ─── 합성 가드 ─────────────────────────────────────────────────────────────
/**
 * RawAdminCodeRecord 형태 type guard.
 * ingest 결과를 호출자가 다시 좁힐 때 사용한다 (옵션).
 *
 * 참고: RawAdminCodeRecord 구조 변경 시 본 가드도 함께 갱신.
 */
export interface RawAdminCodeRecordShape {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode: string;
  sidoName: string;
  sigunguCode: string;
  sigunguName: string;
}

export function isRawAdminCodeRecord(
  value: unknown,
): value is RawAdminCodeRecordShape {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    isValidSigunguCode(r.regionCode) &&
    r.regionCodeType === "sigungu" &&
    isValidSidoCode(r.sidoCode) &&
    typeof r.sidoName === "string" &&
    r.sidoName.length > 0 &&
    isValidSigunguCode(r.sigunguCode) &&
    typeof r.sigunguName === "string" &&
    r.sigunguName.length > 0
  );
}

/**
 * RawLegalDongRecord 형태 type guard. 11-2 1차-2 추가.
 *
 * - regionCode / legalDongCode = 10자리
 * - sidoCode = 2자리, sigunguCode = 앞 5자리 (slice 결과)
 * - regionCodeType = "legalDong"
 */
export interface RawLegalDongRecordShape {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode: string;
  sigunguCode: string;
  legalDongCode: string;
  sidoName: string;
  sigunguName: string;
  emdName: string;
}

export function isRawLegalDongRecord(
  value: unknown,
): value is RawLegalDongRecordShape {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    isValidLegalDongCode(r.regionCode) &&
    r.regionCodeType === "legalDong" &&
    isValidSidoCode(r.sidoCode) &&
    isValidSigunguCode(r.sigunguCode) &&
    isValidLegalDongCode(r.legalDongCode) &&
    typeof r.sidoName === "string" &&
    r.sidoName.length > 0 &&
    typeof r.sigunguName === "string" &&
    r.sigunguName.length > 0 &&
    typeof r.emdName === "string" &&
    r.emdName.length > 0
  );
}
