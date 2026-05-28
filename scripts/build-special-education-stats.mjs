#!/usr/bin/env node
/**
 * 교육부_특수교육통계 CSV → public/data/special_education_statistics.json 변환 스크립트.
 *
 * 용도:
 * - 2025 PDF는 scripts/extract-special-education-pdf.py 로 추출한다.
 * - 본 스크립트는 다른 연도 갱신 / 수기 입력 CSV를 JSON으로 변환하기 위한 보조 도구다.
 *
 * 사용법:
 *   node scripts/build-special-education-stats.mjs
 *   data/raw/special_education_statistics/*.csv 중 최신 파일을 입력으로 사용
 *
 * 정직성 원칙:
 * - 숫자를 임의로 만들지 않는다. CSV 셀 값만 사용한다.
 * - 입력 파일이 없거나 필수 컬럼이 없으면 JSON을 만들지 않고 안내 후 종료한다.
 * - 천단위 콤마 제거, 지역명 trim, "-"/빈칸은 0으로 처리.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";

const RAW_DIR = join("data", "raw", "special_education_statistics");
const OUT_PATH = join("public", "data", "special_education_statistics.json");

const NUMERIC_COLUMNS = [
  "specialSchoolCount",
  "specialSchoolClassCount",
  "specialSchoolStudentCount",
  "specialClassSchoolCount",
  "specialClassCount",
  "specialClassStudentCount",
  "inclusiveClassSchoolCount",
  "inclusiveClassCount",
  "inclusiveClassStudentCount",
  "specialEducationCenterInfantCount",
  "totalSpecialEducationStudents",
];

const REQUIRED_COLUMNS = ["region", ...NUMERIC_COLUMNS];

const HEADER_ALIASES = {
  "시도": "region",
  "시·도": "region",
  "시도교육청": "region",
  "특수학교수": "specialSchoolCount",
  "특수학교학급수": "specialSchoolClassCount",
  "특수학교학생수": "specialSchoolStudentCount",
  "특수학급학교수": "specialClassSchoolCount",
  "특수학급수": "specialClassCount",
  "특수학급학생수": "specialClassStudentCount",
  "일반학급학교수": "inclusiveClassSchoolCount",
  "일반학급수": "inclusiveClassCount",
  "일반학급학생수": "inclusiveClassStudentCount",
  "장애영아수": "specialEducationCenterInfantCount",
  "특수교육대상자수": "totalSpecialEducationStudents",
  "계": "totalSpecialEducationStudents",
};

const META = {
  title: "교육부_특수교육통계",
  provider: "교육부",
  year: 2025,
  surveyDate: "2025-04-01",
  sourceUrl: "https://www.data.go.kr/data/15051018/fileData.do",
  license: "공공저작물 출처표시 제1유형",
  sourceDocument: "2025 특수교육통계 — Ⅰ-1. 2025년 특수교육 주요 현황 (시·도별 개황)",
  note: "지역별 수요·자원 지표는 2025 특수교육통계 기반이며, 학생 맞춤 추천 예시는 서비스 흐름 검증을 위한 시연용 데이터입니다.",
};

function fail(msg, code = 1) {
  console.error(`[ERROR] ${msg}`);
  process.exit(code);
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toInt(token) {
  const s = String(token).trim().replace(/,/g, "");
  if (s === "" || s === "-" || s === "–" || s === "—") return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) fail(`숫자로 변환할 수 없는 값: "${token}"`);
  return n;
}

function findCsv() {
  if (!existsSync(RAW_DIR)) {
    fail(
      `원천 폴더 없음: ${RAW_DIR}\n` +
        `        교육부_특수교육통계 CSV를 위 폴더에 넣은 뒤 다시 실행하세요.\n` +
        `        출처: ${META.sourceUrl}`,
      2,
    );
  }

  const csvs = readdirSync(RAW_DIR)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .sort();

  if (csvs.length === 0) {
    fail(
      `CSV 없음: ${RAW_DIR}/*.csv\n` +
        `        2025 PDF는 'python scripts/extract-special-education-pdf.py'를 사용하세요.\n` +
        `        수기/다른 연도 CSV는 위 폴더에 넣고 다시 실행하세요.`,
      2,
    );
  }

  return join(RAW_DIR, csvs[csvs.length - 1]);
}

function main() {
  const csvPath = findCsv();
  const raw = readFileSync(csvPath, "utf-8").replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) fail(`데이터 행이 없습니다: ${csvPath}`);

  const rawHeader = parseCsvLine(lines[0]);
  const header = rawHeader.map((h) => HEADER_ALIASES[h] ?? h);

  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    fail(
      `필수 컬럼 누락: ${missing.join(", ")}\n` +
        `        헤더에 ${REQUIRED_COLUMNS.join(", ")} 가 모두 있어야 합니다.`,
      3,
    );
  }

  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const region = (cells[idx.region] ?? "").trim();

    if (region === "" || region === "전체" || region === "계") continue;

    const row = { region };
    for (const col of NUMERIC_COLUMNS) row[col] = toInt(cells[idx[col]]);
    rows.push(row);
  }

  if (rows.length === 0) fail("시·도 데이터 행을 찾지 못했습니다.");

  let mismatch = 0;
  for (const r of rows) {
    const sum =
      r.specialSchoolStudentCount +
      r.specialClassStudentCount +
      r.inclusiveClassStudentCount +
      r.specialEducationCenterInfantCount;

    if (sum !== r.totalSpecialEducationStudents) {
      mismatch++;
      console.warn(
        `[WARN] 합산 불일치: ${r.region} 합=${sum} 계=${r.totalSpecialEducationStudents} (입력 CSV 확인 필요)`,
      );
    }
  }

  const payload = { meta: { ...META, extractedFrom: csvPath }, rows };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf-8");

  console.log(
    `[OK] ${rows.length}개 시·도 변환 완료 → ${OUT_PATH}` +
      (mismatch > 0 ? ` (합산 불일치 ${mismatch}건 — CSV 확인 권장)` : " (합산 검증 통과)"),
  );
}

main();
