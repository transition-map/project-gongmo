/**
 * 4단계 mock 공용 상수·헬퍼.
 *
 * - 모든 mock 파일이 import해서 RegionRef·날짜·ID·기준 좌표를 일관되게 사용한다.
 * - 모든 데이터는 시연용(demo). 실제 행정코드는 추정하지 않으며, regionCode는
 *   "DEMO-SIGUNGU-XX" 형태를 유지한다.
 * - `meta.source`에 "demo:" prefix를 사용해 시연용임을 명시한다.
 */

import type { Coordinate, RegionCodeType } from "../../types";
import type { RegionRef } from "../../types/region";

// ─── 시점·버전 상수 ───────────────────────────────────────────────────────
// 2026 정책: 본 프로토타입은 2026년에 사용되며, 분석 기준연도도 2026으로 통일한다.
// DEMO_PRIOR_YEAR(2025)는 mobilityAccess 추세 비교를 위한 전년도 baseline.
export const DEMO_BASE_YEAR = 2026;
export const DEMO_PRIOR_YEAR = 2025;
/** TransitionIndex.calculatedAt 등에 일관 사용. demo 고정 timestamp. */
export const DEMO_CALCULATED_AT = "2026-05-11T00:00:00+09:00";
export const DEMO_INDICATOR_VERSION = "demo-v0";
/** 데이터 수집·갱신 시각의 demo 기준값 */
export const DEMO_COLLECTED_AT = "2026-05-10T00:00:00+09:00";
export const DEMO_SOURCE_UPDATED_AT = "2026-05-01T00:00:00+09:00";
/** 자유 라이선스 명시값. 실제 라이선스는 7단계에서 출처별로 채운다. */
export const DEMO_LICENSE = "demo-only / 공모전 시연용";

// ─── 시연용 6개 시군구 ────────────────────────────────────────────────────
export interface DemoRegionMeta extends RegionRef {
  /** 시군구별 기준 좌표 (한반도 내 대략값. demo). */
  baseLat: number;
  baseLng: number;
}

const SIGUNGU_TYPE: RegionCodeType = "sigungu";

export const DEMO_REGIONS: DemoRegionMeta[] = [
  {
    regionCode: "DEMO-SIGUNGU-01",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-01",
    regionName: "서울특별시 강남구",
    baseLat: 37.51,
    baseLng: 127.06,
  },
  {
    regionCode: "DEMO-SIGUNGU-02",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-02",
    regionName: "부산광역시 해운대구",
    baseLat: 35.16,
    baseLng: 129.16,
  },
  {
    regionCode: "DEMO-SIGUNGU-03",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-03",
    regionName: "경기도 수원시 영통구",
    baseLat: 37.27,
    baseLng: 127.05,
  },
  {
    regionCode: "DEMO-SIGUNGU-04",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-04",
    regionName: "충청북도 청주시 흥덕구",
    baseLat: 36.65,
    baseLng: 127.45,
  },
  {
    regionCode: "DEMO-SIGUNGU-05",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-05",
    regionName: "전라남도 목포시",
    baseLat: 34.81,
    baseLng: 126.39,
  },
  {
    regionCode: "DEMO-SIGUNGU-06",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-06",
    regionName: "강원특별자치도 춘천시",
    baseLat: 37.88,
    baseLng: 127.73,
  },
  // 11-2 1차-11 신규 — 시연용 partial/skeletal region.
  // ETL `MartRegionSummaryRecord.partialRegionFlag=true`에 대응하는 화면 시연용 region.
  // demand/school/supportCenter 데이터가 부재한 상태를 화면에서 표현하기 위한 demo.
  // 좌표는 한반도 내 임의 baseline (실 좌표 아님, demo).
  {
    regionCode: "DEMO-SIGUNGU-07-PARTIAL",
    regionCodeType: SIGUNGU_TYPE,
    sigunguCode: "DEMO-SIGUNGU-07-PARTIAL",
    regionName: "(시연용) 데이터 부족 지역",
    baseLat: 36.5,
    baseLng: 127.5,
  },
];

/** regionCode → DemoRegionMeta 빠른 lookup */
export const DEMO_REGION_BY_CODE: Record<string, DemoRegionMeta> =
  Object.fromEntries(DEMO_REGIONS.map((r) => [r.regionCode, r]));

/** RegionRef만 필요한 도메인 mock에서 사용 */
export function regionRefOf(code: string): RegionRef {
  const r = DEMO_REGION_BY_CODE[code];
  if (!r) throw new Error(`[mocks/_shared] unknown demo regionCode: ${code}`);
  const { baseLat: _bLat, baseLng: _bLng, ...ref } = r;
  void _bLat;
  void _bLng;
  return ref;
}

// ─── 좌표 헬퍼 ─────────────────────────────────────────────────────────────
/**
 * 시군구 base 좌표에서 약간 흩뿌린 demo 좌표.
 * coordinateSource·geocodingStatus 모두 "approximate"로 표기한다.
 */
export function demoCoordinate(
  regionCode: string,
  dx = 0,
  dy = 0,
): Coordinate {
  const r = DEMO_REGION_BY_CODE[regionCode];
  if (!r)
    throw new Error(`[mocks/_shared] unknown demo regionCode: ${regionCode}`);
  return {
    lat: round6(r.baseLat + dy),
    lng: round6(r.baseLng + dx),
    coordinateSource: "approximate",
    geocodingStatus: "approximate",
  };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

// ─── ID 생성 헬퍼 ──────────────────────────────────────────────────────────
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** institutionId: `inst:{type}:{source}:{sourceId|slug}` */
export function makeInstitutionId(
  institutionType: string,
  sourceId: string,
  source = "demo",
): string {
  return `inst:${institutionType}:${source}:${slug(sourceId)}`;
}

/** schoolId: `school:{source}:{sourceId|slug}` */
export function makeSchoolId(sourceId: string, source = "demo"): string {
  return `school:${source}:${slug(sourceId)}`;
}

/** trainingProgramId: `training:{source}:{sourceId|slug}` */
export function makeTrainingProgramId(
  sourceId: string,
  source = "demo",
): string {
  return `training:${source}:${slug(sourceId)}`;
}

/** CareerExperienceProgram.programId — training과 같은 네임스페이스 사용 */
export function makeCareerProgramId(
  sourceId: string,
  source = "demo-career",
): string {
  return `training:${source}:${slug(sourceId)}`;
}

/** jobPostingId: `job:{source}:{sourceId|slug}` */
export function makeJobPostingId(sourceId: string, source = "demo"): string {
  return `job:${source}:${slug(sourceId)}`;
}
