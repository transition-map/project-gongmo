import type {
  Coordinate,
  DataSourceMeta,
  DisabilityCategoryBreakdown,
} from "./common";
import type { RegionRef } from "./region";

/** 학교 유형 (시연용 도메인 어휘 — 실제 데이터 매핑 시 확장) */
export type SchoolType =
  | "specialSchool"
  | "specialClassInGeneralSchool"
  | "generalSchool"
  | "vocationalHighSchool"
  | "alternativeSchool"
  | "other";

/**
 * 묶음 B(학교·교육 여건). 학교는 좌표 기반 point entity로 다룬다.
 */
export interface SchoolSummary {
  /**
   * 기본 키. NEIS 학교 표준 코드가 있으면 그 값.
   * 부재 시 임시 ID 형식: `school:{source}:{hash}`.
   */
  schoolId: string;
  /** NEIS 학교 표준 코드. 별도 보관용 optional. */
  neisSchoolCode?: string;

  schoolName: string;
  schoolType?: SchoolType;

  // === 위치 ===
  region?: RegionRef;
  address?: string;
  coordinate?: Coordinate;

  // === 학교 여건 (특수교육) ===
  specialEducationStudentCount?: number;
  specialEducationTeacherCount?: number;
  specialEducationClassCount?: number;
  inclusionProgramCount?: number;
  /**
   * 장애유형별 집계 (학교 단위). 통계 전용.
   * 추천 후보 제한에 사용 금지. 자세한 규칙은 `DisabilityCategoryBreakdown` JSDoc 참고.
   */
  disabilityCategoryBreakdown?: DisabilityCategoryBreakdown[];

  // === 시설/지원 ===
  hasBarrierFreeFacility?: boolean;
  hasShuttleService?: boolean;
  hasInclusionProgram?: boolean;

  // === 데이터 메타 ===
  meta?: DataSourceMeta;
}
