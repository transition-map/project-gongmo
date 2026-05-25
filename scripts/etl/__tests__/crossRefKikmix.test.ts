/**
 * crossRefKikmix.test.ts — 11-2 1차-18 KIKmix cross-file validation RED 테스트.
 *
 * KIKmix mapping records의 `hjdCode` / `legalDongCode`가 같은 ETL 호출 내 메모리에
 * 보유한 hjd_codes / legal_dong_codes **clean result** records에 실제 존재하는지
 * 검증한다. (사용자 1차-18 합의값 §1-3: Set은 cleanResult.records 기준.)
 *
 * **분류 정책 (1차-18 사용자 합의값)**:
 *   - mapping.hjdCode가 hjdCodeSet에 없음 → warning issue, field `crossRef:hjdCode`.
 *   - mapping.legalDongCode가 legalDongCodeSet에 없음 → warning issue,
 *     field `crossRef:legalDongCode`.
 *   - hjdCodeSet === undefined (--hjd-codes 미지정 등) → info issue 1건 (검증 skip 안내) +
 *     해당 record들에 대한 hjdCode 검증 자체 건너뜀 (legalDongCode 검증만 수행).
 *   - legalDongCodeSet === undefined → info issue 1건 + legalDongCode 검증 skip
 *     (hjdCode 검증만 수행).
 *   - **records 변형 0건** — pure function. 입력 array 무수정, 반환값은 `{ issues }`만.
 *
 * **issue field 분리 (1차-17과 충돌 회피)**:
 *   - 1차-17 ingestKikmix/cleanKikmix issue field: `hjdCode`, `legalDongCode`,
 *     `sigunguCode`, `hjdName`, `legalDongName`, `abolished`, `duplicate`
 *   - 1차-18 crossRefKikmix issue field: `crossRef:hjdCode`, `crossRef:legalDongCode`
 *     (콜론 prefix로 출처 구분)
 *
 * **본 RED 단계 정책:**
 * - production module(`scripts/etl/clean/crossRefKikmix.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 * - 실 data/raw/G/...KIKmix.20260325 및 실 data/clean.real/G/*.clean.json 참조 0건.
 * - inline mappingRecords + inline Set만 사용.
 */

import { describe, expect, it } from "vitest";
import { validateCrossRefKikmix } from "../clean/crossRefKikmix";

// 1차-17 KikmixMappingRecord shape의 최소 부분 — cross-ref 검증에 필요한 두 코드만.
interface MappingPair {
  hjdCode: string;
  legalDongCode: string;
}

// helper: 정상 케이스 (서울 종로구 청운효자동 → 청운동 매핑)
function buildNormalPair(overrides: Partial<MappingPair> = {}): MappingPair {
  return {
    hjdCode: "1111051500",
    legalDongCode: "1111010100",
    ...overrides,
  };
}

// helper: 양쪽 Set 보유 — clean result records 기준 시뮬레이션
function buildBothSets(): {
  hjdCodeSet: Set<string>;
  legalDongCodeSet: Set<string>;
} {
  return {
    hjdCodeSet: new Set(["1111051500", "1111053000", "1111054000"]),
    legalDongCodeSet: new Set([
      "1111010100",
      "1111010200",
      "1111010300",
      "1111010400",
      "1111010500",
    ]),
  };
}

