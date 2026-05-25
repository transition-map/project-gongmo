/**
 * 11-3 1차-137 — regionHierarchy helper 검증 (TDD RED → GREEN).
 *
 * 1차-136 fixture(`data/fixtures/region_hierarchy_subset.json`, 27 verified
 * subset entries) + 1차-137 helper(`src/data/regionHierarchy.ts`)의 3단계
 * cascading lookup + 일반구 분리 정규식 + 세종 직접 노출 + entry exact lookup +
 * `_meta` 정책 검증 + mixed group 회귀 + fake numeric 0건 회귀.
 *
 * **정책 (1차-89 / 1차-67 / 1차-135 동형)**:
 * - AI 정책 문구 생성 금지 — `_meta.policy.aiGeneratedAllowed: false` 강제.
 * - 사람 검수 결과만 등록 (`_meta.policy.humanReviewRequired: true`).
 * - 세종 시군구 단위 부재 정직 처리 (`sigunguCode` / `sigunguName` null).
 * - 일반구 entries는 `thirdLevelType="adminGu"`, `isIlbangu` 판정.
 * - 1차-136 fixture는 강남구(11680)만 mart.real `schoolCount > 0` 매칭.
 * - **fake numeric 필드 금지** — schoolCount / currentGapIndex / trendRiskScore /
 *   yearlySupport / supportChange / specialSchoolCount / supportCenterCount 슬롯
 *   부재 (회귀 테스트로 강제).
 * - **mixed group 금지** — 한 sigunguCode 안에 adminGu + legalDong 혼재 0건.
 */

import { describe, expect, test } from "vitest";
import {
  getSidoList,
  getSigunguBySido,
  getThirdLevelBySigungu,
  getThirdLevelForSidoWithoutSigungu,
  getEntryByThirdLevelCode,
  parseIlbangu,
  regionHierarchyMeta,
  regionHierarchyRecords,
} from "../regionHierarchy";

describe("regionHierarchy — _meta 정책 회귀 (1차-67 / 1차-89 동형)", () => {
  test("_meta.policy.aiGeneratedAllowed === false", () => {
    expect(regionHierarchyMeta?.policy.aiGeneratedAllowed).toBe(false);
  });

  test("_meta.policy.humanReviewRequired === true", () => {
    expect(regionHierarchyMeta?.policy.humanReviewRequired).toBe(true);
  });

  test("_meta.curator 비식별 가공명 보유 (PII 회피)", () => {
    expect(regionHierarchyMeta?.curator).toBeDefined();
    expect(typeof regionHierarchyMeta?.curator).toBe("string");
  });
});

