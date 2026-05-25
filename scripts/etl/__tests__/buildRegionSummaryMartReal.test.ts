/**
 * buildRegionSummaryMartReal.test.ts — 11-3 1차-30 mart.real B region_summary.
 *
 * 정책 (사용자 합의값 §1-6):
 * - region summary는 mart 단계 책임 (CLAUDE.md §4 단방향 5단계 원칙).
 * - 기존 `buildRegionSummaryMart` pure builder 재사용.
 * - 입력: G admin_codes clean records + B school_master records.
 * - demand / supportCenter는 빈 배열 (A/B-4 도메인 미도입).
 * - 결과: regionCode + sidoCode/sigunguCode/sidoName/sigunguName + regionName(derived)
 *   + schoolCount + specialSchoolCount + specialClassCount (B/school_master group-by).
 *   supportCenterCount=0, specialEducationStudentCount/registeredDisabledCount undefined,
 *   trainingInstitutionCount/careerExperienceCenterCount/welfareFacilityCount/jobPostingCount=0
 *   (기존 builder 정책 그대로).
 * - mini fixture 한계: school_master records=0이면 schoolCount=0 다수가 정상.
 */

import { describe, expect, it } from "vitest";
import { buildRegionSummaryMartReal } from "../mart/buildRegionSummaryMartReal";
import type { CleanedRegionCodeRecord } from "../clean/cleanRegionCodes";
import type { MasterSchoolRecord } from "../master/types";

const SAMPLE_ADMIN_RECORDS: CleanedRegionCodeRecord[] = [
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
    regionCode: "30110",
    regionCodeType: "sigungu",
    sidoCode: "30",
    sigunguCode: "30110",
    sidoName: "대전광역시",
    sigunguName: "동구",
  },
];

const SAMPLE_SCHOOL_MASTER: MasterSchoolRecord[] = [
  {
    schoolId: "s-gangnam-1",
    schoolName: "강남일반학교 1",
    schoolType: "generalSchool",
    regionCode: "11680",
    regionCodeType: "sigungu",
  },
  {
    schoolId: "s-gangnam-special-1",
    schoolName: "강남특수학교 1",
    schoolType: "specialSchool",
    regionCode: "11680",
    regionCodeType: "sigungu",
  },
  {
    schoolId: "s-gangnam-special-class-1",
    schoolName: "강남특수학급 1",
    schoolType: "specialClassInGeneralSchool",
    regionCode: "11680",
    regionCodeType: "sigungu",
  },
  {
    schoolId: "s-haeundae-1",
    schoolName: "해운대일반학교 1",
    schoolType: "generalSchool",
    regionCode: "26350",
    regionCodeType: "sigungu",
  },
];

describe("buildRegionSummaryMartReal — 매핑·집계 (11-3 1차-30)", () => {
  it("admin_codes → regionMaster 변환 후 buildRegionSummaryMart 호출 — record 수 = admin_codes 수", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    expect(result.records.length).toBe(3);
  });

  it("결과 mart record가 regionCode / regionCodeType / sidoCode / sigunguCode 보유 (admin 그대로 전파)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam).toBeDefined();
    expect(gangnam?.regionCodeType).toBe("sigungu");
    expect(gangnam?.sidoCode).toBe("11");
    expect(gangnam?.sigunguCode).toBe("11680");
  });

  it("regionName이 sidoName + \" \" + sigunguName 합성으로 부여 (builder composeRegionName)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.regionName).toBe("서울특별시 강남구");
  });

  it("schoolCount는 schoolMaster regionCode 기준 group-by 결과", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    const haeundae = result.records.find((r) => r.regionCode === "26350");
    const daejeon = result.records.find((r) => r.regionCode === "30110");
    expect(gangnam?.schoolCount).toBe(3); // 일반 + 특수 + 특수학급
    expect(haeundae?.schoolCount).toBe(1); // 일반 1
    expect(daejeon?.schoolCount).toBe(0); // 없음
  });

  it("specialSchoolCount는 schoolType=\"specialSchool\" 카운트", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.specialSchoolCount).toBe(1);
  });

  it("specialClassCount는 schoolType=\"specialClassInGeneralSchool\" 카운트", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.specialClassCount).toBe(1);
  });

  it("supportCenterCount는 빈 supportCenterMaster 결과 0 (B-4 미도입 정책)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    for (const record of result.records) {
      expect(record.supportCenterCount).toBe(0);
    }
  });

  it("specialEducationStudentCount / registeredDisabledCount는 undefined (A 도메인 미도입 정책)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    for (const record of result.records) {
      expect(record.specialEducationStudentCount).toBeUndefined();
      expect(record.registeredDisabledCount).toBeUndefined();
    }
  });

  it("C/D/E 카운트(trainingInstitutionCount / careerExperienceCenterCount / welfareFacilityCount / jobPostingCount)는 0 (기존 builder 정책)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    for (const record of result.records) {
      expect(record.trainingInstitutionCount).toBe(0);
      expect(record.careerExperienceCenterCount).toBe(0);
      expect(record.welfareFacilityCount).toBe(0);
      expect(record.jobPostingCount).toBe(0);
    }
  });
});

