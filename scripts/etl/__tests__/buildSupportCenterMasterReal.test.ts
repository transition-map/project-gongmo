/**
 * buildSupportCenterMasterReal.test.ts — 11-3 1차-34 B-4 specialSupportCenter master.real.
 *
 * 정책 (사용자 합의값 §1-7):
 * - master 단계 책임 (CLAUDE.md §4 단방향 5단계 원칙).
 * - 기존 `cleanSupportCenter` pure function 재사용 (caller 수준).
 * - 본 wrapper는 CleanedSupportCenterRecord[] + adminCodes를 받아 master record 산출.
 * - institutionName 누락 / regionCode 누락·invalid / admin set 외 regionCode → 제외 + warning.
 * - MasterSupportCenterRecord schema 무변경.
 * - fixture `B_special_support_center_sample.json` 3 records (KOSTAT 11680/26350/41117 pre-baked)
 *   기반 mini fixture 시나리오.
 */

import { describe, expect, it } from "vitest";
import { buildSupportCenterMasterReal } from "../master/buildSupportCenterMasterReal";
import type { CleanedSupportCenterRecord } from "../clean/cleanSupportCenter";
import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";

const SAMPLE_ADMIN_CODES: CleanedRegionCodeRecord[] = [
  {
    regionCode: "11680",
    regionCodeType: "sigungu",
    sidoCode: "11",
    sigunguCode: "11680",
    sidoName: "서울특별시",
    sigunguName: "강남구",
  },
  {
    regionCode: "26350",
    regionCodeType: "sigungu",
    sidoCode: "26",
    sigunguCode: "26350",
    sidoName: "부산광역시",
    sigunguName: "해운대구",
  },
  {
    regionCode: "41117",
    regionCodeType: "sigungu",
    sidoCode: "41",
    sigunguCode: "41117",
    sidoName: "경기도",
    sigunguName: "수원시 영통구",
  },
];

function cleanedRecord(
  overrides: Partial<CleanedSupportCenterRecord> = {},
): CleanedSupportCenterRecord {
  return {
    institutionId: "inst:supportCenter:demo-support:sc-001",
    institutionType: "supportCenter",
    institutionName: "강남특수교육지원센터 (시연용)",
    regionCode: "11680",
    regionCodeType: "sigungu",
    address: "서울시 강남구 시연용로 100",
    ...overrides,
  };
}

describe("buildSupportCenterMasterReal — 매핑·필터 (11-3 1차-34)", () => {
  it("CleanedSupportCenterRecord → MasterSupportCenterRecord 변환 (필드 보존)", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [cleanedRecord()],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(1);
    expect(result.records[0]).toMatchObject({
      institutionId: "inst:supportCenter:demo-support:sc-001",
      institutionType: "supportCenter",
      institutionName: "강남특수교육지원센터 (시연용)",
      regionCode: "11680",
      regionCodeType: "sigungu",
      address: "서울시 강남구 시연용로 100",
    });
    expect(result.issues).toEqual([]);
  });

  it("regionCode가 admin_codes set에 있으면 master records 포함", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [
        cleanedRecord({ institutionId: "inst:a", regionCode: "11680" }),
        cleanedRecord({ institutionId: "inst:b", regionCode: "26350" }),
        cleanedRecord({ institutionId: "inst:c", regionCode: "41117" }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(3);
    expect(result.records.map((r) => r.regionCode).sort()).toEqual([
      "11680",
      "26350",
      "41117",
    ]);
  });

  it("regionCode가 admin_codes set에 없으면 record 제외 + warning issue (field: \"regionCode\")", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [
        cleanedRecord({ institutionId: "inst:missing", regionCode: "99999" }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0]).toMatchObject({
      severity: "warning",
      datasetCategory: "B",
      field: "regionCode",
    });
    expect(result.issues[0].message).toContain("99999");
  });
});

describe("buildSupportCenterMasterReal — 누락 / invalid 처리 (11-3 1차-34)", () => {
  it("institutionName 빈 문자열 → 제외 + warning (field: \"institutionName\")", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [cleanedRecord({ institutionName: "" })],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0]).toMatchObject({
      severity: "warning",
      datasetCategory: "B",
      field: "institutionName",
    });
  });

  it("institutionName whitespace-only → 제외 + warning", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [cleanedRecord({ institutionName: "   " })],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("institutionName");
  });

  it("일부 valid + 일부 invalid 혼합 — valid record만 master에 포함, invalid는 issue", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [
        cleanedRecord({ institutionId: "ok-1", regionCode: "11680" }),
        cleanedRecord({ institutionId: "fail-1", regionCode: "99999" }),
        cleanedRecord({
          institutionId: "fail-2",
          institutionName: "",
          regionCode: "26350",
        }),
        cleanedRecord({ institutionId: "ok-2", regionCode: "41117" }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(2);
    expect(result.records.map((r) => r.institutionId).sort()).toEqual([
      "ok-1",
      "ok-2",
    ]);
    expect(result.issues.length).toBe(2);
  });
});

describe("buildSupportCenterMasterReal — edge cases (11-3 1차-34)", () => {
  it("빈 cleanedRecords → records=[], issues=[]", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("빈 adminCodes → 모든 record가 regionCode 불일치로 제외", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [cleanedRecord()],
      adminCodes: [],
    });
    expect(result.records.length).toBe(0);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].field).toBe("regionCode");
  });

  it("입력 cleanedRecords 배열을 변형하지 않는다 (pure)", () => {
    const input = [cleanedRecord()];
    const snapshot = JSON.parse(JSON.stringify(input));
    buildSupportCenterMasterReal({
      cleanedRecords: input,
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(input).toEqual(snapshot);
  });
});

describe("buildSupportCenterMasterReal — mini fixture 시나리오 (11-3 1차-34)", () => {
  // data/fixtures/B_special_support_center_sample.json은 3 records 보유
  // (KOSTAT regionCode 11680/26350/41117 pre-baked).
  // 1차-34에서 cleanSupportCenter를 거친 후 buildSupportCenterMasterReal로 통과되는 시나리오.
  it("fixture 시나리오 — 3 records 모두 admin set 매칭 → records=3 / issues=0", () => {
    const result = buildSupportCenterMasterReal({
      cleanedRecords: [
        cleanedRecord({
          institutionId: "inst:supportCenter:demo-support:sc-001",
          institutionName: "강남특수교육지원센터 (시연용)",
          regionCode: "11680",
        }),
        cleanedRecord({
          institutionId: "inst:supportCenter:demo-support:sc-002",
          institutionName: "해운대특수교육지원센터 (시연용)",
          regionCode: "26350",
        }),
        cleanedRecord({
          institutionId: "inst:supportCenter:demo-support:sc-003",
          institutionName: "수원영통특수교육지원센터 (시연용)",
          regionCode: "41117",
        }),
      ],
      adminCodes: SAMPLE_ADMIN_CODES,
    });
    expect(result.records.length).toBe(3);
    expect(result.issues).toEqual([]);
  });
});
