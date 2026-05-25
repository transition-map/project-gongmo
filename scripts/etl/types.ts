/**
 * scripts/etl 공용 타입.
 *
 * - src/lib/etl/types의 타입(IssueCollector, DataQualityIssue 등)을 재사용한다.
 * - 본 모듈은 scripts/etl 내부에서만 사용되며, src/types는 수정하지 않는다.
 */

import type {
  CleanRecord,
  DataQualityIssue,
} from "../../src/lib/etl/types";

export type { CleanRecord, DataQualityIssue };

/**
 * clean 단계 함수의 반환 형태.
 *
 * 각 cleaner는 자체 `Cleaned*Record` 인터페이스를 generic 인자로 명시한다.
 * generic 인자를 생략하면 비정형 `CleanRecord`로 widening되어 호출자에서
 * 필드 접근 시 unknown 추론된다.
 */
export interface CleanResult<TRecord = CleanRecord> {
  records: TRecord[];
  issues: DataQualityIssue[];
}

/** fixture 파일의 표준 메타. */
export interface FixtureMeta {
  source: string;
  license: string;
  datasetCategory: string;
  description?: string;
}

/** fixture 파일의 표준 형태. */
export interface FixtureFile<T> {
  _meta: FixtureMeta;
  records: T[];
}

/**
 * clean 단계 출력 파일의 표준 형태.
 * `records`는 cleaner별로 다른 구체 타입을 가지므로 `unknown[]`로 widening한다.
 * 호출자(runEtl)가 cleaner의 구체 결과를 그대로 직렬화한다.
 */
export interface CleanOutputFile {
  _meta: {
    /**
     * clean 산출물의 출처 라벨.
     * - `"demo"` — fixture 모드 (data/fixtures/*.csv or *.json 기반).
     * - `"real:kikcd-b"` — 11-2 1차-15 real 모드, 행안부 KIKcd_B fixed-width 파일 기반.
     * - `"real:kikcd-h"` — 11-2 1차-16 real 모드, 행안부 KIKcd_H 행정동 fixed-width 파일 기반.
     * - `"real:kikmix"` — 11-2 1차-17 real 모드, 행안부 KIKmix 행정동↔법정동 매핑 fixed-width 파일 기반.
     * - `"fixture:B-schools"` — 11-3 1차-2 real 모드, B 학교 mini fixture JSON을 proxy로 사용한 경우.
     * - `"real:schools-json"` — 11-3 1차-2 real 모드, B 학교 raw JSON 파일 기반 (사용자 수동 다운로드).
     * 추가 real source는 후속 단계에서 union 확장 (master.real 등).
     */
    source:
      | "demo"
      | "real:kikcd-b"
      | "real:kikcd-h"
      | "real:kikmix"
      | "fixture:B-schools"
      | "real:schools-json";
    /**
     * 11-3 1차-19 — 산출물의 라이선스 정책 노출. **optional** (G admin/legalDong/hjd/mix
     * 산출물은 본 필드 없이 backward-compatible). 현재 B/schools 산출물에서만 노출되며,
     * `cleanSchools.meta.license`(`"demo-only" | "unknown"`)를 그대로 전파한다.
     * 사용자가 실 source review를 마치고 license 표기를 수동 갱신하기 전까지는
     * source prefix 기반 자동 분기 결과(fixture:* → `"demo-only"`, real:* → `"unknown"`)가
     * 그대로 노출된다 (cleanSchools.ts 1차-2 정책 일관).
     */
    license?: "demo-only" | "unknown";
    datasetCategory: string;
    stage: "clean";
    recordCount: number;
    issueCount: number;
    generatedAt: string;
  };
  records: unknown[];
  issues: DataQualityIssue[];
}
