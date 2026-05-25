/**
 * 11-2 1차-15 display-width 기반 fixed-width 슬라이스 helper.
 *
 * 행안부 KIKcd_B/H/mix는 fixed-width 텍스트인데, **한글 1글자는 display column 2개**를
 * 차지하지만 JavaScript string에서는 UTF-16 code unit 1개로 표현된다. 단순
 * `String.prototype.slice`는 display column 기준 슬라이스가 불가능하므로 별도
 * helper가 필요하다.
 *
 * 정책 (1차-15):
 * - 한글 syllable (U+AC00~U+D7A3) = display width 2
 * - 한글 Jamo (U+1100~U+115F) = display width 2
 * - CJK Unified Ideographs (U+4E00~U+9FFF) = display width 2
 * - CJK Symbols/Punctuation (U+3000~U+303F) = display width 2
 * - Fullwidth Forms (U+FF00~U+FFEF) = display width 2
 * - 그 외 (ASCII·공백·tab 등) = display width 1
 *
 * 비책임:
 * - 인코딩 디코드 (`decodeCp949`가 담당)
 * - 헤더 파싱 (`parseFixedWidthHeader`가 담당)
 */

/**
 * 한 codepoint의 display width를 반환.
 * 한글·CJK·fullwidth = 2 / 그 외 = 1.
 */
function charDisplayWidth(codePoint: number): number {
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) return 2; // Hangul Syllables
  if (codePoint >= 0x1100 && codePoint <= 0x115f) return 2; // Hangul Jamo (modern)
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return 2; // CJK Unified Ideographs
  if (codePoint >= 0x3000 && codePoint <= 0x303f) return 2; // CJK Symbols/Punctuation
  if (codePoint >= 0xff00 && codePoint <= 0xffef) return 2; // Fullwidth Forms
  return 1;
}

/**
 * 문자열 전체의 display column 폭 합산.
 *
 * 빈 문자열 → 0. 결정적 함수.
 */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) w += charDisplayWidth(cp);
  }
  return w;
}

/**
 * `s`의 display column 범위 `[startDisplay, endDisplay)`에 해당하는 부분 문자열을 반환.
 *
 * - `startDisplay === endDisplay` → 빈 문자열
 * - `startDisplay`가 전체 display width 이상이면 빈 문자열
 * - `endDisplay`가 전체 display width 이상이면 가용 끝까지만 반환
 * - **character boundary 보호**: 시작·끝이 한글 글자 가운데를 자르는 위치라면
 *   해당 글자는 결과에 포함되지 않는다 (display width 단위 정렬).
 *
 * KIKcd_B 헤더와 데이터 행이 동일 컬럼 폭으로 작성되어 있다는 fixed-width 전제
 * 하에서 boundary 정렬은 항상 일치하므로 정상 케이스에서는 의도된 글자만 반환된다.
 */
export function sliceByDisplayWidth(
  s: string,
  startDisplay: number,
  endDisplay: number,
): string {
  if (endDisplay <= startDisplay) return "";

  let pos = 0; // 누적 display column
  let result = "";

  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) break;
    const w = charDisplayWidth(cp);
    const charEnd = pos + w;

    // 현 글자가 [startDisplay, endDisplay) 범위 안에 완전히 포함되는 경우만 추가.
    // (boundary가 글자 가운데를 자르면 그 글자는 결과에 포함되지 않음.)
    if (pos >= startDisplay && charEnd <= endDisplay) {
      result += ch;
    }

    pos = charEnd;

    // 더 이상 진행해도 endDisplay를 넘으면 종료 (성능 최적화)
    if (pos >= endDisplay) break;
  }

  return result;
}
