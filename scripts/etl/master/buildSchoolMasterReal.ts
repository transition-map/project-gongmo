/**
 * 11-3 1차-23 — B school master.real builder (G admin lookup).
 *
 * 정책 (사용자 합의값 §1-7):
 * - regionCode 부여는 master 단계의 책임 (CLAUDE.md §4 Raw → Clean → Master 단방향
 *   5단계 원칙). cleanSchools / frontend etlAdapter는 이 작업을 하지 않는다.
 * - school.sidoName + school.sigunguName을 G admin_codes의 sidoName + sigunguName과
 *   **exact match** (trim + 내부 공백 collapse 정도의 안전한 정규화만 허용).
 * - alias / hardcode / fake region mapping 금지. frontend DEMO-SIGUNGU-* 매핑 금지.
 * - 매칭 실패 record는 master records에서 **제외** + warning issue
 *   (severity: "warning", datasetCategory: "B", field: "regionCode",
 *   message에 sidoName/sigunguName 포함).
 * - `MasterSchoolRecord` schema 무변경 (1차-23은 `sidoCode`/`sigunguCode` 추가 X).
 * - **Pure function** — 입력 array·record 객체 mutate 0건.
 *
 * mini fixture 시나리오: `B_schools_mini.json` 3건은 모두 `sigunguName="시연구"`라
 * 실 G admin 271건과 매칭 실패 → records=0 / issues=3. 이는 정책상 정상이며,
 * 실 학교알리미/NEIS raw 데이터 도입 시 실 sidoName/sigunguName이 매칭되어
 * regionCode 부여가 정상화될 준비 단계.
 */

import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";
import type { DataQualityIssue } from "../types";
import type { MasterSchoolRecord } from "./types";

/**
 * 입력 school record shape — cleanSchools.ts의 `CleanedSchoolRecord`와 동일하지만
 * import 순환을 피하기 위해 본 모듈에서 별도 정의. nullable 필드는 cleanSchools
 * 출력 그대로.
 */
export interface CleanedSchoolForMaster {
  schoolId: string;
  neisSchoolCode: string | null;
  schoolName: string;
  schoolLevel: string;
  schoolType: string | null;
  establishmentType: string | null;
  address: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BuildSchoolMasterRealInput {
  schools: CleanedSchoolForMaster[];
  adminCodes: CleanedRegionCodeRecord[];
}

export interface BuildSchoolMasterRealResult {
  records: MasterSchoolRecord[];
  issues: DataQualityIssue[];
}

/** trim + 내부 다중 공백 collapse. null / undefined / 빈 → "". */
function normalizeForLookup(name: string | null | undefined): string {
  if (name == null) return "";
  return name.trim().replace(/\s+/g, " ");
}

/**
 * G admin_codes records로부터 `${normalizedSidoName}|${normalizedSigunguName}`을
 * key로 하는 lookup map을 구성한다. sidoName 또는 sigunguName이 빈 admin record는
 * lookup에 포함하지 않는다 (의미 있는 매칭 키를 만들 수 없으므로).
 */
function buildAdminLookup(
  adminCodes: CleanedRegionCodeRecord[],
): Map<string, CleanedRegionCodeRecord> {
  const lookup = new Map<string, CleanedRegionCodeRecord>();
  for (const admin of adminCodes) {
    const sido = normalizeForLookup(admin.sidoName);
    const sigungu = normalizeForLookup(admin.sigunguName);
    if (sido === "" || sigungu === "") continue;
    const key = `${sido}|${sigungu}`;
    if (!lookup.has(key)) {
      lookup.set(key, admin);
    }
  }
  return lookup;
}

/**
 * B school master.real builder.
 *
 * sidoName + sigunguName join으로 regionCode 부여. 매칭 실패 record는 제외 +
 * warning issue. MasterSchoolRecord schema는 변경하지 않는다 (sidoCode/sigunguCode
 * 필드 추가는 1차-25+ 별도 합의 후).
 */
export function buildSchoolMasterReal(
  input: BuildSchoolMasterRealInput,
): BuildSchoolMasterRealResult {
  const lookup = buildAdminLookup(input.adminCodes);
  const records: MasterSchoolRecord[] = [];
  const issues: DataQualityIssue[] = [];

  for (const school of input.schools) {
    const sidoKey = normalizeForLookup(school.sidoName);
    const sigunguKey = normalizeForLookup(school.sigunguName);

    if (sidoKey === "" || sigunguKey === "") {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "regionCode",
        message: `school '${school.schoolId}'의 sidoName='${school.sidoName ?? ""}' / sigunguName='${school.sigunguName ?? ""}'이 비어 있어 regionCode를 부여할 수 없음 → master에서 제외`,
      });
      continue;
    }

    const lookupKey = `${sidoKey}|${sigunguKey}`;
    const match = lookup.get(lookupKey);
    if (!match) {
      issues.push({
        severity: "warning",
        datasetCategory: "B",
        field: "regionCode",
        message: `school '${school.schoolId}'의 sidoName='${school.sidoName ?? ""}' / sigunguName='${school.sigunguName ?? ""}'이 G admin_codes에 매칭되지 않아 master에서 제외`,
      });
      continue;
    }

    // MasterSchoolRecord schema 무변경 — sidoCode/sigunguCode 필드는 1차-23에서 추가하지 않는다.
    const masterRecord: MasterSchoolRecord = {
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      regionCode: match.regionCode,
      regionCodeType: match.regionCodeType,
    };
    if (school.neisSchoolCode !== null) {
      masterRecord.neisSchoolCode = school.neisSchoolCode;
    }
    if (school.schoolType !== null) {
      masterRecord.schoolType = school.schoolType;
    }
    if (school.address !== null) {
      masterRecord.address = school.address;
    }
    if (school.sidoName !== null) {
      masterRecord.sidoName = school.sidoName;
    }
    if (school.sigunguName !== null) {
      masterRecord.sigunguName = school.sigunguName;
    }
    records.push(masterRecord);
  }

  return { records, issues };
}