describe("buildRegionSummaryMartReal — mini fixture 시나리오 (11-3 1차-30)", () => {
  // master.real B school은 mini fixture에서 sigunguName="시연구" 매칭 실패로
  // records=0일 수 있다. 이 시나리오에서도 mart.real이 정상 동작해 admin_codes
  // 기반 region records를 생성하되 schoolCount=0이 정상이다 (정책 §6).
  it("schoolMaster 빈 배열 → admin_codes 기반 region records 생성, 모든 region의 schoolCount=0", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
    });
    expect(result.records.length).toBe(3);
    for (const record of result.records) {
      expect(record.schoolCount).toBe(0);
      expect(record.specialSchoolCount).toBe(0);
      expect(record.specialClassCount).toBe(0);
    }
  });

  it("admin_codes 빈 배열 → mart records 빈 배열", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: [],
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    expect(result.records.length).toBe(0);
  });
});

describe("buildRegionSummaryMartReal — pure function 보장 (11-3 1차-30)", () => {
  it("입력 admin_codes 배열을 변형하지 않는다", () => {
    const input = SAMPLE_ADMIN_RECORDS.map((r) => ({ ...r }));
    const snapshot = JSON.parse(JSON.stringify(input));
    buildRegionSummaryMartReal({
      adminCodes: input,
      schoolMaster: SAMPLE_SCHOOL_MASTER,
    });
    expect(input).toEqual(snapshot);
  });

  it("입력 schoolMaster 배열을 변형하지 않는다", () => {
    const input = SAMPLE_SCHOOL_MASTER.map((s) => ({ ...s }));
    const snapshot = JSON.parse(JSON.stringify(input));
    buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: input,
    });
    expect(input).toEqual(snapshot);
  });
});

describe("buildRegionSummaryMartReal — schoolMaster regionCode가 admin set 외 (11-3 1차-30)", () => {
  it("schoolMaster의 regionCode가 admin set에 없으면 무시되고 issue 발생 안 함 (builder는 region base 1:1 처리)", () => {
    const orphanSchool: MasterSchoolRecord[] = [
      {
        schoolId: "s-orphan",
        schoolName: "고아 학교",
        schoolType: "generalSchool",
        regionCode: "99999", // admin set에 없는 code
        regionCodeType: "sigungu",
      },
    ];
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: orphanSchool,
    });
    // admin_codes 3건 그대로 — orphan school은 어느 region에도 집계되지 않음
    expect(result.records.length).toBe(3);
    for (const record of result.records) {
      expect(record.schoolCount).toBe(0);
    }
  });
});

// ─── 11-3 1차-34 신규 — supportCenter master input + supportCenterCount 보강 ──
//
// 정책 (사용자 합의값 §1-7):
// - buildRegionSummaryMartReal에 supportCenterMaster 입력 추가.
// - 기존 buildRegionSummaryMart는 그대로 — supportCenterMaster를 그대로 전달.
// - regionCode 기준 group-by로 supportCenterCount 산출.
// - supportCenterMaster 빈 배열 (또는 미지정) → supportCenterCount=0 (1차-30 동작 유지).

describe("buildRegionSummaryMartReal — supportCenterMaster 통합 (11-3 1차-34)", () => {
  const SAMPLE_SUPPORT_CENTERS = [
    {
      institutionId: "inst:supportCenter:demo-support:sc-001",
      institutionType: "supportCenter" as const,
      institutionName: "강남특수교육지원센터 (시연용)",
      regionCode: "11680",
      regionCodeType: "sigungu" as const,
    },
    {
      institutionId: "inst:supportCenter:demo-support:sc-002",
      institutionType: "supportCenter" as const,
      institutionName: "해운대특수교육지원센터 (시연용)",
      regionCode: "26350",
      regionCodeType: "sigungu" as const,
    },
    {
      institutionId: "inst:supportCenter:demo-support:sc-003",
      institutionType: "supportCenter" as const,
      institutionName: "동구특수교육지원센터 (시연용)",
      regionCode: "30110",
      regionCodeType: "sigungu" as const,
    },
  ];

  it("supportCenterMaster 전달 시 supportCenterCount=1로 region별 group-by", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
      supportCenterMaster: SAMPLE_SUPPORT_CENTERS,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    const haeundae = result.records.find((r) => r.regionCode === "26350");
    const dongDaejeon = result.records.find((r) => r.regionCode === "30110");
    expect(gangnam?.supportCenterCount).toBe(1);
    expect(haeundae?.supportCenterCount).toBe(1);
    expect(dongDaejeon?.supportCenterCount).toBe(1);
  });

  it("supportCenterMaster 빈 배열 → supportCenterCount=0 (1차-30 동작 유지)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
      supportCenterMaster: [],
    });
    for (const record of result.records) {
      expect(record.supportCenterCount).toBe(0);
    }
  });

  it("supportCenterMaster 미지정 → supportCenterCount=0 (default 빈 배열 fallback)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
    });
    for (const record of result.records) {
      expect(record.supportCenterCount).toBe(0);
    }
  });

  it("동일 region에 supportCenter 2개 → supportCenterCount=2", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
      supportCenterMaster: [
        {
          institutionId: "inst:a",
          institutionType: "supportCenter",
          institutionName: "A 센터",
          regionCode: "11680",
          regionCodeType: "sigungu",
        },
        {
          institutionId: "inst:b",
          institutionType: "supportCenter",
          institutionName: "B 센터",
          regionCode: "11680",
          regionCodeType: "sigungu",
        },
      ],
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.supportCenterCount).toBe(2);
  });

  it("supportCenter + school 함께 입력 — schoolCount와 supportCenterCount 모두 region별 group-by 정상", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [
        {
          schoolId: "s-1",
          schoolName: "강남일반학교",
          schoolType: "generalSchool",
          regionCode: "11680",
          regionCodeType: "sigungu",
        },
      ],
      supportCenterMaster: [
        {
          institutionId: "inst:sc-1",
          institutionType: "supportCenter",
          institutionName: "강남센터",
          regionCode: "11680",
          regionCodeType: "sigungu",
        },
      ],
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.schoolCount).toBe(1);
    expect(gangnam?.supportCenterCount).toBe(1);
  });
});

