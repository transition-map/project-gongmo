# -*- coding: utf-8 -*-
"""
교육부_특수교육통계 2025 PDF → public/data/special_education_statistics.json 추출 스크립트.

원천 데이터:
- 데이터명: 교육부_특수교육통계
- 기준연도: 2025 / 조사기준일: 2025.4.1.
- 제공기관: 교육부
- 출처 URL: https://www.data.go.kr/data/15051018/fileData.do
- 라이선스: 공공저작물 출처표시 제1유형

추출 대상:
- "Ⅰ-1. 2025년 특수교육 주요 현황" 중 "시·도별 개황" 표

정직성 원칙:
- 값을 임의로 만들지 않는다. PDF 표 텍스트에서 직접 파싱한다.
- 행별 합산 검증과 17개 시도 열별 합산 검증을 모두 통과할 때만 JSON을 생성한다.
- 한 건이라도 검증에 실패하면 JSON을 만들지 않고 비정상 종료한다.
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

try:
    import pdfplumber  # type: ignore
except ImportError:
    print("[ERROR] pdfplumber가 필요합니다: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

RAW_DIR = os.path.join("data", "raw", "special_education_statistics")
OUT_PATH = os.path.join("public", "data", "special_education_statistics.json")

EXPECTED_SIDO = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]

RAW_COL_COUNT = 15
COL_INDEX = {
    "specialSchoolCount": 0,
    "specialSchoolClassCount": 1,
    "specialSchoolStudentCount": 2,
    "specialClassSchoolCount": 5,
    "specialClassCount": 6,
    "specialClassStudentCount": 7,
    "inclusiveClassSchoolCount": 9,
    "inclusiveClassCount": 10,
    "inclusiveClassStudentCount": 11,
    "specialEducationCenterInfantCount": 12,
    "totalSpecialEducationStudents": 14,
}

META = {
    "title": "교육부_특수교육통계",
    "provider": "교육부",
    "year": 2025,
    "surveyDate": "2025-04-01",
    "sourceUrl": "https://www.data.go.kr/data/15051018/fileData.do",
    "license": "공공저작물 출처표시 제1유형",
    "sourceDocument": "2025 특수교육통계 — Ⅰ-1. 2025년 특수교육 주요 현황 (시·도별 개황)",
    "extractedFrom": "data/raw/special_education_statistics/2025_special_education_statistics.pdf",
    "note": "지역별 수요·자원 지표는 2025 특수교육통계 기반이며, 학생 맞춤 추천 예시는 서비스 흐름 검증을 위한 시연용 데이터입니다.",
}


def _to_int(token: str) -> int:
    s = token.strip().replace(",", "")
    if s in ("-", "", "–", "—"):
        return 0
    return int(s)


def _find_raw_pdf() -> str:
    pdfs = sorted(glob.glob(os.path.join(RAW_DIR, "*.pdf")))
    if not pdfs:
        print(
            f"[ERROR] 원천 PDF 없음: {RAW_DIR}/*.pdf\n"
            f"        교육부_특수교육통계 PDF를 위 폴더에 넣은 뒤 다시 실행하세요.\n"
            f"        출처: {META['sourceUrl']}",
            file=sys.stderr,
        )
        sys.exit(2)
    return pdfs[-1]


def _find_overview_page(pdf) -> str:
    """'시·도별 개황' 표가 있는 페이지의 텍스트를 반환."""
    for page in pdf.pages[:40]:
        text = page.extract_text() or ""
        compact = text.replace(" ", "")
        if ("시·도별개황" in compact or "시･도별개황" in compact) and "특수교육지원센터" in compact:
            return text
    print("[ERROR] '시·도별 개황' 표 페이지를 찾지 못했습니다.", file=sys.stderr)
    sys.exit(3)


def _parse_rows(text: str) -> list[tuple[str, list[int]]]:
    names = set(EXPECTED_SIDO) | {"전체"}
    rows: list[tuple[str, list[int]]] = []
    for line in text.split("\n"):
        parts = line.split()
        if not parts or parts[0] not in names:
            continue
        nums = [p for p in parts[1:] if re.fullmatch(r"[0-9,]+|-|–|—", p)]
        if len(nums) >= RAW_COL_COUNT:
            rows.append((parts[0], [_to_int(x) for x in nums[:RAW_COL_COUNT]]))
    return rows


def _verify(rows: list[tuple[str, list[int]]]) -> dict[str, list[int]]:
    by_name = {name: vals for name, vals in rows}

    missing = [s for s in EXPECTED_SIDO if s not in by_name]
    if missing or "전체" not in by_name:
        print(f"[ERROR] 필수 행 누락: {missing} (전체 행: {'전체' in by_name})", file=sys.stderr)
        sys.exit(4)

    for name in EXPECTED_SIDO + ["전체"]:
        v = by_name[name]
        chk = (
            v[COL_INDEX["specialSchoolStudentCount"]]
            + v[COL_INDEX["specialClassStudentCount"]]
            + v[COL_INDEX["inclusiveClassStudentCount"]]
            + v[COL_INDEX["specialEducationCenterInfantCount"]]
        )
        total = v[COL_INDEX["totalSpecialEducationStudents"]]
        if chk != total:
            print(f"[ERROR] 행 합산 검증 실패: {name} 합={chk} 계={total}", file=sys.stderr)
            sys.exit(5)

    total_row = by_name["전체"]
    for key, idx in COL_INDEX.items():
        s = sum(by_name[name][idx] for name in EXPECTED_SIDO)
        if s != total_row[idx]:
            print(f"[ERROR] 열 합산 검증 실패: {key} 시도합={s} 전체={total_row[idx]}", file=sys.stderr)
            sys.exit(6)

    return by_name


def main() -> None:
    pdf_path = _find_raw_pdf()
    with pdfplumber.open(pdf_path) as pdf:
        text = _find_overview_page(pdf)
    rows = _parse_rows(text)
    by_name = _verify(rows)

    out_rows = []
    for name in EXPECTED_SIDO:
        v = by_name[name]
        row = {"region": name}
        for key, idx in COL_INDEX.items():
            row[key] = v[idx]
        out_rows.append(row)

    payload = {"meta": META, "rows": out_rows}
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"[OK] 합산 검증 통과 (17개 시도 행별 + 열별). {len(out_rows)}개 시도 추출.")
    print(f"[OK] 생성: {OUT_PATH}")
    print(f"[OK] 전체 특수교육대상자: {by_name['전체'][COL_INDEX['totalSpecialEducationStudents']]:,}명")


if __name__ == "__main__":
    main()
