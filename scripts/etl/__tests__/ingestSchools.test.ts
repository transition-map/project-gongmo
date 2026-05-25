/**
 * ingestSchools.test.ts — 11-3 1차-1 B 학교 기본 정보 ingest RED 테스트.
 *
 * 본 RED 단계 정책:
 * - production module(`scripts/etl/ingest/ingestSchools.ts`)은 아직 생성하지 않는다.
 * - 본 테스트는 missing-module로 fail해야 한다.
 * - 실 학교알리미/NEIS export 파일은 참조 0건 (외부 다운로드 0건).
 * - 1차-1은 format "json"만 지원 (CSV/XLSX/fixed-width는 1차-6+).
 *
 * 정책 합의값 (11-3 1차-1):
 * - mini fixture record는 3건, schoolLevel: elementary/middle/special 각 1건씩.
 * - JSON mini fixture는 camelCase 필드.
 * - PII 필드(phone/email/principalName 등)는 IngestedSchoolRecord에 포함되지 않음
 *   (타입 슬롯 없음 + raw 입력에 있어도 누락 매핑).
 * - 보존 필드: schoolId, neisSchoolCode, schoolName, schoolLevel, schoolType,
 *   establishmentType, address, sidoName, sigunguName, latitude, longitude.
 * - source label: "fixture:B-schools"; license: "demo-only"; sourcePolicyStatus:
 *   "pending-real-source-review".
 * - 좌표 부재 가능 (latitude/longitude null 허용).
 * - 학교 이름은 명백한 가공명만 사용 (서울시연초등학교 A 등).
 */

import { describe, expect, it } from "vitest";
import { ingestSchools } from "../ingest/ingestSchools";

const COLLECTED_AT = "2026-05-16T00:00:00+09:00";

function buildMiniFixtureJson(): string {
  return JSON.stringify([
    {
      schoolId: "school:demo:seoul-elem-a",
      neisSchoolCode: "B000000001",
      schoolName: "서울시연초등학교 A",
      schoolLevel: "elementary",
      schoolType: "general",
      establishmentType: "public",
      address: "서울특별시 시연구 시연동 123",
      sidoName: "서울특별시",
      sigunguName: "시연구",
      latitude: 37.5665,
      longitude: 126.978,
    },
    {
      schoolId: "school:demo:busan-mid-b",
      neisSchoolCode: "B000000002",
      schoolName: "부산시연중학교 B",
      schoolLevel: "middle",
      schoolType: "general",
      establishmentType: "public",
      address: "부산광역시 시연구 시연동 456",
      sidoName: "부산광역시",
      sigunguName: "시연구",
      latitude: 35.1796,
      longitude: 129.0756,
    },
    {
      schoolId: "school:demo:daejeon-special-c",
      neisSchoolCode: "B000000003",
      schoolName: "대전시연특수학교 C",
      schoolLevel: "special",
      schoolType: "special",
      establishmentType: "public",
      address: "대전광역시 시연구 시연동 789",
      sidoName: "대전광역시",
      sigunguName: "시연구",
      latitude: null,
      longitude: null,
    },
  ]);
}

