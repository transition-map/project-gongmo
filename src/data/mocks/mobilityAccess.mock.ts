/**
 * 묶음 F — MobilityAccess mock (12개 = 6 시군구 × baseYear 2개).
 * baseYear: 2025, 2026. 전년 대비 추세 시연 목적.
 * 2026 정책: DEFAULT_BASE_YEAR=2026 호출 시 2026 항목이 선택된다.
 *
 * 패턴:
 *  - 강남(01): 양호 → 소폭 개선
 *  - 해운대(02): 중간 → 미세 개선
 *  - 수원영통(03): 중간 → 정체
 *  - 흥덕(04): 평균 → 약간 개선
 *  - 목포(05): 매우 취약 → 일부 개선되나 여전히 낮음
 *  - 춘천(06): 평균 이하 → 정체
 */

import type { MobilityAccess } from "../../types";
import {
  DEMO_COLLECTED_AT,
  DEMO_LICENSE,
  DEMO_SOURCE_UPDATED_AT,
} from "./_shared";

interface MobilityEntry {
  regionCode: string;
  baseYear: number;
  barrierFreeFacilityCount: number;
  barrierFreeComplianceRate: number;
  busStopCount: number;
  accessibleBusStopCount: number;
  lowFloorBusRate: number;
  accessibleSubwayStationCount?: number;
  specialTransportVehicleCount: number;
  mobilityCenterCount: number;
  accessibilityScore: number;
}

const ENTRIES: MobilityEntry[] = [
  // 강남구
  { regionCode: "DEMO-SIGUNGU-01", baseYear: 2025, barrierFreeFacilityCount: 1_120, barrierFreeComplianceRate: 78.4, busStopCount: 510, accessibleBusStopCount: 410, lowFloorBusRate: 71.2, accessibleSubwayStationCount: 18, specialTransportVehicleCount: 38, mobilityCenterCount: 1, accessibilityScore: 80 },
  { regionCode: "DEMO-SIGUNGU-01", baseYear: 2026, barrierFreeFacilityCount: 1_180, barrierFreeComplianceRate: 80.6, busStopCount: 510, accessibleBusStopCount: 432, lowFloorBusRate: 73.5, accessibleSubwayStationCount: 19, specialTransportVehicleCount: 42, mobilityCenterCount: 1, accessibilityScore: 82 },
  // 해운대구
  { regionCode: "DEMO-SIGUNGU-02", baseYear: 2025, barrierFreeFacilityCount: 880, barrierFreeComplianceRate: 64.2, busStopCount: 420, accessibleBusStopCount: 280, lowFloorBusRate: 56.8, accessibleSubwayStationCount: 8, specialTransportVehicleCount: 26, mobilityCenterCount: 1, accessibilityScore: 64 },
  { regionCode: "DEMO-SIGUNGU-02", baseYear: 2026, barrierFreeFacilityCount: 920, barrierFreeComplianceRate: 66.5, busStopCount: 420, accessibleBusStopCount: 295, lowFloorBusRate: 58.4, accessibleSubwayStationCount: 8, specialTransportVehicleCount: 28, mobilityCenterCount: 1, accessibilityScore: 66 },
  // 수원시 영통구
  { regionCode: "DEMO-SIGUNGU-03", baseYear: 2025, barrierFreeFacilityCount: 760, barrierFreeComplianceRate: 58.1, busStopCount: 380, accessibleBusStopCount: 220, lowFloorBusRate: 52.4, accessibleSubwayStationCount: 6, specialTransportVehicleCount: 22, mobilityCenterCount: 1, accessibilityScore: 58 },
  { regionCode: "DEMO-SIGUNGU-03", baseYear: 2026, barrierFreeFacilityCount: 770, barrierFreeComplianceRate: 58.6, busStopCount: 380, accessibleBusStopCount: 222, lowFloorBusRate: 52.8, accessibleSubwayStationCount: 6, specialTransportVehicleCount: 22, mobilityCenterCount: 1, accessibilityScore: 58 },
  // 청주시 흥덕구
  { regionCode: "DEMO-SIGUNGU-04", baseYear: 2025, barrierFreeFacilityCount: 540, barrierFreeComplianceRate: 60.5, busStopCount: 320, accessibleBusStopCount: 200, lowFloorBusRate: 48.6, specialTransportVehicleCount: 14, mobilityCenterCount: 0, accessibilityScore: 62 },
  { regionCode: "DEMO-SIGUNGU-04", baseYear: 2026, barrierFreeFacilityCount: 560, barrierFreeComplianceRate: 62.4, busStopCount: 320, accessibleBusStopCount: 210, lowFloorBusRate: 50.2, specialTransportVehicleCount: 16, mobilityCenterCount: 0, accessibilityScore: 64 },
  // 목포시
  { regionCode: "DEMO-SIGUNGU-05", baseYear: 2025, barrierFreeFacilityCount: 280, barrierFreeComplianceRate: 38.4, busStopCount: 240, accessibleBusStopCount: 80, lowFloorBusRate: 22.6, specialTransportVehicleCount: 6, mobilityCenterCount: 1, accessibilityScore: 26 },
  { regionCode: "DEMO-SIGUNGU-05", baseYear: 2026, barrierFreeFacilityCount: 300, barrierFreeComplianceRate: 40.2, busStopCount: 240, accessibleBusStopCount: 88, lowFloorBusRate: 24.0, specialTransportVehicleCount: 8, mobilityCenterCount: 1, accessibilityScore: 28 },
  // 춘천시
  { regionCode: "DEMO-SIGUNGU-06", baseYear: 2025, barrierFreeFacilityCount: 360, barrierFreeComplianceRate: 50.2, busStopCount: 280, accessibleBusStopCount: 130, lowFloorBusRate: 38.8, specialTransportVehicleCount: 10, mobilityCenterCount: 0, accessibilityScore: 48 },
  { regionCode: "DEMO-SIGUNGU-06", baseYear: 2026, barrierFreeFacilityCount: 360, barrierFreeComplianceRate: 50.6, busStopCount: 280, accessibleBusStopCount: 132, lowFloorBusRate: 39.4, specialTransportVehicleCount: 10, mobilityCenterCount: 0, accessibilityScore: 48 },
];

export const mobilityAccess: MobilityAccess[] = ENTRIES.map((e) => ({
  regionCode: e.regionCode,

  barrierFreeFacilityCount: e.barrierFreeFacilityCount,
  barrierFreeComplianceRate: e.barrierFreeComplianceRate,

  busStopCount: e.busStopCount,
  accessibleBusStopCount: e.accessibleBusStopCount,
  lowFloorBusRate: e.lowFloorBusRate,

  accessibleSubwayStationCount: e.accessibleSubwayStationCount,

  specialTransportVehicleCount: e.specialTransportVehicleCount,
  mobilityCenterCount: e.mobilityCenterCount,

  accessibilityScore: e.accessibilityScore,

  meta: {
    source: "demo:장애인편의시설+교통약자이동지원",
    datasetCategory: "F",
    baseYear: e.baseYear,
    sourceUpdatedAt: DEMO_SOURCE_UPDATED_AT,
    collectedAt: DEMO_COLLECTED_AT,
    license: DEMO_LICENSE,
  },
}));
