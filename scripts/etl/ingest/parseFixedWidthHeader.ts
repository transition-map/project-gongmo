/**
 * 11-2 1차-15 fixed-width 헤더 파서.
 *
 * 행안부 KIKcd_B 헤더 한 라인에서 각 컬럼의 display column 시작·끝 위치를 동적으로
 * 추출한다. 데이터 행은 헤더와 동일한 컬럼 폭을 가진다는 fixed-width 전제 하에,
 * 본 helper가 반환한 `ColumnSpec[]`을 `sliceByDisplayWidth`와 함께 사용하여 row를
 * 파싱한다.
 *
 * 책임:
 * - 헤더에서 requiredKeys 각각의 JS 위치 → display column 시작 위치로 변환
 * - 인접 컬럼 boundary 연속화 (`spec[i].displayEnd === spec[i+1].displayStart`)
 * - 마지막 컬럼은 헤더 전체 display width 이상까지 확장
 * - requiredKeys 중 하나라도 누락이면 한국어 Error throw (누락 키 이름 포함)
 * - 반환 spec 순서는 입력 requiredKeys 순서 유지
 *
 * 1차-15 한계:
 * - 키가 헤더에 두 번 등장하는 경우 `indexOf` 결과(첫 위치)만 사용. KIKcd_B/H/mix
 *   헤더는 키가 distinct하므로 본 단계에서는 안전.
 * - 동적 검출만 — HWPX Layout 사양서 기반 상수 fallback은 1차-16+ 보강 후보.
 */

import { displayWidth } from "./sliceByDisplayWidth";

/**
 * fixed-width 헤더 한 컬럼의 spec.
 * `[displayStart, displayEnd)` half-open 범위로 데이터 행을 슬라이스한다.
 */
export interface ColumnSpec {
  key: string;
  displayStart: number;
  displayEnd: number;
}

export function parseFixedWidthHeader(
  headerLine: string,
  requiredKeys: readonly string[],
): ColumnSpec[] {
  if (requiredKeys.length === 0) {
    throw new Error(
      `[parseFixedWidthHeader] requiredKeys 배열이 비어 있어 헤더 파싱이 불가능합니다.`,
    );
  }

  // 1) 각 키의 JS index 찾기 + displayStart 계산.
  //    indexOf는 JS character index를 반환하므로 [0, jsIndex) 슬라이스의 displayWidth로
  //    display column으로 변환한다.
  const positions: Array<{
    key: string;
    displayStart: number;
  }> = [];

  for (const key of requiredKeys) {
    const jsIndex = headerLine.indexOf(key);
    if (jsIndex === -1) {
      throw new Error(
        `[parseFixedWidthHeader] 필수 헤더 키 '${key}'를 헤더 라인에서 찾을 수 없습니다. ` +
          `헤더에 누락되었거나 표기가 다를 수 있습니다.`,
      );
    }
    const displayStart = displayWidth(headerLine.slice(0, jsIndex));
    positions.push({ key, displayStart });
  }

  // 2) 정렬된 displayStart 목록으로 boundary 계산.
  //    각 spec의 displayEnd = 정렬 순서상 자기 다음 컬럼의 displayStart.
  //    마지막 컬럼(정렬 기준)은 Number.MAX_SAFE_INTEGER로 확장하여 데이터 행
  //    꼬리부 보존을 보장한다. 본 RED 테스트는 마지막 컬럼 displayEnd >= header
  //    displayWidth만 요구.
  const sortedStarts = positions.map((p) => p.displayStart).sort((a, b) => a - b);

  return positions.map((p) => {
    const idx = sortedStarts.indexOf(p.displayStart);
    let displayEnd: number;
    if (idx >= 0 && idx + 1 < sortedStarts.length) {
      displayEnd = sortedStarts[idx + 1];
    } else {
      displayEnd = Number.MAX_SAFE_INTEGER;
    }
    return { key: p.key, displayStart: p.displayStart, displayEnd };
  });
}
