/**
 * 묶음 D — JobPosting mock (18개). 시군구당 평균 3건.
 * 시연용 사업장(employer) 3개 + 미식별 외부 사업장 일부.
 */

import type { EmploymentType, JobPosting } from "../../types";
import { institutions } from "./institutions.mock";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_REGIONS,
  DEMO_SOURCE_UPDATED_AT,
  demoCoordinate,
  makeJobPostingId,
  regionRefOf,
} from "./_shared";

interface PostingEntry {
  regionCode: string;
  jobTitle: string;
  /** employer institutionId가 있다면 명시. 없으면 외부 사업장으로 처리. */
  employerShortName?: string;
  externalEmployerName?: string;
  jobCode?: string;
  ncsCode?: string;
  worknetJobCode?: string;
  employmentType: EmploymentType;
  vacancyCount: number;
  postedAt: string;
  closingAt: string;
  isDisabilityFriendly: boolean;
  accessibilityNotes: string[];
  dx: number;
  dy: number;
}

const ENTRIES: PostingEntry[] = [
  // 강남구 (3) — 사업장A 사용
  { regionCode: "DEMO-SIGUNGU-01", jobTitle: "사무 보조원", employerShortName: "강남시연사업장A", jobCode: "DEMO-J-001", ncsCode: "20-1-001-1", worknetJobCode: "WK-DEMO-J-001", employmentType: "fullTime", vacancyCount: 2, postedAt: "2025-11-15T09:00:00+09:00", closingAt: "2025-12-31T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["엘리베이터", "휠체어 동선"], dx: 0.034, dy: 0.014 },
  { regionCode: "DEMO-SIGUNGU-01", jobTitle: "데이터 입력 (재택)", employerShortName: "강남시연사업장A", jobCode: "DEMO-J-002", employmentType: "partTime", vacancyCount: 4, postedAt: "2025-11-20T09:00:00+09:00", closingAt: "2026-01-20T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["재택근무"], dx: 0.034, dy: 0.014 },
  { regionCode: "DEMO-SIGUNGU-01", jobTitle: "물류 보조", externalEmployerName: "강남시연외부사업장", jobCode: "DEMO-J-003", employmentType: "fullTime", vacancyCount: 1, postedAt: "2025-12-01T09:00:00+09:00", closingAt: "2026-02-01T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["휠체어 동선"], dx: 0.040, dy: -0.020 },

  // 해운대구 (3)
  { regionCode: "DEMO-SIGUNGU-02", jobTitle: "카페 보조", externalEmployerName: "해운대시연카페", jobCode: "DEMO-J-004", ncsCode: "13-1-005-2", employmentType: "partTime", vacancyCount: 2, postedAt: "2025-11-10T09:00:00+09:00", closingAt: "2025-12-30T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["휠체어 동선"], dx: 0.026, dy: -0.024 },
  { regionCode: "DEMO-SIGUNGU-02", jobTitle: "사무 보조원", externalEmployerName: "해운대시연사무A", jobCode: "DEMO-J-005", employmentType: "fullTime", vacancyCount: 1, postedAt: "2025-11-25T09:00:00+09:00", closingAt: "2026-01-15T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["엘리베이터"], dx: -0.022, dy: 0.024 },
  { regionCode: "DEMO-SIGUNGU-02", jobTitle: "도서관 보조", externalEmployerName: "해운대시연도서관", jobCode: "DEMO-J-006", employmentType: "internship", vacancyCount: 1, postedAt: "2025-12-05T09:00:00+09:00", closingAt: "2026-02-05T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: [], dx: 0.018, dy: 0.030 },

  // 수원시 영통구 (3) — 사업장B 사용
  { regionCode: "DEMO-SIGUNGU-03", jobTitle: "포장 보조", employerShortName: "수원영통시연사업장B", jobCode: "DEMO-J-007", employmentType: "fullTime", vacancyCount: 3, postedAt: "2025-11-12T09:00:00+09:00", closingAt: "2026-01-12T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["휠체어 동선"], dx: -0.034, dy: -0.018 },
  { regionCode: "DEMO-SIGUNGU-03", jobTitle: "사무 보조원", employerShortName: "수원영통시연사업장B", jobCode: "DEMO-J-008", employmentType: "fullTime", vacancyCount: 2, postedAt: "2025-11-22T09:00:00+09:00", closingAt: "2026-01-22T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["엘리베이터"], dx: -0.034, dy: -0.018 },
  { regionCode: "DEMO-SIGUNGU-03", jobTitle: "디지털 콘텐츠 단순작업 (재택)", externalEmployerName: "수원영통시연원격A", jobCode: "DEMO-J-009", employmentType: "partTime", vacancyCount: 5, postedAt: "2025-12-03T09:00:00+09:00", closingAt: "2026-02-28T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["재택근무"], dx: 0.034, dy: 0.030 },

  // 청주시 흥덕구 (3) — 사업장C 사용
  { regionCode: "DEMO-SIGUNGU-04", jobTitle: "조립 보조", employerShortName: "흥덕시연사업장C", jobCode: "DEMO-J-010", employmentType: "fullTime", vacancyCount: 2, postedAt: "2025-11-18T09:00:00+09:00", closingAt: "2026-01-18T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["휠체어 동선"], dx: 0.030, dy: -0.030 },
  { regionCode: "DEMO-SIGUNGU-04", jobTitle: "농산물 가공 보조", externalEmployerName: "흥덕시연농가공", jobCode: "DEMO-J-011", employmentType: "temporary", vacancyCount: 4, postedAt: "2025-12-05T09:00:00+09:00", closingAt: "2026-02-05T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: [], dx: -0.030, dy: 0.030 },
  { regionCode: "DEMO-SIGUNGU-04", jobTitle: "사무 보조원", externalEmployerName: "흥덕시연공공기관", jobCode: "DEMO-J-012", employmentType: "fullTime", vacancyCount: 1, postedAt: "2025-12-10T09:00:00+09:00", closingAt: "2026-02-10T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["엘리베이터"], dx: 0.020, dy: 0.030 },

  // 목포시 (3)
  { regionCode: "DEMO-SIGUNGU-05", jobTitle: "수산물 가공 보조", externalEmployerName: "목포시연수산", jobCode: "DEMO-J-013", employmentType: "fullTime", vacancyCount: 2, postedAt: "2025-11-15T09:00:00+09:00", closingAt: "2026-01-15T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: [], dx: 0.030, dy: -0.024 },
  { regionCode: "DEMO-SIGUNGU-05", jobTitle: "도서관 보조", externalEmployerName: "목포시연도서관", jobCode: "DEMO-J-014", employmentType: "internship", vacancyCount: 1, postedAt: "2025-12-01T09:00:00+09:00", closingAt: "2026-02-01T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["휠체어 동선"], dx: -0.030, dy: -0.018 },
  { regionCode: "DEMO-SIGUNGU-05", jobTitle: "원격 사무 보조 (재택)", externalEmployerName: "목포시연원격A", jobCode: "DEMO-J-015", employmentType: "partTime", vacancyCount: 3, postedAt: "2025-12-08T09:00:00+09:00", closingAt: "2026-02-28T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["재택근무"], dx: 0.024, dy: 0.026 },

  // 춘천시 (3)
  { regionCode: "DEMO-SIGUNGU-06", jobTitle: "사무 보조원", externalEmployerName: "춘천시연사업장A", jobCode: "DEMO-J-016", employmentType: "fullTime", vacancyCount: 2, postedAt: "2025-11-20T09:00:00+09:00", closingAt: "2026-01-20T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["엘리베이터"], dx: 0.030, dy: 0.020 },
  { regionCode: "DEMO-SIGUNGU-06", jobTitle: "관광지 안내 보조", externalEmployerName: "춘천시연관광", jobCode: "DEMO-J-017", employmentType: "temporary", vacancyCount: 2, postedAt: "2025-12-01T09:00:00+09:00", closingAt: "2026-03-01T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: [], dx: -0.024, dy: 0.026 },
  { regionCode: "DEMO-SIGUNGU-06", jobTitle: "디지털 콘텐츠 단순작업 (재택)", externalEmployerName: "춘천시연원격A", jobCode: "DEMO-J-018", employmentType: "partTime", vacancyCount: 4, postedAt: "2025-12-05T09:00:00+09:00", closingAt: "2026-02-28T18:00:00+09:00", isDisabilityFriendly: true, accessibilityNotes: ["재택근무"], dx: 0.020, dy: -0.030 },
];

function regionShort(regionCode: string): string {
  const r = DEMO_REGIONS.find((x) => x.regionCode === regionCode);
  return r ? r.regionName ?? regionCode : regionCode;
}

const employerByShortName = new Map(
  institutions
    .filter((i) => i.institutionType === "employer")
    .map((i) => [
      i.institutionName.replace(" (시연용)", ""),
      i,
    ]),
);

export const jobPostings: JobPosting[] = ENTRIES.map((e) => {
  const employer = e.employerShortName
    ? employerByShortName.get(e.employerShortName)
    : undefined;
  const employerName =
    employer?.institutionName ??
    (e.externalEmployerName
      ? `${e.externalEmployerName} (시연용)`
      : "외부 사업장 (시연용)");

  return {
    jobPostingId: makeJobPostingId(
      `${e.regionCode}-${e.jobTitle}-${e.jobCode ?? "x"}`,
    ),
    jobTitle: `${e.jobTitle} (시연용)`,

    employerId: employer?.institutionId,
    employerName,

    region: regionRefOf(e.regionCode),
    address: `${regionShort(e.regionCode)} 시연용 주소`,
    coordinate: demoCoordinate(e.regionCode, e.dx, e.dy),

    jobCode: e.jobCode,
    ncsCode: e.ncsCode,
    worknetJobCode: e.worknetJobCode,

    employmentType: e.employmentType,
    vacancyCount: e.vacancyCount,

    postedAt: e.postedAt,
    closingAt: e.closingAt,

    isDisabilityFriendly: e.isDisabilityFriendly,
    accessibilityNotes: e.accessibilityNotes,

    source: "demo:장애인구인정보",
    meta: {
      source: "demo:장애인구인정보",
      datasetCategory: "D",
      sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
      collectedAt: DEMO_COLLECTED_AT,
      license: DEMO_LICENSE,
    },
  };
});
