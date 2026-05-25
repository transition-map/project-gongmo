import type { DataSourceMeta } from "./common";

/**
 * 묶음 F — 이동권·접근성 시군구 단위 집계.
 * 개별 정류장·시설은 InstitutionSummary(mobilityCenter) 또는 별도 POI 데이터로 다룬다.
 */
export interface MobilityAccess {
  regionCode: string;

  // === 편의시설 ===
  /** 장애인 편의시설 설치 건수 */
  barrierFreeFacilityCount?: number;
  /** 적합 설치율 (%) */
  barrierFreeComplianceRate?: number;

  // === 대중교통 인프라 ===
  busStopCount?: number;
  accessibleBusStopCount?: number;
  /** 저상버스 도입률 (%) */
  lowFloorBusRate?: number;

  /** 지하철 무장애 동선 보유 역 수 (광역시 단위만 의미) */
  accessibleSubwayStationCount?: number;

  // === 특별교통수단 ===
  /** 특별교통수단(장애인 콜택시 등) 차량 수 */
  specialTransportVehicleCount?: number;
  /** 교통약자 이동지원센터 수 */
  mobilityCenterCount?: number;

  // === 종합 점수 ===
  /** 가공된 접근성 점수 (0~100). 산식 구현은 7단계. */
  accessibilityScore?: number;

  meta?: DataSourceMeta;
}