describe("validateCrossRefKikmix (11-2 1차-18)", () => {
  it("빈 mappingRecords + 양쪽 Set 보유 → issues=[]", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [],
      hjdCodeSet,
      legalDongCodeSet,
    });
    expect(result.issues).toEqual([]);
  });

  it("정상 mapping 1건 (양쪽 Set에 존재) → issues=[]", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [buildNormalPair()],
      hjdCodeSet,
      legalDongCodeSet,
    });
    expect(result.issues).toEqual([]);
  });

  it("hjdCode가 hjdCodeSet에 없음 → warning issue 1건, field 'crossRef:hjdCode'", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [
        buildNormalPair({ hjdCode: "9999999999" }), // hjdCodeSet 미포함
      ],
      hjdCodeSet,
      legalDongCodeSet,
    });
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("crossRef:hjdCode");
  });

  it("legalDongCode가 legalDongCodeSet에 없음 → warning issue 1건, field 'crossRef:legalDongCode'", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [
        buildNormalPair({ legalDongCode: "9999999999" }), // legalDongCodeSet 미포함
      ],
      hjdCodeSet,
      legalDongCodeSet,
    });
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].field).toBe("crossRef:legalDongCode");
  });

  it("양쪽 모두 없음 → warning issue 2건 (hjdCode + legalDongCode)", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [
        buildNormalPair({
          hjdCode: "9999999999",
          legalDongCode: "8888888888",
        }),
      ],
      hjdCodeSet,
      legalDongCodeSet,
    });
    expect(result.issues.length).toBe(2);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "crossRef:hjdCode",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
  });

  it("hjdCodeSet undefined → info issue 1건, hjdCode 검증 skip, legalDongCode 검증은 수행", () => {
    const { legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [
        // legalDongCode 부재로 warning 1건 발생 (legalDongCode 검증은 수행됨을 입증)
        buildNormalPair({ legalDongCode: "9999999999" }),
      ],
      hjdCodeSet: undefined,
      legalDongCodeSet,
    });
    // info issue 1건 (skip 안내) + warning issue 1건 (legalDongCode 부재)
    expect(
      result.issues.some(
        (i) => i.severity === "info" && i.field === "crossRef:hjdCode",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
    // hjdCode 검증은 skip — warning crossRef:hjdCode 0건
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "crossRef:hjdCode",
      ),
    ).toBe(false);
  });

  it("legalDongCodeSet undefined → info issue 1건, legalDongCode 검증 skip, hjdCode 검증은 수행", () => {
    const { hjdCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [
        // hjdCode 부재로 warning 1건 발생 (hjdCode 검증은 수행됨을 입증)
        buildNormalPair({ hjdCode: "9999999999" }),
      ],
      hjdCodeSet,
      legalDongCodeSet: undefined,
    });
    expect(
      result.issues.some(
        (i) => i.severity === "info" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "crossRef:hjdCode",
      ),
    ).toBe(true);
    expect(
      result.issues.some(
        (i) => i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(false);
  });

  it("양쪽 Set undefined → info issue 2건, warning issue 0건", () => {
    const result = validateCrossRefKikmix({
      mappingRecords: [
        buildNormalPair({
          hjdCode: "9999999999",
          legalDongCode: "8888888888",
        }),
      ],
      hjdCodeSet: undefined,
      legalDongCodeSet: undefined,
    });
    const infoIssues = result.issues.filter((i) => i.severity === "info");
    const warningIssues = result.issues.filter((i) => i.severity === "warning");
    expect(infoIssues.length).toBe(2);
    expect(warningIssues.length).toBe(0);
    expect(
      infoIssues.some((i) => i.field === "crossRef:hjdCode"),
    ).toBe(true);
    expect(
      infoIssues.some((i) => i.field === "crossRef:legalDongCode"),
    ).toBe(true);
  });

  it("mapping records 다수 (3건) — 일부만 참조 실패 → 실패한 record에만 issue", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const result = validateCrossRefKikmix({
      mappingRecords: [
        // 1) 정상 (양쪽 Set에 존재)
        buildNormalPair({
          hjdCode: "1111051500",
          legalDongCode: "1111010100",
        }),
        // 2) hjdCode 부재
        buildNormalPair({
          hjdCode: "9999999999",
          legalDongCode: "1111010200",
        }),
        // 3) legalDongCode 부재
        buildNormalPair({
          hjdCode: "1111053000",
          legalDongCode: "8888888888",
        }),
      ],
      hjdCodeSet,
      legalDongCodeSet,
    });
    // 정확히 2 issue (record 2의 hjdCode + record 3의 legalDongCode)
    expect(result.issues.length).toBe(2);
    expect(
      result.issues.filter(
        (i) => i.severity === "warning" && i.field === "crossRef:hjdCode",
      ).length,
    ).toBe(1);
    expect(
      result.issues.filter(
        (i) => i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ).length,
    ).toBe(1);
  });

  it("records 보존 (pure function) — 입력 array 변형 없음 + 반환값에 records 필드 없음", () => {
    const { hjdCodeSet, legalDongCodeSet } = buildBothSets();
    const input: MappingPair[] = [
      buildNormalPair({ hjdCode: "9999999999" }), // 의도적 issue 발생
      buildNormalPair(),
    ];
    const inputSnapshot = JSON.stringify(input);
    const result = validateCrossRefKikmix({
      mappingRecords: input,
      hjdCodeSet,
      legalDongCodeSet,
    });
    // 1) 입력 array 무변형
    expect(input.length).toBe(2);
    expect(JSON.stringify(input)).toBe(inputSnapshot);
    // 2) 반환값에 records 필드 없음 (issues만 반환)
    expect(Object.keys(result).sort()).toEqual(["issues"]);
  });
});