describe("regionHierarchy — records 기본 contract", () => {
  test("regionHierarchyRecords.length === 27 (1차-136 verified subset)", () => {
    expect(regionHierarchyRecords.length).toBe(27);
  });

  test("모든 record aiGenerated === false (AI 생성 0건 회귀)", () => {
    const allFalse = regionHierarchyRecords.every(
      (r) => r.aiGenerated === false,
    );
    expect(allFalse).toBe(true);
  });

  test("fake numeric field 0건 회귀 (schoolCount / currentGapIndex / trendRiskScore / yearlySupport / supportChange / specialSchoolCount / supportCenterCount)", () => {
    const forbidden = [
      "schoolCount",
      "currentGapIndex",
      "trendRiskScore",
      "yearlySupport",
      "supportChange",
      "specialSchoolCount",
      "supportCenterCount",
    ];
    const violators = regionHierarchyRecords.filter((r) =>
      forbidden.some((k) => k in (r as unknown as Record<string, unknown>)),
    );
    expect(violators).toEqual([]);
  });

  test("thirdLevelType union strict (allowed: legalDong / adminDong / adminGu / none)", () => {
    const allowed = new Set(["legalDong", "adminDong", "adminGu", "none"]);
    const invalid = regionHierarchyRecords.filter(
      (r) => !allowed.has(r.thirdLevelType),
    );
    expect(invalid).toEqual([]);
  });

  test("readinessStatus union strict (allowed: dataReady / partial / codeOnly / unavailable)", () => {
    const allowed = new Set([
      "dataReady",
      "partial",
      "codeOnly",
      "unavailable",
    ]);
    const invalid = regionHierarchyRecords.filter(
      (r) => !allowed.has(r.readinessStatus),
    );
    expect(invalid).toEqual([]);
  });

  test("martCoverage union strict (allowed: schoolCount > 0 / 분석지표 미연결 / 행정구역 코드만 확인)", () => {
    const allowed = new Set([
      "schoolCount > 0",
      "분석지표 미연결",
      "행정구역 코드만 확인",
    ]);
    const invalid = regionHierarchyRecords.filter(
      (r) => !allowed.has(r.martCoverage),
    );
    expect(invalid).toEqual([]);
  });

  test("mixed group 회귀 — 한 sigunguCode 안에 adminGu + legalDong 혼재 0건", () => {
    const bySigungu = new Map<string | null, Set<string>>();
    for (const r of regionHierarchyRecords) {
      if (!bySigungu.has(r.sigunguCode)) {
        bySigungu.set(r.sigunguCode, new Set());
      }
      bySigungu.get(r.sigunguCode)!.add(r.thirdLevelType);
    }
    const mixed = [...bySigungu.entries()].filter(
      ([, types]) => types.has("adminGu") && types.has("legalDong"),
    );
    expect(mixed).toEqual([]);
  });
});

describe("regionHierarchy — 1단계 시도 cascade", () => {
  test("getSidoList 7 시도 반환 (1차-136 subset 일치)", () => {
    const sidos = getSidoList();
    expect(sidos.length).toBe(7);
  });

  test("getSidoList에 11/26/36/41/43/46/51 모두 포함", () => {
    const codes = getSidoList().map((s) => s.code);
    expect(codes).toContain("11");
    expect(codes).toContain("26");
    expect(codes).toContain("36");
    expect(codes).toContain("41");
    expect(codes).toContain("43");
    expect(codes).toContain("46");
    expect(codes).toContain("51");
  });
});

describe("regionHierarchy — 2단계 시군구 cascade", () => {
  test("getSigunguBySido(41)에 수원시 / 성남시 포함", () => {
    const names = getSigunguBySido("41").map((s) => s.name);
    expect(names).toContain("수원시");
    expect(names).toContain("성남시");
  });

  test("getSigunguBySido(43)에 청주시 포함", () => {
    const names = getSigunguBySido("43").map((s) => s.name);
    expect(names).toContain("청주시");
  });

  test("수원시 / 성남시 / 청주시 모두 isIlbangu === true", () => {
    const suwon = getSigunguBySido("41").find((s) => s.name === "수원시");
    const seongnam = getSigunguBySido("41").find(
      (s) => s.name === "성남시",
    );
    const cheongju = getSigunguBySido("43").find(
      (s) => s.name === "청주시",
    );
    expect(suwon?.isIlbangu).toBe(true);
    expect(seongnam?.isIlbangu).toBe(true);
    expect(cheongju?.isIlbangu).toBe(true);
  });

  test("강남구 / 해운대구 / 목포시 / 춘천시는 모두 isIlbangu === false", () => {
    const gangnam = getSigunguBySido("11").find((s) => s.name === "강남구");
    const haeundae = getSigunguBySido("26").find(
      (s) => s.name === "해운대구",
    );
    const mokpo = getSigunguBySido("46").find((s) => s.name === "목포시");
    const chuncheon = getSigunguBySido("51").find(
      (s) => s.name === "춘천시",
    );
    expect(gangnam?.isIlbangu).toBe(false);
    expect(haeundae?.isIlbangu).toBe(false);
    expect(mokpo?.isIlbangu).toBe(false);
    expect(chuncheon?.isIlbangu).toBe(false);
  });

  test("getSigunguBySido(36) 세종 예외 — sigunguCode null 안전 처리", () => {
    const sejong = getSigunguBySido("36");
    expect(sejong.length).toBeGreaterThanOrEqual(1);
    expect(sejong[0].code).toBeNull();
  });
});

