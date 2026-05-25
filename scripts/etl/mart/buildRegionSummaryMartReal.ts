/**
 * 11-3 1차-30 — B region_summary mart.real builder.
 * 11-3 1차-34 — `supportCenterMaster` input 추가 (B-4 supportCenter master.real 도입에 따라
 *               mart.real region_summary의 supportCenterCount 보강).
 * 11-3 1차-36 — `demandMaster` input 추가 (A demand master.real 도입에 따라
 *               mart.real region_summary의 specialEducationStudentCount /
 *               registeredDisabledCount 보강). Block C field +2.
 *
 * 정책 (사용자 합의값 §1-7):
 * - region summary는 mart 단계 책임 (CLAUDE.md §4 단방향 5단계 원칙).
 * - **기존 `buildRegionSummaryMart` pure builder를 재사용**한다. 본 모듈은 thin
 *   wrapper — admin_codes record → MasterRegionRecord 변환 + demand/supportCenter empty 처리만 담당.
 * - 입력: G admin_codes clean records + B school_master records + (1차-34 신규)
 *   B-4 supportCenter master records (optional, default 빈 배열) + (1차-36 신규)
 *   A demand master records (optional, default 빈 배열 — 후방 호환).
 * - 결과: regionCode + sidoCode/sigunguCode/sidoName/sigunguName + regionName(derived)
 *   + schoolCount + specialSchoolCount + specialClassCount (B/school_master group-by)
 *   + **supportCenterCount** (B-4 supportCenter master group-by, 1차-34 신규)
 *   + **specialEducationStudentCount / registeredDisabledCount** (A demand master left join,
 *     1차-36 신규).
 *   trainingInstitutionCount/careerExperienceCenterCount/welfareFacilityCount/jobPostingCount=0
 *   (기존 builder 정책 그대로).
 *
 * **mini fixture 한계 (사용자 합의값 §6)**:
 * - mini fixture 기반 master.real B school은 sigunguName="시연구" 매칭 실패로
 *   records=0일 수 있다. 그 경우 본 wrapper도 schoolCount=0 다수가 정상.
 * - 실 학교알리미/NEIS raw 도입 시 실 sidoName/sigunguName이 매칭되어 schoolCount
 *   채워질 준비 단계.
 *
 * **per-record `meta.source` 주의**: 기존 `buildRegionSummaryMart`는 결과 각 record에
 * `meta: { source: "demo:fixture-etl", note: "..." }`를 hardcode로 부여한다 (literal 타입).
 * 본 wrapper는 builder를 재사용하므로 per-record meta는 그대로 유지된다 — 1차-30 정책
 * "기존 pure builder 재사용" 일관. 파일 수준 `_meta.source`는 runRealMartStage가
 * `"real:B-region-summary-mart"`로 별도 부여하므로 출처 구분은 파일 수준에서 명확하다.
 *
 * **Pure function** — fs/path 사용 X. 입력 array 변형 0건, 출력 records는 builder
 * 가 생성한 새 배열 그대로 전달.
 */

import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";
import type {
  MasterDemandRecord,
  MasterRegionRecord,
  MasterSchoolRecord,
  MasterSupportCenterRecord,
} from "../master/types";
import { buildRegionSummaryMart } from "./buildRegionSummaryMart";
import type { MartBuildResult } from "./types";

export interface BuildRegionSummaryMartRealInput {
  /** G admin_codes clean records (1차-15 ETL real clean 산출). */
  adminCodes: CleanedRegionCodeRecord[];
  /** B school_master records (1차-23 master.real 산출). */
  schoolMaster: MasterSchoolRecord[];
  /**
   * 11-3 1차-34 신규 — B-4 supportCenter master records (1차-34 master.real 산출).
   * Optional: 미지정 시 빈 배열로 default (후방 호환, 1차-30 동작 유지).
   */
  supportCenterMaster?: MasterSupportCenterRecord[];
  /**
   * 11-3 1차-36 신규 — A demand master records (1차-36 master.real 산출).
   * Optional: 미지정 시 빈 배열로 default (후방 호환, 1차-30 / 1차-34 동작 유지 —
   * specialEducationStudentCount / registeredDisabledCount 모두 undefined).
   */
  demandMaster?: MasterDemandRecord[];
}

/**
 * CleanedRegionCodeRecord → MasterRegionRecord 변환.
 * 필드 그대로 전파 — admin_codes는 이미 master 단계 입력 shape과 동등.
 * coordinate / source 필드는 admin_codes record가 보유하지 않으므로 미설정.
 */
function adminToRegionMaster(
  admin: CleanedRegionCodeRecord,
): MasterRegionRecord {
  return {
    regionCode: admin.regionCode,
    regionCodeType: admin.regionCodeType,
    sidoCode: admin.sidoCode,
    sigunguCode: admin.sigunguCode,
    sidoName: admin.sidoName,
    sigunguName: admin.sigunguName,
    // coordinate: admin_codes record에 좌표 부재
    // source: 1차-23 real path이지만 fixture의 "admin-union"/"json-fixture"와는 다른
    //         의미 도메인. builder의 partialRegionFlag derive 로직은 false 결과.
  };
}

/**
 * mart.real B region_summary builder.
 *
 * admin_codes → regionMaster 변환 후 기존 buildRegionSummaryMart 호출.
 * demandMaster는 입력에서 받거나 미지정 시 빈 배열 default (1차-36 신규 — A demand master.real
 * 도입 전까지는 빈 배열로 기존 1차-30 / 1차-34 동작 유지).
 * supportCenterMaster는 입력에서 받거나 미지정 시 빈 배열 default (1차-34 신규).
 */
export function buildRegionSummaryMartReal(
  input: BuildRegionSummaryMartRealInput,
): MartBuildResult {
  const regionMaster = input.adminCodes.map(adminToRegionMaster);
  return buildRegionSummaryMart({
    regionMaster,
    demandMaster: input.demandMaster ?? [],
    schoolMaster: input.schoolMaster,
    supportCenterMaster: input.supportCenterMaster ?? [],
  });
}