// ─── 11-3 1차-36 신규 — demandMaster input + specialEducationStudentCount /
// registeredDisabledCount 보강 ──────────────────────────────────────────────
//
// 정책 (사용자 합의값):
// - buildRegionSummaryMartReal에 demandMaster optional 입력 추가.
// - 기존 buildRegionSummaryMart는 그대로 — demandMaster를 그대로 전달.
// - regionCode 기준 left join으로 specialEducationStudentCount / registeredDisabledCount 산출.
// - demandMaster 빈 배열 (또는 미지정) → 두 count undefined (1차-30 / 1차-34 동작 유지).
// - Block C field +2 보강. 완전 실데이터 대시보드 전환이 아님.

describe("buildRegionSummaryMartReal — demandMaster 통합 (11-3 1차-36)", () => {
  const SAMPLE_DEMAND_MASTER = [
    {
      regionCode: "11680",
      regionCodeType: "sigungu" as const,
      specialEducationStudentCount: 380,
      registeredDisabledCount: 18400,
      year: 2026,
    },
    {
      regionCode: "26350",
      regionCodeType: "sigungu" as const,
      specialEducationStudentCount: 295,
      registeredDisabledCount: 16700,
      year: 2026,
    },
  ];

  it("demandMaster 전달 시 specialEducationStudentCount / registeredDisabledCount가 region별로 반영", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
      demandMaster: SAMPLE_DEMAND_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    const haeundae = result.records.find((r) => r.regionCode === "26350");
    expect(gangnam?.specialEducationStudentCount).toBe(380);
    expect(gangnam?.registeredDisabledCount).toBe(18400);
    expect(haeundae?.specialEducationStudentCount).toBe(295);
    expect(haeundae?.registeredDisabledCount).toBe(16700);
  });

  it("demandMaster 빈 배열 → 두 count undefined (1차-30 / 1차-34 동작 유지)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
      demandMaster: [],
    });
    for (const record of result.records) {
      expect(record.specialEducationStudentCount).toBeUndefined();
      expect(record.registeredDisabledCount).toBeUndefined();
    }
  });

  it("demandMaster 미지정 → 두 count undefined (default 빈 배열 fallback, 1차-34와 동일 패턴)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
    });
    for (const record of result.records) {
      expect(record.specialEducationStudentCount).toBeUndefined();
      expect(record.registeredDisabledCount).toBeUndefined();
    }
  });

  it("demandMaster에 없는 region (대전 동구 30110) → 두 count undefined (left join miss)", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [],
      demandMaster: SAMPLE_DEMAND_MASTER,
    });
    const dongDaejeon = result.records.find((r) => r.regionCode === "30110");
    expect(dongDaejeon).toBeDefined();
    expect(dongDaejeon?.specialEducationStudentCount).toBeUndefined();
    expect(dongDaejeon?.registeredDisabledCount).toBeUndefined();
  });

  it("demand + school + supportCenter 함께 입력 — 세 카운트 모두 region별 group-by 정상", () => {
    const result = buildRegionSummaryMartReal({
      adminCodes: SAMPLE_ADMIN_RECORDS,
      schoolMaster: [
        {
          schoolId: "s-1",
          schoolName: "강남일반학교",
          schoolType: "generalSchool",
          regionCode: "11680",
          regionCodeType: "sigungu",
        },
      ],
      supportCenterMaster: [
        {
          institutionId: "inst:sc-1",
          institutionType: "supportCenter",
          institutionName: "강남센터",
          regionCode: "11680",
          regionCodeType: "sigungu",
        },
      ],
      demandMaster: SAMPLE_DEMAND_MASTER,
    });
    const gangnam = result.records.find((r) => r.regionCode === "11680");
    expect(gangnam?.schoolCount).toBe(1);
    expect(gangnam?.supportCenterCount).toBe(1);
    expect(gangnam?.specialEducationStudentCount).toBe(380);
    expect(gangnam?.registeredDisabledCount).toBe(18400);
  });
});
