/**
 * 11-3 1차-125 — NEIS clean records의 address에서 sigunguName을 파생하는
 * pure helper 테스트.
 *
 * 정책:
 * - sigunguName이 이미 비어 있을 때만 address tokens[1]로 보강 (idempotent)
 * - sigunguCode / regionCode / schoolCount 등 새 필드 절대 생성 금지
 * - 입력 배열·record mutate 금지
 * - fs / process.env / fetch 접근 0건
 * - PII 필드 0건
 *
 * 1차-124+ 계획 후속 단계 (CLAUDE.md §17.6 / §17.43). `normalizeAddress`
 * 재사용 정책 — `src/lib/etl/normalize.ts:382-416`.
 */
import { describe, expect, it } from "vitest";

import { deriveSchoolSigunguFromAddress } from "../clean/deriveSchoolSigungu";
import type { CleanedSchoolForMaster } from "../master/buildSchoolMasterReal";

function baseSchool(
  overrides: Partial<CleanedSchoolForMaster> = {},
): CleanedSchoolForMaster {
  return {
    schoolId: "school:neis:7000001",
    neisSchoolCode: "7000001",
    schoolName: "시연용 학교",
    schoolLevel: "elementary",
    schoolType: null,
    establishmentType: null,
    address: null,
    sidoName: null,
    sigunguName: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

describe("deriveSchoolSigunguFromAddress (11-3 1차-125)", () => {
  it("address가 '서울특별시 강남구 …' 형태이면 sigunguName이 '강남구'로 파생된다", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:7000001",
        sidoName: "서울특별시",
        address: "서울특별시 강남구 시연로 1",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].sigunguName).toBe("강남구");
  });

  it("address가 '부산광역시 해운대구 …' 형태이면 sigunguName이 '해운대구'로 파생된다", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:7000002",
        sidoName: "부산광역시",
        address: "부산광역시 해운대구 시연대로 2",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    expect(result.records[0].sigunguName).toBe("해운대구");
  });

  it("기존 sigunguName이 이미 있으면 덮어쓰지 않는다 (idempotent)", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:7000003",
        sidoName: "경기도",
        sigunguName: "수원시 영통구",
        address: "경기도 수원시 권선구 시연로 3",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    expect(result.records[0].sigunguName).toBe("수원시 영통구");
  });

  it("address가 비어 있으면 sigunguName을 임시 생성하지 않는다", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:7000004",
        sidoName: "서울특별시",
        address: null,
      }),
      baseSchool({
        schoolId: "school:neis:7000005",
        sidoName: "서울특별시",
        address: "",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    expect(result.records[0].sigunguName).toBeNull();
    expect(result.records[1].sigunguName).toBeNull();
  });

  it("address가 한 토큰만 있으면 sigunguName을 임시 생성하지 않는다", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:7000006",
        sidoName: "서울특별시",
        address: "서울특별시",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    expect(result.records[0].sigunguName).toBeNull();
  });

  it("sigunguCode / regionCode / schoolCount 같은 필드를 새로 만들지 않는다", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:7000007",
        sidoName: "전라남도",
        address: "전라남도 목포시 시연로 7",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    const keys = Object.keys(result.records[0]).sort();
    // 1차-75 11-slot whitelist와 동일해야 한다 (필드 추가 0건).
    expect(keys).toEqual([
      "address",
      "establishmentType",
      "latitude",
      "longitude",
      "neisSchoolCode",
      "schoolId",
      "schoolLevel",
      "schoolName",
      "schoolType",
      "sidoName",
      "sigunguName",
    ]);
    // sigunguCode / regionCode / schoolCount는 명시적으로 부재해야 한다.
    const rec = result.records[0] as Record<string, unknown>;
    expect(rec.sigunguCode).toBeUndefined();
    expect(rec.regionCode).toBeUndefined();
    expect(rec.schoolCount).toBeUndefined();
  });

  it("입력 배열을 mutate하지 않는다 (pure function)", () => {
    const original: CleanedSchoolForMaster[] = [
      baseSchool({
        schoolId: "school:neis:7000008",
        sidoName: "강원특별자치도",
        address: "강원특별자치도 춘천시 시연로 8",
      }),
    ];
    const snapshot = JSON.parse(JSON.stringify(original));
    deriveSchoolSigunguFromAddress(original);
    expect(JSON.parse(JSON.stringify(original))).toEqual(snapshot);
  });

  it("summary count가 derived / unchanged / unresolved 구분을 정확히 표시한다", () => {
    const input = [
      // derived: address 보유 + sigunguName 부재 + tokens[1] 추출 성공
      baseSchool({
        schoolId: "school:neis:a",
        sidoName: "서울특별시",
        address: "서울특별시 강남구 시연로 1",
      }),
      // unchanged: sigunguName 이미 보유 → 덮어쓰지 않음
      baseSchool({
        schoolId: "school:neis:b",
        sidoName: "부산광역시",
        sigunguName: "사상구",
        address: "부산광역시 사상구 시연로 2",
      }),
      // unresolved: address null
      baseSchool({
        schoolId: "school:neis:c",
        sidoName: "서울특별시",
        address: null,
      }),
      // unresolved: address 한 토큰만
      baseSchool({
        schoolId: "school:neis:d",
        sidoName: "서울특별시",
        address: "서울특별시",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    expect(result.summary).toEqual({
      total: 4,
      derivedCount: 1,
      unchangedCount: 1,
      unresolvedCount: 2,
    });
  });

  it("PII 필드를 새로 만들지 않는다 (학생명·생년월일 등 슬롯 추가 0건)", () => {
    const input = [
      baseSchool({
        schoolId: "school:neis:e",
        sidoName: "충청북도",
        address: "충청북도 청주시 상당구 시연로 9",
      }),
    ];
    const result = deriveSchoolSigunguFromAddress(input);
    const piiPatterns = [
      "studentName",
      "studentId",
      "birthday",
      "phone",
      "email",
      "disabilityType",
      "disabilityGrade",
      "parentName",
      "guardianName",
    ];
    for (const rec of result.records) {
      const keys = Object.keys(rec);
      const hits = keys.filter((k) =>
        piiPatterns.some((p) => k.toLowerCase().includes(p.toLowerCase())),
      );
      expect(hits).toEqual([]);
    }
  });
});
