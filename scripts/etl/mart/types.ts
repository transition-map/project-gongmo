/**
 * scripts/etl/mart 단계의 record 타입.
 *
 * - mart 단계는 master 산출물 4개를 시군구 단위로 결합해 분석/시각화용 단일
 *   집계 테이블을 만든다.
 * - `MartRegionSummaryRecord`는 `RegionSummary`(src/types/region.ts)와 호환되도록
 *   설계됐다. 후속 indicator 단계에서 그대로 RegionSummary로 캐스팅 가능.
 * - C/D/E/F 도메인은 11-1 2차 3차 시점에 부재이므로 관련 카운트는 0으로 둔다.
 *   결측을 숨기지 않고 _meta.partialFixture / missingDomains로 명시한다.
 * - src/types/* 무수정.
 */

import type {
  Coordinate,
  DataQualityIssue,
  RegionCodeType,
} from "../../../src/types";

/**
 * 시군구 단위 region summary mart record.
 *
 * - regionCode/regionCodeType은 필수 (master 단계에서 5자리 게이트 통과 보장).
 * - sidoName/sigunguName/regionName은 화면 라벨용.
 * - C/D/E/F 카운트(`trainingInstitutionCount` 등)는 11-1 2차 3차 시점 0.
 */
export interface MartRegionSummaryRecord {
  // RegionRef 필드
  regionCode: string;
  regionCodeType: RegionCodeType;
  sidoCode?: string;
  sigunguCode?: string;

  // 표시 라벨 (mart 자체 합성)
  sidoName?: string;
  sigunguName?: string;
  /** `${sidoName} ${sigunguName}` 합성. 둘 다 부재 시 regionCode fallback. */
  regionName?: string;

  // G — 좌표 (master에서 결합된 경우)
  coordinate?: Coordinate;

  // A — 수요
  specialEducationStudentCount?: number;
  registeredDisabledCount?: number;

  // B — 학교 / 지원센터
  schoolCount?: number;
  specialSchoolCount?: number;
  specialClassCount?: number;
  supportCenterCount?: number;

  // C/D/E/F — 11-1 2차 3차 시점 부재 (모두 0)
  trainingInstitutionCount?: number;
  careerExperienceCenterCount?: number;
  welfareFacilityCount?: number;
  jobPostingCount?: number;

  /**
   * 11-2 1차-9 신규 — admin-union으로 추가된 skeletal region 표시.
   *
   * - `true`: 이 region이 admin_code_master 출신(`source: "admin-union"`)이며,
   *   demand/school/supportCenter 데이터가 fixture에 없어 모든 카운트가 0이고
   *   transitionGapIndex가 데이터 부재로 인한 산술값(예: 60)으로 산출됨.
   *   후속 화면에서 "데이터 부재" 표시로 분기 권장.
   * - `false`: 기존 JSON fixture 기반 region (`source: "json-fixture"`). 정상 데이터.
   *
   * indicator 산식은 변경 없음. partial 여부는 화면·해석 단계에서만 처리.
   */
  partialRegionFlag?: boolean;

  /** mart record 자체 메타 (RegionSummary.meta와 호환). */
  meta?: {
    source: "demo:fixture-etl";
    note: string;
  };
}

/** buildRegionSummaryMart의 통합 결과. */
export interface MartBuildResult {
  records: MartRegionSummaryRecord[];
  issues: DataQualityIssue[];
}