describe("ingestSchools (11-3 1차-1)", () => {
  it("ingestSchools - JSON 입력 빈 배열은 schoolRecords 0건 + issues 0건 + meta.schoolRecordCount=0 반환", () => {
    const result = ingestSchools({
      text: "[]",
      source: "fixture:B-schools",
      format: "json",
      collectedAt: COLLECTED_AT,
    });
    expect(result.schoolRecords).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.meta.schoolRecordCount).toBe(0);
    expect(result.meta.issueCount).toBe(0);
    expect(result.meta.source).toBe("fixture:B-schools");
    expect(result.meta.license).toBe("demo-only");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
    expect(result.meta.collectedAt).toBe(COLLECTED_AT);
  });

  it("ingestSchools - mini fixture 3건 JSON은 schoolRecords 3건으로 매핑되고 schoolId·schoolName이 보존됨", () => {
    const result = ingestSchools({
      text: buildMiniFixtureJson(),
      source: "fixture:B-schools",
      format: "json",
      collectedAt: COLLECTED_AT,
    });
    expect(result.schoolRecords.length).toBe(3);
    expect(result.meta.schoolRecordCount).toBe(3);

    // schoolId / schoolName 보존
    expect(result.schoolRecords[0].schoolId).toBe("school:demo:seoul-elem-a");
    expect(result.schoolRecords[0].schoolName).toBe("서울시연초등학교 A");
    expect(result.schoolRecords[1].schoolId).toBe("school:demo:busan-mid-b");
    expect(result.schoolRecords[1].schoolName).toBe("부산시연중학교 B");
    expect(result.schoolRecords[2].schoolId).toBe("school:demo:daejeon-special-c");
    expect(result.schoolRecords[2].schoolName).toBe("대전시연특수학교 C");

    // schoolLevel 보존 (elementary/middle/special 각 1건)
    expect(result.schoolRecords[0].schoolLevel).toBe("elementary");
    expect(result.schoolRecords[1].schoolLevel).toBe("middle");
    expect(result.schoolRecords[2].schoolLevel).toBe("special");

    // 좌표 부재 케이스 (3번째 record)
    expect(result.schoolRecords[2].latitude).toBeNull();
    expect(result.schoolRecords[2].longitude).toBeNull();

    // 좌표 보유 케이스 (1번째 record)
    expect(result.schoolRecords[0].latitude).toBe(37.5665);
    expect(result.schoolRecords[0].longitude).toBe(126.978);
  });

  it("ingestSchools - PII 필드(phone/email/principalName)가 raw에 있어도 IngestedSchoolRecord에 포함되지 않음", () => {
    // raw에 PII 컬럼이 섞여 있어도 IngestedSchoolRecord shape에는 슬롯이 없으므로
    // 자동 누락되어야 한다. PII drop은 ingest 단계의 핵심 책임.
    const rawWithPii = JSON.stringify([
      {
        schoolId: "school:demo:seoul-elem-a",
        schoolName: "서울시연초등학교 A",
        schoolLevel: "elementary",
        schoolType: "general",
        establishmentType: "public",
        address: "서울특별시 시연구 시연동 123",
        sidoName: "서울특별시",
        sigunguName: "시연구",
        latitude: 37.5665,
        longitude: 126.978,
        // ↓ PII / 불필요 필드 — 모두 누락되어야 함
        phone: "02-000-0000",
        email: "principal@example.com",
        principalName: "홍길동",
        faxNumber: "02-000-0001",
        homepageUrl: "https://example.com",
        adminStaffName: "김철수",
      },
    ]);
    const result = ingestSchools({
      text: rawWithPii,
      source: "fixture:B-schools",
      format: "json",
      collectedAt: COLLECTED_AT,
    });
    expect(result.schoolRecords.length).toBe(1);
    const record = result.schoolRecords[0] as unknown as Record<string, unknown>;
    expect(record.phone).toBeUndefined();
    expect(record.email).toBeUndefined();
    expect(record.principalName).toBeUndefined();
    expect(record.faxNumber).toBeUndefined();
    expect(record.homepageUrl).toBeUndefined();
    expect(record.adminStaffName).toBeUndefined();
    // 정상 필드는 보존
    expect(record.schoolId).toBe("school:demo:seoul-elem-a");
    expect(record.schoolName).toBe("서울시연초등학교 A");
  });

  it("ingestSchools - format !== \"json\"은 한국어 에러 메시지로 throw", () => {
    // 1차-1은 JSON 포맷만 지원. CSV/XLSX는 1차-6+.
    expect(() =>
      ingestSchools({
        text: "schoolId,schoolName\nA,B",
        source: "fixture:B-schools",
        format: "csv" as never,
        collectedAt: COLLECTED_AT,
      }),
    ).toThrow(/지원하지 않/);
  });

  // ─── 11-3 1차-2 신규 — source 기반 license 분기 정책 ───────────────────────
  // 정책 (사용자 합의값 §1-3):
  //   - source가 "fixture:B-schools"이면 license = "demo-only"
  //   - source가 "real:schools-json"이면 license = "unknown"
  //   - 공공누리 유형 등 실제 라이선스는 자동 가정 X (CLAUDE.md §16.6 일관)
  //   - sourcePolicyStatus는 양쪽 모두 "pending-real-source-review" 유지
  //     (사용자 실제 라이선스 확인 전까지 미확정)
  it("ingestSchools - source가 \"fixture:B-schools\"이면 meta.license === \"demo-only\"", () => {
    const result = ingestSchools({
      text: "[]",
      source: "fixture:B-schools",
      format: "json",
      collectedAt: COLLECTED_AT,
    });
    expect(result.meta.source).toBe("fixture:B-schools");
    expect(result.meta.license).toBe("demo-only");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
  });

  it("ingestSchools - source가 \"real:schools-json\"이면 meta.license === \"unknown\"", () => {
    const result = ingestSchools({
      text: "[]",
      source: "real:schools-json",
      format: "json",
      collectedAt: COLLECTED_AT,
    });
    expect(result.meta.source).toBe("real:schools-json");
    expect(result.meta.license).toBe("unknown");
    expect(result.meta.sourcePolicyStatus).toBe("pending-real-source-review");
  });
});
