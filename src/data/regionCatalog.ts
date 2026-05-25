/**
 * 11-3 1차-89 — 전국 17 시도 skeleton (행정구역 코드 기반 선택 구조 준비).
 *
 * 본 모듈은 행안부 행정표준코드 / 법정동·행정동 정합성 작업
 * (data/clean.real/G — admin_codes 271 / legal_dong 20,282 / hjd 3,630 / mix 21,525)을
 * 바탕으로 화면 단계에서 전국 17 시도 선택 구조를 안정적으로 제공하기 위한 schema-only.
 *
 * **표현 원칙**:
 * - "전국 행정구역 코드 기반 선택 구조 준비" — 자연스러운 표현
 * - 실 지표 산출 가능 지역과 코드만 준비된 지역을 구분 (readinessStatus)
 * - 실제 없는 지표를 0으로 채우지 않는다 (schoolCount / studentCount / gapIndex 등 fake numeric 0건)
 * - 전수 실데이터 단정성 표현 금지 (정책 §17.7 그대로)
 *
 * **UI 통합은 1차-91+ 별도 단계**. 본 단계는 schema + 17 시도 skeleton + read-only lookup helper만.
 */

/**
 * 시도 단위 데이터 준비 상태.
 *
 * - `dataReady`: mart/indicator 산출 가능 (현재 fixture demo region 7건만 해당)
 * - `partial`: 일부 시군구·도메인만 보유 (예: G admin_codes 매칭 가능 시군구 일부)
 * - `codeOnly`: 행정구역 코드 보유 / 교육·전환 지표 미연결
 * - `unavailable`: 시연 대상 아님 (미래 확장 후보)
 */
export type RegionReadinessStatus =
  | "dataReady"
  | "partial"
  | "codeOnly"
  | "unavailable";

/**
 * 시도 1건 catalog entry.
 *
 * **fake numeric 필드 금지**: schoolCount / studentCount / gapIndex / trendRisk 등
 * 실제 raw 부재인 지표를 0 또는 임의 값으로 채워 공백처럼 보이게 하지 않는다.
 * 지표는 mart/indicator 단계의 region summary에서만 표현한다.
 */
export interface RegionCatalogEntry {
  /** 행안부 시도 코드 2자리 (예: "11" = 서울특별시) */
  sidoCode: string;
  /** 시도 한국어 명칭 */
  sidoName: string;
  /** 데이터 준비 상태 */
  readinessStatus: RegionReadinessStatus;
  /** 상태 안내 설명 (codeOnly / partial 항목 권장) */
  description?: string;
}

/**
 * 17 시도 skeleton. 현재 fixture demo region이 매칭되는 시도만 "partial",
 * 나머지는 "codeOnly". 실 mart/indicator가 시도 단위까지 산출 가능해지면
 * 점진 "dataReady"로 전환.
 *
 * 사용된 sidoCode는 행안부 KIKcd_B 최신 분류 (강원 51 / 전북 52 등 newer system).
 *
 * fixture demo region 시군구 ↔ 시도 매칭 (data/clean.real/G/admin_codes 기준):
 * - 11680 서울 강남구  → 11 서울특별시
 * - 26350 부산 사상구  → 26 부산광역시
 * - 41117 수원 영통구  → 41 경기도
 * - 43113 청주 상당구  → 43 충청북도
 * - 46110 목포시      → 46 전라남도
 * - 51110 춘천시      → 51 강원특별자치도
 */
export const REGION_CATALOG: ReadonlyArray<RegionCatalogEntry> = [
  {
    sidoCode: "11",
    sidoName: "서울특별시",
    readinessStatus: "partial",
    description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능 (시연 데이터)",
  },
  {
    sidoCode: "26",
    sidoName: "부산광역시",
    readinessStatus: "partial",
    description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능 (시연 데이터)",
  },
  {
    sidoCode: "27",
    sidoName: "대구광역시",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "28",
    sidoName: "인천광역시",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "29",
    sidoName: "광주광역시",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "30",
    sidoName: "대전광역시",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "31",
    sidoName: "울산광역시",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "36",
    sidoName: "세종특별자치시",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "41",
    sidoName: "경기도",
    readinessStatus: "partial",
    description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능 (시연 데이터)",
  },
  {
    sidoCode: "43",
    sidoName: "충청북도",
    readinessStatus: "partial",
    description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능 (시연 데이터)",
  },
  {
    sidoCode: "44",
    sidoName: "충청남도",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "46",
    sidoName: "전라남도",
    readinessStatus: "partial",
    description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능 (시연 데이터)",
  },
  {
    sidoCode: "47",
    sidoName: "경상북도",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "48",
    sidoName: "경상남도",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "50",
    sidoName: "제주특별자치도",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
  {
    sidoCode: "51",
    sidoName: "강원특별자치도",
    readinessStatus: "partial",
    description: "행정구역 코드 기반 — 일부 시군구 지표 산출 가능 (시연 데이터)",
  },
  {
    sidoCode: "52",
    sidoName: "전북특별자치도",
    readinessStatus: "codeOnly",
    description: "행정구역 코드 준비 — 지표 산출 전",
  },
];

/**
 * 시도 sidoCode exact lookup.
 *
 * read-only helper. 자동 추천 / 정책 결정 / 강제 선택은 별도 합의 후 단계로 보류.
 * 매칭 실패 시 undefined 반환 (호출자가 처리 책임).
 */
export function getRegionCatalogEntry(
  sidoCode: string,
): RegionCatalogEntry | undefined {
  return REGION_CATALOG.find((entry) => entry.sidoCode === sidoCode);
}
