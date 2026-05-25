/**
 * scripts/etl/master 단계의 record 타입.
 *
 * - master 단계는 clean 산출물을 결합해 mart·indicator 단계가 사용할 통합
 *   record를 만든다.
 * - region master는 5자리 숫자(`/^\d{5}$/`) regionCode만 포함하는 데이터 게이트.
 *   비정상 코드는 master 진입을 거부한다 (DataQualityIssue로 보고).
 * - src/types와 src/lib/etl/types만 의존한다 (src/types/* 무수정).
 */

import type {
  Coordinate,
  DataQualityIssue,
  RegionCodeType,
} from "../../../src/types";

/**
 * G — 5자리 sigunguCode 시군구 마스터.
 *
 * 출처:
 * - 1차-1~7: JSON fixture(`G_region_codes_sample.json`) 기반 6건만 보유.
 * - **1차-9 Option B + Policy A**: 위 6건 + admin_code_master의 admin-only 4건
 *   (11650, 11200, 11410, 11440)을 union해 총 10건 보유.
 *
 * `source` 필드:
 * - `"json-fixture"`: 기존 JSON fixture 출신 6건.
 * - `"admin-union"`: 1차-9에서 admin_code_master로부터 union된 신규 4건 (coordinate 부재).
 *
 * mart 단계는 `source === "admin-union"`을 보고 `partialRegionFlag=true`로 derive.
 * indicator 산식은 무변동.
 */
export interface MasterRegionRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;
  sidoName?: string;
  sigunguName?: string;
  coordinate?: Coordinate;
  /** 1차-9 신규 — 이 record가 어느 출처에서 왔는지. */
  source?: "json-fixture" | "admin-union";
}

/**
 * A — special_education + disabled_population을 regionCode 기준 outer join.
 * 둘 중 한쪽만 있으면 partialDemand issue로 보고된다.
 */
export interface MasterDemandRecord {
  regionCode: string;
  regionCodeType: RegionCodeType;
  specialEducationStudentCount?: number;
  registeredDisabledCount?: number;
  year?: number;
}

/**
 * B — school 마스터.
 * region master에 존재하는 regionCode만 포함된다.
 * schoolName 누락 record는 issue로 보고 후 제외.
 */
export interface MasterSchoolRecord {
  schoolId: string;
  neisSchoolCode?: string;
  schoolName: string;
  schoolType?: string;
  regionCode: string;
  regionCodeType: RegionCodeType;
  address?: string;
  sidoName?: string;
  sigunguName?: string;
}

/**
 * B — 특수교육지원센터 마스터.
 * region master에 존재하는 regionCode만 포함된다.
 * institutionName 누락 record는 issue로 보고 후 제외.
 */
export interface MasterSupportCenterRecord {
  institutionId: string;
  institutionType: "supportCenter";
  institutionName: string;
  regionCode: string;
  regionCodeType: RegionCodeType;
  address?: string;
  sidoName?: string;
  sigunguName?: string;
}

/**
 * G — 법정동 10자리 dimension master (11-2 1차-4 신규).
 *
 * legalDong CSV의 5건을 그대로 보존하는 dimension table. region master(JSON
 * fixture 기반 6 sigunguCode)와의 매칭 결과를 `matchedSigunguRegion`으로 노출한다.
 *
 * - records: legalDong 5건 모두 포함 (필터링 없음).
 * - issues: sigunguCode가 region master에 없는 경우 info 보고 (3건 예상).
 * - mart/indicator로 흘러가지 않는다 (Option A 핵심 — dimension table only).
 */
export interface MasterLegalDongRecord {
  legalDongCode: string;          // 10자리
  regionCode: string;             // legalDongCode와 동일
  regionCodeType: RegionCodeType; // 항상 "legalDong"
  sidoCode?: string;
  sigunguCode: string;            // 5자리, legalDongCode.slice(0, 5)
  sidoName?: string;
  sigunguName?: string;
  emdName?: string;
  /** sigunguCode가 region master(JSON fixture 기반)에 존재하면 true. */
  matchedSigunguRegion: boolean;
}

/**
 * G — 행정구역 시군구 5자리 dimension master (11-2 1차-5 신규).
 *
 * admin_codes CSV의 5건을 그대로 보존하는 dimension table. region master(JSON
 * fixture 기반 6 sigunguCode)와의 매칭 결과를 `matchedRegionMaster`로 노출한다.
 *
 * - records: admin_codes 5건 모두 포함 (필터링 없음).
 * - issues: regionCode가 region master에 없는 경우 info 보고 (4건 예상).
 * - mart/indicator로 흘러가지 않는다 (Option A 핵심 — dimension table only).
 *
 * legalDong과 다른 점:
 * - admin code는 5자리 시군구 코드 자체가 region_master에 존재하는지 검증한다.
 *   따라서 필드명은 `matchedSigunguRegion`이 아닌 `matchedRegionMaster`를 사용한다.
 */
export interface MasterAdminCodeRecord {
  regionCode: string;             // 5자리, sigunguCode와 동일 값
  regionCodeType: RegionCodeType; // 항상 "sigungu"
  sidoCode?: string;
  sigunguCode?: string;           // 5자리, 일반적으로 regionCode와 동일
  sidoName?: string;
  sigunguName?: string;
  /** regionCode(=sigunguCode)가 region master(JSON fixture 기반)에 존재하면 true. */
  matchedRegionMaster: boolean;
}

/**
 * G — admin × legalDong cross-reference master (11-2 1차-7 신규).
 *
 * region_master(JSON fixture) / admin_code_master(CSV) / legal_dong_master(CSV slice)
 * 세 master가 공유하는 sigunguCode 집합을 union해 각 코드의 존재 여부와
 * legalDong 행 카운트를 노출하는 quality artifact.
 *
 * - records: sigunguCode union (3 master 합집합). 정렬: sigunguCode ascending.
 * - issues: 1차-4/1차-5와 중복되지 않는 NEW 관계만 보고:
 *   * admin-only orphan: admin에는 있지만 legalDong에 없는 경우.
 *   * region-only: region에는 있지만 admin/legalDong 양쪽에 없는 경우.
 *   * 모든 issue: severity="info", datasetCategory="G", field="crossref",
 *     message에 "crossref" 키워드 포함.
 * - mart/indicator로 흘러가지 않는다 (Option B 핵심 — derived quality artifact).
 */
export interface MasterAdminLegalDongCrossrefRecord {
  sigunguCode: string;
  inRegionMaster: boolean;
  inAdminCodeMaster: boolean;
  inLegalDongMaster: boolean;
  legalDongRecordCount: number;
}

/** buildMaster의 통합 결과. 각 도메인 record + 단계 issues. */
export interface MasterBuildResult {
  regionMaster: MasterRegionRecord[];
  demandMaster: MasterDemandRecord[];
  schoolMaster: MasterSchoolRecord[];
  supportCenterMaster: MasterSupportCenterRecord[];
  /** 11-2 1차-4 신규 — legalDong dimension table. */
  legalDongMaster: MasterLegalDongRecord[];
  /** 11-2 1차-5 신규 — adminCode dimension table. */
  adminCodeMaster: MasterAdminCodeRecord[];
  /** 11-2 1차-7 신규 — admin × legalDong cross-reference. */
  adminLegalDongCrossref: MasterAdminLegalDongCrossrefRecord[];
  issues: DataQualityIssue[];
}
