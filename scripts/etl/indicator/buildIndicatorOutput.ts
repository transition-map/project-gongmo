/**
 * 11-1 2차 4차 indicator 단계 — mart + master record 일부를 도메인 객체로
 * 변환해 buildTransitionIndex(`mvp-v1`)를 시군구별로 호출한다.
 *
 * **Pure function** — fs/path 등 Node API 사용 X. runEtl가 readJson/writeJson으로
 * 입출력을 처리한다.
 *
 * **결정적 동작**: baseYear=2026, calculatedAt="2026-05-11T00:00:00+09:00" 고정.
 * indicatorVersion은 `src/lib/indicators/config`의 INDICATOR_VERSION을 그대로 사용한다.
 *
 * **C/D/E/F partial fixture 처리**:
 * - trainingPrograms / careerExperiencePrograms / jobPostings / welfareFacilities /
 *   mobilityAccess는 빈 배열로 전달.
 * - employmentOutcome은 undefined.
 * - 결과적으로 trainingSupplyIndex / employmentIndex / welfareIndex /
 *   accessibilityIndex는 모두 0에 근접한 값이 산출된다 (정상).
 *
 * 본 모듈은 src/lib/indicators의 buildTransitionIndex만 호출하며 산식은 수정하지 않는다.
 */

import { buildTransitionIndex } from "../../../src/lib/indicators";
import type {
  DataQualityIssue,
  InstitutionSummary,
  RegionSummary,
  SchoolSummary,
  SchoolType,
  TransitionIndex,
} from "../../../src/types";
import type { MartRegionSummaryRecord } from "../mart/types";
import type {
  MasterSchoolRecord,
  MasterSupportCenterRecord,
} from "../master/types";
import type { BuildIndicatorResult } from "./types";

/**
 * 결정적 동작을 위한 고정 입력. runEtl·테스트에서 동일하게 사용된다.
 *
 * - calculatedAt은 한국시간(+09:00). meta.collectedAt 표기 규칙(CLAUDE.md §8.3)과 일치.
 * - baseYear는 mock 데이터의 baseYear(2026)와 정렬해 mobilityAccess 선택 분기를 회피.
 * - 2026 정책: 본 프로토타입은 2026년에 사용되며, 분석 기준연도도 2026으로 통일한다.
 */
export const INDICATOR_BASE_YEAR = 2026 as const;
export const INDICATOR_CALCULATED_AT = "2026-05-11T00:00:00+09:00" as const;

/** SchoolType 좁히기 — master.schoolType은 string이라 SchoolType union으로 안전하게 변환. */
const SCHOOL_TYPE_VALUES: ReadonlyArray<SchoolType> = [
  "specialSchool",
  "specialClassInGeneralSchool",
  "generalSchool",
  "vocationalHighSchool",
  "alternativeSchool",
  "other",
];

function narrowSchoolType(value: string | undefined): SchoolType | undefined {
  if (value === undefined) return undefined;
  // SchoolType은 문자열 union이므로 ReadonlyArray<SchoolType>의 includes 인자 타입 호환을
  // 위해 unknown 경유 좁히기.
  const isAllowed = (SCHOOL_TYPE_VALUES as ReadonlyArray<string>).includes(value);
  return isAllowed ? (value as SchoolType) : undefined;
}

/** buildIndicatorOutput 입력. */
export interface BuildIndicatorInput {
  martRecords: MartRegionSummaryRecord[];
  schoolMaster: MasterSchoolRecord[];
  supportCenterMaster: MasterSupportCenterRecord[];
}

/**
 * mart record 1건을 RegionSummary 호환 객체로 변환.
 *
 * - regionCode/regionCodeType은 master 단계에서 5자리 게이트를 통과해 보장된 값.
 * - C/D/E/F 카운트는 mart에서 0으로 채워져 있어 그대로 전달 (산식에 영향 없음).
 * - meta는 정책 판단용 표시 필드라 indicator 입력엔 불필요 → 생략.
 */
function martToRegionSummary(m: MartRegionSummaryRecord): RegionSummary {
  return {
    regionCode: m.regionCode,
    regionCodeType: m.regionCodeType,
    sidoCode: m.sidoCode,
    sigunguCode: m.sigunguCode,
    regionName: m.regionName,
    specialEducationStudentCount: m.specialEducationStudentCount,
    registeredDisabledCount: m.registeredDisabledCount,
    schoolCount: m.schoolCount,
    trainingInstitutionCount: m.trainingInstitutionCount,
    careerExperienceCenterCount: m.careerExperienceCenterCount,
    welfareFacilityCount: m.welfareFacilityCount,
    jobPostingCount: m.jobPostingCount,
  };
}

/** school master record 1건을 SchoolSummary 호환 객체로 변환. */
function schoolMasterToSummary(s: MasterSchoolRecord): SchoolSummary {
  return {
    schoolId: s.schoolId,
    neisSchoolCode: s.neisSchoolCode,
    schoolName: s.schoolName,
    schoolType: narrowSchoolType(s.schoolType),
    region: {
      regionCode: s.regionCode,
      regionCodeType: s.regionCodeType,
      sidoCode: undefined,
      sigunguCode: undefined,
    },
    address: s.address,
  };
}

/** support center master record 1건을 InstitutionSummary 호환 객체로 변환. */
function supportCenterToSummary(
  c: MasterSupportCenterRecord,
): InstitutionSummary {
  return {
    institutionId: c.institutionId,
    institutionType: c.institutionType,
    institutionName: c.institutionName,
    region: {
      regionCode: c.regionCode,
      regionCodeType: c.regionCodeType,
      sidoCode: undefined,
      sigunguCode: undefined,
    },
    address: c.address,
  };
}

/** group by helper — `MartRegionSummaryRecord` 외부에서도 사용 가능하도록 generic. */
function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const existing = result.get(key);
    if (existing) {
      existing.push(item);
    } else {
      result.set(key, [item]);
    }
  }
  return result;
}

/**
 * mart + master record를 시군구 단위 TransitionIndex array로 변환한다.
 *
 * 빈 mart record array를 받으면 빈 records / 빈 issues를 반환 (방어적).
 */
export function buildIndicatorOutput(
  input: BuildIndicatorInput,
): BuildIndicatorResult {
  const issues: DataQualityIssue[] = [];
  const records: TransitionIndex[] = [];

  const schoolsByRegion = groupBy(input.schoolMaster, (s) => s.regionCode);
  const centersByRegion = groupBy(
    input.supportCenterMaster,
    (c) => c.regionCode,
  );

  for (const m of input.martRecords) {
    const region = martToRegionSummary(m);
    const schools = (schoolsByRegion.get(m.regionCode) ?? []).map(
      schoolMasterToSummary,
    );
    const institutions = (centersByRegion.get(m.regionCode) ?? []).map(
      supportCenterToSummary,
    );

    const idx = buildTransitionIndex({
      region,
      schools,
      institutions,
      trainingPrograms: [],
      careerExperiencePrograms: [],
      jobPostings: [],
      employmentOutcome: undefined,
      welfareFacilities: [],
      mobilityAccess: [],
      baseYear: INDICATOR_BASE_YEAR,
      calculatedAt: INDICATOR_CALCULATED_AT,
    });

    records.push(idx);
  }

  return { records, issues };
}