// ─── 11-2 1차-19 신규 — 시군구 단위 legalDongCode fallback (adminCodeSet) ──
//
// 1차-18 Step H에서 발견된 50 warning issues 중 30 unique 부재 코드가 모두
// `?????00000` 시군구 단위 법정동 코드였다. KIKcd_B의 ingestKikcdB 분류 정책상
// 시군구 행은 adminRecords로만 산출되고 legalDongRecords에서 제외되므로
// cross-ref가 부재로 잡힘. 1차-19는 adminCodeSet (시군구 5자리) 기반 fallback을 도입:
//
//   - mapping.legalDongCode가 legalDongCodeSet에 없을 때만 fallback 검토
//   - 조건:
//     * legalDongCode.endsWith("00000") (시군구 자리)
//     * !legalDongCode.endsWith("00000000") (시도 단위는 제외)
//     * adminCodeSet?.has(legalDongCode.slice(0, 5))
//   - 위 조건 만족 시 정상 매핑으로 간주 → issue 미발행 (silent)
//   - 위 조건 미만족 시 기존 1차-18 정책대로 warning issue 발행
//
// 기존 1차-18 케이스 10건은 `adminCodeSet` 인자를 미주입(또는 undefined)으로 동작 그대로 유지 (backward compat).
describe("validateCrossRefKikmix (11-2 1차-19 adminCodeSet fallback)", () => {
  it("시군구 단위 legalDongCode + adminCodeSet에 prefix 존재 → fallback 정상, issue 0건", () => {
    // 안양시 동안구(41173) ↔ 시군구 단위 법정동(2771000000 대구 어느 구) 매핑 시뮬레이션
    const result = validateCrossRefKikmix({
      mappingRecords: [
        { hjdCode: "1111051500", legalDongCode: "2771000000" },
      ],
      hjdCodeSet: new Set(["1111051500"]),
      legalDongCodeSet: new Set(["1111010100"]), // legalDongCode "2771000000" 부재
      adminCodeSet: new Set(["27710"]), // prefix 27710 존재 → fallback 정상
    });
    expect(result.issues).toEqual([]); // silent — issue 0건
  });

  it("시군구 단위 legalDongCode + adminCodeSet에 prefix 부재 → warning 유지", () => {
    const result = validateCrossRefKikmix({
      mappingRecords: [
        { hjdCode: "1111051500", legalDongCode: "9999900000" },
      ],
      hjdCodeSet: new Set(["1111051500"]),
      legalDongCodeSet: new Set(["1111010100"]), // 부재
      adminCodeSet: new Set(["27710", "28710"]), // prefix 99999 부재 → fallback 실패
    });
    expect(
      result.issues.some(
        (i) =>
          i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
  });

  it("시군구 단위 legalDongCode + adminCodeSet undefined → warning 유지 (1차-18 backward compat)", () => {
    const result = validateCrossRefKikmix({
      mappingRecords: [
        { hjdCode: "1111051500", legalDongCode: "2771000000" },
      ],
      hjdCodeSet: new Set(["1111051500"]),
      legalDongCodeSet: new Set(["1111010100"]),
      adminCodeSet: undefined, // fallback skip
    });
    // adminCodeSet undefined일 때는 fallback 미적용 → 기존 1차-18 정책대로 warning
    expect(
      result.issues.some(
        (i) =>
          i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
  });

  it("일반 법정동 legalDongCode (endsWith != '00000') + legalDongCodeSet 부재 → warning 유지, fallback 미적용", () => {
    // endsWith 조건 안 맞으므로 adminCodeSet에 prefix가 있어도 fallback 안 함
    const result = validateCrossRefKikmix({
      mappingRecords: [
        { hjdCode: "1111051500", legalDongCode: "9999999999" }, // 끝자리 != "00000"
      ],
      hjdCodeSet: new Set(["1111051500"]),
      legalDongCodeSet: new Set(["1111010100"]),
      adminCodeSet: new Set(["99999"]), // prefix 99999 있지만 endsWith 조건 안 맞음
    });
    expect(
      result.issues.some(
        (i) =>
          i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
  });

  it("시도 단위 legalDongCode (endsWith '00000000') + adminCodeSet 존재해도 fallback 제외 → warning 유지", () => {
    // "1100000000"은 시도 단위 (시군구·읍면동 자리 모두 0). adminCodeSet에 "11000"이 있어도
    // 시도 단위는 fallback 제외 정책. legalDongCodeSet에 없으면 warning 유지.
    const result = validateCrossRefKikmix({
      mappingRecords: [
        { hjdCode: "1111051500", legalDongCode: "1100000000" }, // 시도 단위
      ],
      hjdCodeSet: new Set(["1111051500"]),
      legalDongCodeSet: new Set(["1111010100"]),
      adminCodeSet: new Set(["11000", "11110"]), // prefix 11000 있어도 시도 단위는 fallback 안 함
    });
    expect(
      result.issues.some(
        (i) =>
          i.severity === "warning" && i.field === "crossRef:legalDongCode",
      ),
    ).toBe(true);
  });
});
