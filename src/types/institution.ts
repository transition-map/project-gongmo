import type { Coordinate, DataSourceMeta } from "./common";
import type { RegionRef } from "./region";

/**
 * 기관 유형. 묶음 B/C/D/E/F의 기관을 모두 표현한다.
 * 기관 도메인별로 더 풍부한 필드가 필요하면 InstitutionSummary를
 * extends하는 별도 타입을 추가한다 (예: WelfareFacility).
 */
export type InstitutionType =
  | "supportCenter"            // B. 특수교육지원센터
  | "trainingCenter"           // C. HRD-Net 훈련기관, 발달장애인훈련센터, 민간훈련기관
  | "careerExperienceCenter"   // C. 진로체험기관 (꿈길 등)
  | "welfareCenter"            // E. 장애인복지관
  | "dayCareFacility"          // E. 주간이용시설
  | "vocationalRehabFacility"  // E. 직업재활시설
  | "employer"                 // D. 구인 사업장
  | "mobilityCenter";          // F. 교통약자 이동지원센터

/**
 * 기관 공통 요약. 모든 기관은 좌표 기반 point entity로 취급한다.
 *
 * institutionId 형식: `inst:{institutionType}:{source}:{sourceId|hash}`
 * 식별은 (기관명 + 주소 + 출처 + 유형) 조합으로 한다. 기관명 단독 식별 금지.
 */
export interface InstitutionSummary {
  institutionId: string;
  institutionType: InstitutionType;
  institutionName: string;

  // === 위치 ===
  region?: RegionRef;
  address?: string;
  coordinate?: Coordinate;

  // === 연락 ===
  phone?: string;
  website?: string;

  // === 운영 규모 ===
  programCount?: number;
  capacity?: number;
  staffCount?: number;

  // === 접근성 보조 정보 ===
  /** 휠체어/엘리베이터/저상 동선 등 가용 편의 항목 */
  accessibilityFeatures?: string[];

  // === 출처/메타 ===
  /** 원천 시스템 식별자 (예: "hrdnet", "worknet", "ggoomgil") */
  source?: string;
  meta?: DataSourceMeta;
}
