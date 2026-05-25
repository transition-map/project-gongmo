import type { Coordinate, DataSourceMeta } from "./common";
import type { RegionRef } from "./region";

/**
 * 복지·생활지원 시설 유형. InstitutionType의 부분집합과 매핑된다.
 *
 * - welfareCenter            ↔ 장애인복지관
 * - dayCareFacility          ↔ 주간이용시설
 * - vocationalRehabFacility  ↔ 직업재활시설
 */
export type WelfareFacilityType =
  | "welfareCenter"
  | "dayCareFacility"
  | "vocationalRehabFacility"
  | "other";

/**
 * 묶음 E — 장애인복지관·주간이용시설·직업재활시설 등.
 * 일반 InstitutionSummary로 다룰 수도 있으나, 복지 도메인 고유 필드
 * (servicePrograms 등)가 많아 별도 타입으로 분리한다.
 *
 * facilityId는 institutionId와 같은 네임스페이스를 사용한다:
 *   `inst:{institutionType}:{source}:{sourceId|hash}`
 */
export interface WelfareFacility {
  facilityId: string;
  facilityName: string;
  facilityType: WelfareFacilityType;

  // === 위치 ===
  region?: RegionRef;
  address?: string;
  coordinate?: Coordinate;

  // === 운영 ===
  capacity?: number;
  staffCount?: number;

  // === 프로그램 ===
  /** 운영 프로그램 카테고리 라벨 (예: "직업적응훈련", "여가지원") */
  servicePrograms?: string[];

  // === 연락 ===
  phone?: string;
  website?: string;

  // === 접근성 ===
  accessibilityFeatures?: string[];

  source?: string;
  meta?: DataSourceMeta;
}