describe("regionHierarchy — 3단계 EMD/일반구 cascade", () => {
  test("getThirdLevelBySigungu(41110) 수원시 일반구 4건 (장안/권선/팔달/영통)", () => {
    const sub = getThirdLevelBySigungu("41110");
    expect(sub.length).toBe(4);
    const names = sub.map((s) => s.name);
    expect(names).toContain("장안구");
    expect(names).toContain("권선구");
    expect(names).toContain("팔달구");
    expect(names).toContain("영통구");
  });

  test("getThirdLevelBySigungu(41130) 성남시 일반구 3건 (수정/중원/분당)", () => {
    const sub = getThirdLevelBySigungu("41130");
    expect(sub.length).toBe(3);
    const names = sub.map((s) => s.name);
    expect(names).toContain("수정구");
    expect(names).toContain("중원구");
    expect(names).toContain("분당구");
  });

  test("getThirdLevelBySigungu(43110) 청주시 일반구 4건 (상당/서원/흥덕/청원)", () => {
    const sub = getThirdLevelBySigungu("43110");
    expect(sub.length).toBe(4);
    const names = sub.map((s) => s.name);
    expect(names).toContain("상당구");
    expect(names).toContain("서원구");
    expect(names).toContain("흥덕구");
    expect(names).toContain("청원구");
  });

  test("getThirdLevelBySigungu(11680) 강남구 → 역삼동 첫 entry martCoverage === 'schoolCount > 0'", () => {
    const sub = getThirdLevelBySigungu("11680");
    expect(sub.length).toBe(3);
    expect(sub[0].name).toBe("역삼동");
    expect(sub[0].martCoverage).toBe("schoolCount > 0");
  });

  test("getThirdLevelForSidoWithoutSigungu(36) 세종 legalDong 4건 직접 노출 (반곡/소담/보람/대평)", () => {
    const sub = getThirdLevelForSidoWithoutSigungu("36");
    expect(sub.length).toBe(4);
    const names = sub.map((s) => s.name);
    expect(names).toContain("반곡동");
    expect(names).toContain("소담동");
    expect(names).toContain("보람동");
    expect(names).toContain("대평동");
  });
});

describe("regionHierarchy — getEntryByThirdLevelCode exact lookup", () => {
  test("getEntryByThirdLevelCode('1168010100') === 역삼동 entry", () => {
    const entry = getEntryByThirdLevelCode("1168010100");
    expect(entry).toBeDefined();
    expect(entry?.thirdLevelName).toBe("역삼동");
    expect(entry?.sigunguCode).toBe("11680");
    expect(entry?.sigunguName).toBe("강남구");
  });

  test("getEntryByThirdLevelCode(null) === undefined", () => {
    const entry = getEntryByThirdLevelCode(null);
    expect(entry).toBeUndefined();
  });

  test("getEntryByThirdLevelCode('999999') 미등록 코드 === undefined", () => {
    const entry = getEntryByThirdLevelCode("999999");
    expect(entry).toBeUndefined();
  });
});

describe("regionHierarchy — parseIlbangu 정규식", () => {
  test("parseIlbangu('수원시 영통구') → { parent: 수원시, gu: 영통구 }", () => {
    const result = parseIlbangu("수원시 영통구");
    expect(result.parent).toBe("수원시");
    expect(result.gu).toBe("영통구");
  });

  test("parseIlbangu('청주시 흥덕구') → { parent: 청주시, gu: 흥덕구 }", () => {
    const result = parseIlbangu("청주시 흥덕구");
    expect(result.parent).toBe("청주시");
    expect(result.gu).toBe("흥덕구");
  });

  test("parseIlbangu('강남구') → { parent: 강남구 } (gu undefined)", () => {
    const result = parseIlbangu("강남구");
    expect(result.parent).toBe("강남구");
    expect(result.gu).toBeUndefined();
  });
});
