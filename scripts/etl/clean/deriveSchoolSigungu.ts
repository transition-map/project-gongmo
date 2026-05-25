/**
 * 11-3 1차-125 — NEIS clean output의 address에서 sigunguName을 파생하는
 * pure helper.
 *
 * **배경 (CLAUDE.md §17.6 / §17.43, 1차-124+ 계획)**:
 * NEIS schoolInfo OpenAPI 응답에는 `sigunguName` 필드 자체가 부재(`LCTN_SC_NM`은
 * 시도만 제공). 1차-121 검증 결과 100/100 records에서 `sigunguName=null`.
 * 기존 `buildSchoolMasterReal` (1차-23)이 `sidoName + sigunguName` lookup을
 * 요구하므로 sigunguName 부재 시 100% record 제외 + warning 발생.
 *
 * 본 helper는 NEIS clean records에 한해 `address` (도로명주소)에서
 * `tokens[1]=시군구`를 파생하여 sigunguName을 보강한다. `address` 100/100
 * 보유 + `normalizeAddress` (`src/lib/etl/normalize.ts:382-416`) 재사용으로
 * 100/100 sigunguName 추출 가능 예상.
 *
 * **단방향 5단계 정책 (CLAUDE.md §4) 준수**:
 * - 단일 record의 다른 field 파생 — cross-source join 아님 (master 단계 cross-source
 *   join은 `buildSchoolMasterReal`이 G admin_codes와 수행).
 * - cleanSchools (§17.8) 정책 무수정 — fixture flow에 영향 0.
 *
 * **Pure function**:
 * - fs / process.env / fetch / localStorage / sessionStorage 접근 0건
 * - 입력 array·입력 record 객체 mutate 0건 (새 배열 + 새 객체 반환)
 * - 외부 의존성 0건 — `normalizeAddress` 외 import 없음
 *
 * **금지 정책 (§17.7 / §17.43 동형)**:
 * - sigunguCode / regionCode / schoolCount 임시 생성 금지
 * - 기존 sigunguName이 있으면 덮어쓰지 않음 (idempotent)
 * - PII 필드(학생명·생년월일·진단명 등) 추가 0건 — CleanedSchoolForMaster 11 슬롯 그대로
 * - tokens[1]이 부재면 null 유지 (실 없는 시군구명을 fabricate 0건)
 *
 * **사용 시점 (runEtl.ts)**:
 * cleanSchools output의 `_meta.source`가 `real:neis-openapi-school-basic` 또는
 * `real:neis-*` 패턴일 때만 master stage에서 본 helper를 cleanSchools 결과에
 * 적용한 뒤 `buildSchoolMasterReal`에 전달. fixture / `fixture:*` source는 미적용.
 *
 * **후속 단계 (보류)**:
 * - 1차-127+ `NEIS_SCHOOL_CODE_PATTERN` 보강 (cleanSchools.ts 1차-15 정책 별도 합의)
 * - 1차-129+ `KOREAN_SCHOOL_LEVEL_MAP` 확장 (cleanSchools.ts 1차-7/11 정책 별도 합의)
 * - data/clean.real 자체 수정 0건 — 본 helper는 in-memory 보강만 수행
 */
import { normalizeAddress } from "../../../src/lib/etl/normalize";
import type { CleanedSchoolForMaster } from "../master/buildSchoolMasterReal";

export interface DeriveSchoolSigunguSummary {
  /** 입력 record 총 수 */
  total: number;
  /** address tokens[1]로 sigunguName이 새로 파생된 record 수 */
  derivedCount: number;
  /** sigunguName이 이미 있어 변경 안 된 record 수 (idempotent) */
  unchangedCount: number;
  /** address 부재 / 한 토큰만 / tokens[1] 부재로 파생 불가 record 수 */
  unresolvedCount: number;
}

export interface DeriveSchoolSigunguResult {
  records: CleanedSchoolForMaster[];
  summary: DeriveSchoolSigunguSummary;
}

/**
 * NEIS clean records의 address에서 sigunguName을 파생.
 *
 * 우선순위:
 *   1. 기존 sigunguName이 비어 있지 않으면 그대로 유지 (idempotent, unchangedCount++)
 *   2. address가 비어 있으면 sigunguName null 유지 (unresolvedCount++)
 *   3. `normalizeAddress(address).sigunguName`이 truthy 문자열이면 보강 (derivedCount++)
 *   4. tokens[1]이 부재면 sigunguName null 유지 (unresolvedCount++)
 */
export function deriveSchoolSigunguFromAddress(
  records: ReadonlyArray<CleanedSchoolForMaster>,
): DeriveSchoolSigunguResult {
  let derivedCount = 0;
  let unchangedCount = 0;
  let unresolvedCount = 0;

  const next: CleanedSchoolForMaster[] = records.map((rec) => {
    // 1. 기존 sigunguName이 있으면 idempotent 유지
    if (
      rec.sigunguName !== null &&
      typeof rec.sigunguName === "string" &&
      rec.sigunguName.trim().length > 0
    ) {
      unchangedCount += 1;
      return { ...rec };
    }

    // 2. address 부재 시 unresolved 유지
    if (
      rec.address === null ||
      typeof rec.address !== "string" ||
      rec.address.trim().length === 0
    ) {
      unresolvedCount += 1;
      return { ...rec };
    }

    // 3. address 파싱 — normalizeAddress 재사용 (tokens[1] = 시군구)
    //    collectIssue 미주입 (helper는 issue 발행 0건 정책 — 1차-23 master 단계에서
    //    이미 sidoName/sigunguName 부재 또는 admin_codes 매칭 실패를 warning으로 발행)
    const parsed = normalizeAddress({
      raw: rec.address,
      datasetCategory: "B",
    });
    const derivedSigungu = parsed.sigunguName;

    if (
      typeof derivedSigungu === "string" &&
      derivedSigungu.trim().length > 0
    ) {
      derivedCount += 1;
      return { ...rec, sigunguName: derivedSigungu };
    }

    // 4. tokens[1] 부재 — unresolved (실 없는 sigunguName fabricate 0건)
    unresolvedCount += 1;
    return { ...rec };
  });

  return {
    records: next,
    summary: {
      total: records.length,
      derivedCount,
      unchangedCount,
      unresolvedCount,
    },
  };
}
