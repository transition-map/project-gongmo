"""전환교육 공백 분석 데이터 전처리 스크립트.

가정 입력:
  data/raw/transition_support.csv  (UTF-8)
출력:
  src/data/regions.json

원자료 컬럼 예시:
  year, region, student_demand, program_count, agency_count,
  accessibility_score, counseling_support_score, career_linkage_score

주의:
  - 본 스크립트의 산식(공백지수, 추세위험도, 공백 유형 분류 기준)은
    "프로토타입용 예시 산식"입니다.
  - 실제 서비스 적용 시 교육청, 특수교육 전문가, 데이터 전문가의
    검토를 거쳐 산식·임계값·가중치를 보정해야 합니다.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

# ---------- 경로 설정 -------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_CSV = PROJECT_ROOT / "data" / "raw" / "transition_support.csv"
OUTPUT_JSON = PROJECT_ROOT / "src" / "data" / "regions.json"

# ---------- 상수 ------------------------------------------------------------
NUMERIC_COLUMNS = [
    "student_demand",
    "program_count",
    "agency_count",
    "accessibility_score",
    "counseling_support_score",
    "career_linkage_score",
]

# 공백지수 산식의 가중치 (예시). 실제 가중치는 전문가 검토 필요.
GAP_WEIGHTS = {
    "program": 0.30,
    "agency": 0.20,
    "accessibility": 0.20,
    "counseling": 0.15,
    "career_linkage": 0.15,
}


# ---------- 함수 ------------------------------------------------------------
def standardize_region_name(region: str) -> str:
    """지역명 표기를 표준화한다.

    예: '서울A권역', '서울 A 권역' -> '서울 A권역'
    """
    if not isinstance(region, str):
        return ""
    cleaned = region.strip().replace("  ", " ")
    cleaned = cleaned.replace("권 역", "권역")
    if "권역" in cleaned and " " not in cleaned:
        # '서울A권역' -> '서울 A권역'
        for i, ch in enumerate(cleaned):
            if ch.isalpha() and ord(ch) < 128:
                cleaned = cleaned[:i] + " " + cleaned[i:]
                break
    return cleaned


def normalize_series(series: pd.Series, reverse: bool = False) -> pd.Series:
    """시리즈를 0~100 범위로 정규화한다.

    reverse=True 인 경우 값이 클수록 부족도가 큼을 의미한다.
    """
    s = series.astype(float)
    if s.max() == s.min():
        return pd.Series([50.0] * len(s), index=s.index)
    norm = (s - s.min()) / (s.max() - s.min()) * 100
    if reverse:
        norm = 100 - norm
    return norm


def calculate_current_gap_index(current_df: pd.DataFrame) -> pd.Series:
    """현재 기준 데이터로 공백지수(0~100)를 계산한다.

    - 학생 수요 대비 자원 비율, 접근성, 상담지원, 진로연계 점수를 결합.
    - 값이 클수록 공백이 큰 상태.
    """
    program_per_demand = current_df["program_count"] / current_df["student_demand"]
    agency_per_demand = current_df["agency_count"] / current_df["student_demand"]

    # 자원 비율은 클수록 공백이 작음 -> reverse=True
    program_gap = normalize_series(program_per_demand, reverse=True)
    agency_gap = normalize_series(agency_per_demand, reverse=True)

    # 점수형 컬럼은 클수록 공백이 작음 -> reverse=True
    accessibility_gap = normalize_series(
        current_df["accessibility_score"], reverse=True
    )
    counseling_gap = normalize_series(
        current_df["counseling_support_score"], reverse=True
    )
    career_gap = normalize_series(
        current_df["career_linkage_score"], reverse=True
    )

    gap = (
        program_gap * GAP_WEIGHTS["program"]
        + agency_gap * GAP_WEIGHTS["agency"]
        + accessibility_gap * GAP_WEIGHTS["accessibility"]
        + counseling_gap * GAP_WEIGHTS["counseling"]
        + career_gap * GAP_WEIGHTS["career_linkage"]
    )
    return gap.round(0)


def calculate_support_change(region_df: pd.DataFrame) -> float:
    """최근 5년(또는 가용 연도) 자원량 변화율(%)을 계산한다."""
    region_df = region_df.sort_values("year")
    first = region_df.iloc[0]
    last = region_df.iloc[-1]

    base = (
        first["program_count"]
        + first["agency_count"]
        + first["accessibility_score"] / 10
    )
    end = (
        last["program_count"]
        + last["agency_count"]
        + last["accessibility_score"] / 10
    )

    if base == 0:
        return 0.0
    return round((end - base) / base * 100, 1)


def calculate_trend_risk_score(support_change: float) -> int:
    """추세위험도(0~100). 자원이 감소할수록 큰 값."""
    # -50% 이하 감소 -> 90, 0% 변화 -> 50, +50% 이상 증가 -> 10
    score = 50 - support_change
    return int(max(0, min(100, score)))


def classify_gap_type(row: pd.Series) -> str:
    """현재 기준 점수에 따라 공백 유형을 분류한다 (예시 규칙)."""
    candidates = {
        "프로그램 부족형": -row["program_count"],
        "기관 부족형": -row["agency_count"],
        "접근성 취약형": -row["accessibility_score"],
        "상담지원 부족형": -row["counseling_support_score"],
        "진로연계 약화형": -row["career_linkage_score"],
    }
    # "가장 부족한" 항목 (값이 가장 작아 음수가 가장 크게 변환된 항목) 선택
    return max(candidates, key=candidates.get)


def build_region_json(df: pd.DataFrame) -> list[dict]:
    """전처리된 데이터프레임을 regions.json 구조로 변환한다."""
    if df.empty:
        return []

    current_year = int(df["year"].max())
    output: list[dict] = []

    current_df_all = df[df["year"] == current_year].copy()
    current_df_all["__gap_index"] = calculate_current_gap_index(current_df_all)

    for region, region_df in df.groupby("region"):
        region_df = region_df.sort_values("year")

        yearly_support = [
            {
                "year": int(r.year),
                "programCount": int(r.program_count),
                "agencyCount": int(r.agency_count),
                "accessibilityScore": int(r.accessibility_score),
                "careerLinkageScore": int(r.career_linkage_score),
                "counselingSupportScore": int(r.counseling_support_score),
            }
            for r in region_df.itertuples(index=False)
        ]

        current_row = current_df_all[current_df_all["region"] == region].iloc[0]
        gap_index = int(current_row["__gap_index"])
        support_change = calculate_support_change(region_df)
        trend_risk = calculate_trend_risk_score(support_change)
        gap_type = classify_gap_type(current_row)

        main_issue = (
            f"최근 {len(yearly_support)}년 자원량 변화율 {support_change:+.1f}%, "
            f"현재 공백 유형은 '{gap_type}'으로 분류됩니다 (예시 산식)."
        )
        policy_use = (
            "교육청은 해당 권역의 자원 공급량과 추세를 기반으로 "
            "정책 우선순위를 검토할 수 있습니다."
        )
        teacher_use = (
            "교사는 현재 기준 추천 가능 자원과 인접 권역·온라인 자원을 함께 안내할 수 있습니다."
        )

        output.append(
            {
                "region": region,
                "currentYear": current_year,
                "yearlySupport": yearly_support,
                "currentGapIndex": gap_index,
                "trendRiskScore": trend_risk,
                "supportChange": support_change,
                "gapType": gap_type,
                "mainIssue": main_issue,
                "policyUse": policy_use,
                "teacherUse": teacher_use,
            }
        )

    return output


def main() -> int:
    if not RAW_CSV.exists():
        print(f"[preprocess] 원자료 파일을 찾을 수 없습니다: {RAW_CSV}")
        print(
            "[preprocess] data/raw/transition_support.csv 파일을 준비한 뒤 다시 실행하세요."
        )
        return 1

    # 1. 원자료 CSV 읽기
    df = pd.read_csv(RAW_CSV, encoding="utf-8")

    # 2. 지역명 표준화
    df["region"] = df["region"].apply(standardize_region_name)

    # 3. 숫자형 컬럼 변환
    for col in NUMERIC_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # 4. 결측치 처리: 지역·연도별 평균으로 보정한 뒤 그래도 남는 결측은 0
    df[NUMERIC_COLUMNS] = (
        df.groupby("region")[NUMERIC_COLUMNS]
        .transform(lambda s: s.fillna(s.mean()))
        .fillna(0)
    )

    # 5~9. 연도별 데이터 + 현재 기준 데이터로부터 지표 계산
    output = build_region_json(df)

    # 10. regions.json 저장
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(
        f"[preprocess] {len(output)}개 지역 데이터를 {OUTPUT_JSON} 에 저장했습니다."
    )
    print("[preprocess] 본 스크립트의 산식은 프로토타입용 예시이며,")
    print("[preprocess] 실제 서비스 적용 시 교육청·전문가 검토가 필요합니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
