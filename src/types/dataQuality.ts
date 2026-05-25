import type { DatasetCategory } from "./common";

export type DataQualitySeverity = "info" | "warning" | "error";

/**
 * 결합 실패·결측·이상치 등 데이터 품질 이슈 1건.
 * Mart 단계에서 매칭률·결측률과 함께 산출되며, 화면 또는 운영 모니터링에서
 * 사용한다.
 */
export interface DataQualityIssue {
  issueId?: string;
  severity: DataQualitySeverity;
  datasetCategory?: DatasetCategory;

  /** 어떤 필드의 이슈인지 (예: "regionCode", "ncsCode") */
  field?: string;

  /** 사람이 읽을 수 있는 메시지 (한국어 허용) */
  message: string;

  /** 영향받은 레코드 수 */
  affectedCount?: number;

  /** 이슈가 감지된 시각 (ISO 8601) */
  detectedAt?: string;

  /** 원천 시스템 식별자 */
  source?: string;
}
