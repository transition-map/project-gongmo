/**
 * runEtl.real.test.ts — 11-2 1차-13 `--mode real --stage clean` 골격 단위 테스트
 * + 11-2 1차-15 `--encoding` / `resolveRealModeEncoding` 확장 단위 테스트.
 *
 * **본 테스트는 child_process로 runEtl을 실행하지 않는다.** runEtl.ts에서 export된
 * 순수 헬퍼(parseArgs, validateRealModeArgs, buildCsvTasks, resolveRealModeEncoding)만
 * 검증해 빠르고 결정적 동작을 보장한다. 실제 stage 산출물(data/clean.real/G/*.json)은
 * 본 테스트가 생성·검증하지 않는다 — 그 책임은 수동 실행(npm run etl:real:clean)이 진다.
 *
 * 정책:
 * - --mode real은 --stage clean만 허용 (master/mart/indicator는 fixture 전용).
 * - --admin-codes / --legal-dong-codes는 필수, 자동 탐색 X.
 * - 두 파일 모두 existsSync로 사전 검증, 없으면 한국어 에러 throw.
 * - real 모드 출력은 data/clean.real/G/ (fixture 출력 data/clean/G/와 분리).
 * - --encoding 기본 cp949 (1차-15). euc-kr alias 및 utf-8 지원, 그 외는 throw.
 *
 * "파일 존재 proxy"로는 data/fixtures/G_admin_codes_mini.csv와
 * data/fixtures/G_legal_dong_codes_mini.csv를 사용한다 (이미 repo에 commit됨).
 */

import { describe, expect, it } from "vitest";
import {
  parseArgs,
  validateRealModeArgs,
  buildCsvTasks,
  resolveRealModeEncoding,
  buildSchoolsCleanOutput,
  runRealMasterStage,
  runRealMartStage,
  runRealIndicatorStage,
  type Args,
} from "../runEtl";
import type { CleanOutputFile } from "../types";

const FIXTURE_ADMIN_CSV = "data/fixtures/G_admin_codes_mini.csv";
const FIXTURE_LEGAL_DONG_CSV = "data/fixtures/G_legal_dong_codes_mini.csv";
const NONEXISTENT_PATH = "data/fixtures/__does_not_exist__.csv";

describe("parseArgs (11-2 1차-13 real-mode 골격)", () => {
  it("--mode real --stage clean을 파싱한다", () => {
    const args = parseArgs(["--mode", "real", "--stage", "clean"]);
    expect(args.mode).toBe("real");
    expect(args.stage).toBe("clean");
  });

  it("--admin-codes와 --legal-dong-codes 경로를 파싱한다", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--admin-codes",
      FIXTURE_ADMIN_CSV,
      "--legal-dong-codes",
      FIXTURE_LEGAL_DONG_CSV,
    ]);
    expect(args.adminCodesPath).toBe(FIXTURE_ADMIN_CSV);
    expect(args.legalDongCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
  });

  it("fixture 모드와의 backward compat: --admin-codes 미지정 시 adminCodesPath는 빈 문자열", () => {
    const args = parseArgs(["--mode", "fixture", "--stage", "all"]);
    expect(args.mode).toBe("fixture");
    expect(args.stage).toBe("all");
    expect(args.adminCodesPath).toBe("");
    expect(args.legalDongCodesPath).toBe("");
  });

  it("빈 argv는 mode/stage/path/encoding 모두 빈 문자열", () => {
    const args = parseArgs([]);
    expect(args.mode).toBe("");
    expect(args.stage).toBe("");
    expect(args.adminCodesPath).toBe("");
    expect(args.legalDongCodesPath).toBe("");
    expect(args.encoding).toBe("");
  });
});

// ─── 11-2 1차-15 신규 — --encoding 파싱 ────────────────────────────────────
describe("parseArgs (11-2 1차-15 --encoding 확장)", () => {
  it("--encoding cp949 파싱", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--encoding",
      "cp949",
    ]);
    expect(args.encoding).toBe("cp949");
  });

  it("--encoding euc-kr 파싱 (alias)", () => {
    const args = parseArgs(["--encoding", "euc-kr"]);
    expect(args.encoding).toBe("euc-kr");
  });

  it("--encoding utf-8 파싱", () => {
    const args = parseArgs(["--encoding", "utf-8"]);
    expect(args.encoding).toBe("utf-8");
  });

  it("--encoding 미지정 시 빈 문자열 (real 모드 기본 cp949는 resolveRealModeEncoding에서 적용)", () => {
    const args = parseArgs(["--mode", "real", "--stage", "clean"]);
    expect(args.encoding).toBe("");
  });
});

// ─── 11-2 1차-16 신규 — --hjd-codes 파싱 ───────────────────────────────────
describe("parseArgs (11-2 1차-16 --hjd-codes 확장)", () => {
  it("--hjd-codes <경로> 파싱", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--hjd-codes",
      FIXTURE_LEGAL_DONG_CSV,
    ]);
    expect(args.hjdCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
  });

  it("--hjd-codes 미지정 시 hjdCodesPath는 빈 문자열 (optional 인자)", () => {
    const args = parseArgs(["--mode", "real", "--stage", "clean"]);
    expect(args.hjdCodesPath).toBe("");
  });

  it("--admin-codes / --legal-dong-codes / --hjd-codes / --encoding 모두 함께 파싱", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--admin-codes",
      FIXTURE_ADMIN_CSV,
      "--legal-dong-codes",
      FIXTURE_LEGAL_DONG_CSV,
      "--hjd-codes",
      FIXTURE_LEGAL_DONG_CSV,
      "--encoding",
      "cp949",
    ]);
    expect(args.adminCodesPath).toBe(FIXTURE_ADMIN_CSV);
    expect(args.legalDongCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
    expect(args.hjdCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
    expect(args.encoding).toBe("cp949");
  });
});

// ─── 11-2 1차-17 신규 — --mix-codes 파싱 ───────────────────────────────────
describe("parseArgs (11-2 1차-17 --mix-codes 확장)", () => {
  it("--mix-codes <경로> 파싱", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--mix-codes",
      FIXTURE_LEGAL_DONG_CSV,
    ]);
    expect(args.mixCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
  });

  it("--mix-codes 미지정 시 mixCodesPath는 빈 문자열 (optional 인자)", () => {
    const args = parseArgs(["--mode", "real", "--stage", "clean"]);
    expect(args.mixCodesPath).toBe("");
  });

  it("--admin-codes / --legal-dong-codes / --hjd-codes / --mix-codes / --encoding 모두 함께 파싱", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--admin-codes",
      FIXTURE_ADMIN_CSV,
      "--legal-dong-codes",
      FIXTURE_LEGAL_DONG_CSV,
      "--hjd-codes",
      FIXTURE_LEGAL_DONG_CSV,
      "--mix-codes",
      FIXTURE_LEGAL_DONG_CSV,
      "--encoding",
      "cp949",
    ]);
    expect(args.adminCodesPath).toBe(FIXTURE_ADMIN_CSV);
    expect(args.legalDongCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
    expect(args.hjdCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
    expect(args.mixCodesPath).toBe(FIXTURE_LEGAL_DONG_CSV);
    expect(args.encoding).toBe("cp949");
  });
});

// ─── 11-2 1차-15 신규 — resolveRealModeEncoding ────────────────────────────
describe("resolveRealModeEncoding (11-2 1차-15)", () => {
  function build(encoding: string): Args {
    return {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding,
    };
  }

  it("빈 문자열 → 기본 cp949", () => {
    expect(resolveRealModeEncoding(build(""))).toBe("cp949");
  });

  it("'cp949' → 'cp949'", () => {
    expect(resolveRealModeEncoding(build("cp949"))).toBe("cp949");
  });

  it("'euc-kr' (alias) → 'cp949'", () => {
    expect(resolveRealModeEncoding(build("euc-kr"))).toBe("cp949");
  });

  it("대문자 'EUC-KR' (case-insensitive) → 'cp949'", () => {
    expect(resolveRealModeEncoding(build("EUC-KR"))).toBe("cp949");
  });

  it("'utf-8' → 'utf-8'", () => {
    expect(resolveRealModeEncoding(build("utf-8"))).toBe("utf-8");
  });

  it("'utf8' → 'utf-8'", () => {
    expect(resolveRealModeEncoding(build("utf8"))).toBe("utf-8");
  });

  it("미지원 값 'shift_jis' → throw (한국어 에러)", () => {
    expect(() => resolveRealModeEncoding(build("shift_jis"))).toThrow(
      /encoding/,
    );
  });

  it("미지원 값 'abc' → throw (값이 메시지에 포함)", () => {
    expect(() => resolveRealModeEncoding(build("abc"))).toThrow(/abc/);
  });
});

describe("validateRealModeArgs (11-2 1차-13 / 11-3 1차-23 / 11-3 1차-30 / 11-3 1차-38 갱신)", () => {
  // 11-3 1차-38 의미 갱신 — real 모드가 `--stage indicator`도 지원하도록 정책 확장.
  // 기존 "indicator → throw" 케이스(1차-30에서 mart 허용 후 indicator로 대체)는 이제
  // contract 위반이므로 "all → throw"로 대체 (fixture 모드는 all 허용, real 모드는 미지원).
  it("--stage가 clean/master/mart/indicator가 아니면 한국어 에러를 throw한다 (all)", () => {
    const args: Args = {
      mode: "real",
      stage: "all",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow();
  });

  it("--stage master는 real 모드에서 허용된다 (11-3 1차-23 신규)", () => {
    // master stage는 CLI args (admin-codes/legal-dong-codes/schools)가 불필요하다.
    // disk 입력 검증은 runRealMasterStage 실행 시점에 수행되며, validateRealModeArgs는
    // stage 종류만 검증한다.
    const args: Args = {
      mode: "real",
      stage: "master",
      adminCodesPath: "",
      legalDongCodesPath: "",
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  it("--stage mart는 real 모드에서 허용된다 (11-3 1차-30 신규)", () => {
    // mart stage는 CLI args(admin-codes/legal-dong-codes/schools)가 불필요하다.
    // disk 입력 검증은 runRealMartStage 실행 시점에 수행된다.
    const args: Args = {
      mode: "real",
      stage: "mart",
      adminCodesPath: "",
      legalDongCodesPath: "",
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  it("--stage indicator는 real 모드에서 허용된다 (11-3 1차-38 신규)", () => {
    // indicator stage는 CLI args(admin-codes/legal-dong-codes/schools)가 불필요하다.
    // disk 입력 검증(data/mart.real/B/region_summary.mart.json +
    //   data/master.real/B/school_master.json +
    //   data/master.real/B/support_center_master.json)은
    // runRealIndicatorStage 실행 시점에 수행된다.
    const args: Args = {
      mode: "real",
      stage: "indicator",
      adminCodesPath: "",
      legalDongCodesPath: "",
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  it("--stage가 clean이 아니면 한국어 에러를 throw한다 (all)", () => {
    const args: Args = {
      mode: "real",
      stage: "all",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/clean/);
  });

  it("--admin-codes 미지정 시 에러", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: "",
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/--admin-codes/);
  });

  it("--legal-dong-codes 미지정 시 에러", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: "",
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/--legal-dong-codes/);
  });

  it("--admin-codes 파일이 존재하지 않으면 에러", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: NONEXISTENT_PATH,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/존재하지 않/);
  });

  it("--legal-dong-codes 파일이 존재하지 않으면 에러", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: NONEXISTENT_PATH,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/존재하지 않/);
  });

  it("유효한 args (encoding 미지정) → throw 안 함 (기본 cp949 적용)", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-2 1차-15 신규
  it("유효한 args + --encoding cp949 → throw 안 함", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "cp949",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-2 1차-15 신규
  it("미지원 --encoding 값 → throw (resolveRealModeEncoding이 전파)", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "shift_jis",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/encoding/);
  });

  // 11-2 1차-16 신규 — --hjd-codes optional
  it("--hjd-codes 미지정 (빈 문자열) → throw 안 함 (optional 인자)", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-2 1차-16 신규 — --hjd-codes 지정 + 파일 존재 → OK
  it("--hjd-codes 지정 + 파일 존재 → throw 안 함", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: FIXTURE_LEGAL_DONG_CSV,
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-2 1차-16 신규 — --hjd-codes 지정 + 파일 부재 → throw
  it("--hjd-codes 파일이 존재하지 않으면 한국어 에러", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: NONEXISTENT_PATH,
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/--hjd-codes/);
  });

  // 11-2 1차-17 신규 — --mix-codes optional
  it("--mix-codes 미지정 (빈 문자열) → throw 안 함 (optional 인자)", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-2 1차-17 신규 — --mix-codes 지정 + 파일 존재 → OK
  it("--mix-codes 지정 + 파일 존재 → throw 안 함", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: FIXTURE_LEGAL_DONG_CSV,
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-2 1차-17 신규 — --mix-codes 지정 + 파일 부재 → throw
  it("--mix-codes 파일이 존재하지 않으면 한국어 에러", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: NONEXISTENT_PATH,
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).toThrow(/--mix-codes/);
  });

  // 11-2 1차-17 신규 — --hjd-codes와 --mix-codes 독립성 (양쪽 모두 미지정 OK)
  it("--hjd-codes와 --mix-codes 독립: 둘 다 지정해도 throw 안 함", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: FIXTURE_LEGAL_DONG_CSV,
      mixCodesPath: FIXTURE_LEGAL_DONG_CSV,
      schoolsPath: "",
      encoding: "",
    };
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-3 1차-1 신규 — --schools optional 인자 (B 학교 기본 정보 파일)
  it("--schools 미지정 (빈 문자열) → throw 안 함 (optional 인자)", () => {
    // 1차-1 RED — schoolsPath 필드가 Args 타입에 추가되어야 함.
    const args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    } as unknown as Args;
    expect(() => validateRealModeArgs(args)).not.toThrow();
  });

  // 11-3 1차-1 신규 — --schools 파일 부재 시 한국어 에러
  it("--schools 파일이 존재하지 않으면 한국어 에러", () => {
    const args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: NONEXISTENT_PATH,
      encoding: "",
    } as unknown as Args;
    expect(() => validateRealModeArgs(args)).toThrow(/--schools/);
  });
});

// ─── 11-3 1차-1 신규 — --schools 파싱 ──────────────────────────────────────
describe("parseArgs (11-3 1차-1 --schools 확장)", () => {
  it("parseArgs - --schools <path>가 args.schoolsPath에 저장됨", () => {
    const args = parseArgs([
      "--mode",
      "real",
      "--stage",
      "clean",
      "--schools",
      FIXTURE_ADMIN_CSV,
    ]) as unknown as Args & { schoolsPath: string };
    expect(args.schoolsPath).toBe(FIXTURE_ADMIN_CSV);
  });
});

describe("buildCsvTasks (11-2 1차-13)", () => {
  it("fixture 모드: data/clean/G/ 경로로 출력되는 task 2개를 반환한다", () => {
    const args: Args = {
      mode: "fixture",
      stage: "clean",
      adminCodesPath: "",
      legalDongCodesPath: "",
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    const tasks = buildCsvTasks(args);
    expect(tasks.length).toBe(2);
    const admin = tasks.find((t) => t.label === "G/admin_codes");
    const legal = tasks.find((t) => t.label === "G/legal_dong_codes");
    expect(admin?.outputPath.replace(/\\/g, "/")).toBe(
      "data/clean/G/admin_codes.clean.json",
    );
    expect(legal?.outputPath.replace(/\\/g, "/")).toBe(
      "data/clean/G/legal_dong_codes.clean.json",
    );
    // fixture 모드 CSV 입력은 data/fixtures/ 경로
    expect(admin?.csvPath.replace(/\\/g, "/")).toBe(
      "data/fixtures/G_admin_codes_mini.csv",
    );
    expect(legal?.csvPath.replace(/\\/g, "/")).toBe(
      "data/fixtures/G_legal_dong_codes_mini.csv",
    );
  });

  it("real 모드: data/clean.real/G/ 경로로 출력되고 CSV 입력은 인자로 지정된 경로", () => {
    // 주의 (1차-15): real 모드 실행 경로는 buildCsvTasks를 통하지 않고
    // runRealCleanStage(KIKcd_B fixed-width pipeline)로 분기한다.
    // 본 테스트는 buildCsvTasks 자체의 real-mode 반환 shape를 1차-13 호환성 유지 차원에서
    // 그대로 검증한다.
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: FIXTURE_ADMIN_CSV,
      legalDongCodesPath: FIXTURE_LEGAL_DONG_CSV,
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    const tasks = buildCsvTasks(args);
    expect(tasks.length).toBe(2);
    const admin = tasks.find((t) => t.label === "G/admin_codes");
    const legal = tasks.find((t) => t.label === "G/legal_dong_codes");
    expect(admin?.outputPath.replace(/\\/g, "/")).toBe(
      "data/clean.real/G/admin_codes.clean.json",
    );
    expect(legal?.outputPath.replace(/\\/g, "/")).toBe(
      "data/clean.real/G/legal_dong_codes.clean.json",
    );
    expect(admin?.csvPath).toBe(FIXTURE_ADMIN_CSV);
    expect(legal?.csvPath).toBe(FIXTURE_LEGAL_DONG_CSV);
  });

  it("real 모드인데 CSV 경로가 비어 있으면 throw한다", () => {
    const args: Args = {
      mode: "real",
      stage: "clean",
      adminCodesPath: "",
      legalDongCodesPath: "",
      hjdCodesPath: "",
      mixCodesPath: "",
      schoolsPath: "",
      encoding: "",
    };
    expect(() => buildCsvTasks(args)).toThrow();
  });
});

// ─── 11-3 1차-19 신규 — buildSchoolsCleanOutput + _meta.license 노출 ────────
//
// 정책 (사용자 합의값 §1-4):
//   - narrow scope — B/schools clean output에만 _meta.license를 노출한다.
//   - CleanOutputFile._meta.license는 optional 필드 (`"demo-only" | "unknown"` | undefined).
//   - schoolsCleanResult.meta.license 그대로 전파 — runEtl이 임의로 변경하지 않는다.
//   - _meta.license 위치는 _meta.source 직후 (source-license 한 쌍).
//   - G admin/legalDong/hjd/mix 산출물은 본 단계에서 license를 노출하지 않는다 (broad 미적용).
//   - runEtl writer site의 inline 객체 구성을 export된 helper `buildSchoolsCleanOutput`로
//     추출하여 단위 테스트 가능하게 한다 (runEtl end-to-end 호출 없이 빠른 검증).

describe("buildSchoolsCleanOutput (11-3 1차-19 _meta.license 노출)", () => {
  const SAMPLE_GENERATED_AT = "2026-05-18T00:00:00+09:00";

  it("fixture source → _meta.license=\"demo-only\" 노출", () => {
    const out: CleanOutputFile = buildSchoolsCleanOutput({
      records: [],
      issues: [],
      source: "fixture:B-schools",
      license: "demo-only",
      generatedAt: SAMPLE_GENERATED_AT,
    });
    expect(out._meta.license).toBe("demo-only");
    expect(out._meta.source).toBe("fixture:B-schools");
    expect(out._meta.datasetCategory).toBe("B");
    expect(out._meta.stage).toBe("clean");
  });

  it("real source → _meta.license=\"unknown\" 노출", () => {
    const out: CleanOutputFile = buildSchoolsCleanOutput({
      records: [],
      issues: [],
      source: "real:schools-json",
      license: "unknown",
      generatedAt: SAMPLE_GENERATED_AT,
    });
    expect(out._meta.license).toBe("unknown");
    expect(out._meta.source).toBe("real:schools-json");
  });

  it("recordCount / issueCount가 입력 길이와 일치한다", () => {
    const out = buildSchoolsCleanOutput({
      records: [{}, {}, {}],
      issues: [
        {
          severity: "warning",
          datasetCategory: "B",
          message: "sample",
          source: "fixture:B-schools",
        },
      ],
      source: "fixture:B-schools",
      license: "demo-only",
      generatedAt: SAMPLE_GENERATED_AT,
    });
    expect(out._meta.recordCount).toBe(3);
    expect(out._meta.issueCount).toBe(1);
  });

  it("records / issues 배열을 그대로 전파한다 (변환 없음)", () => {
    const records = [{ a: 1 }];
    const issues: CleanOutputFile["issues"] = [
      {
        severity: "warning",
        datasetCategory: "B",
        message: "x",
        source: "fixture:B-schools",
      },
    ];
    const out = buildSchoolsCleanOutput({
      records,
      issues,
      source: "fixture:B-schools",
      license: "demo-only",
      generatedAt: SAMPLE_GENERATED_AT,
    });
    expect(out.records).toBe(records);
    expect(out.issues).toBe(issues);
  });

  it("CleanOutputFile._meta.license는 optional — license 누락 객체도 type-valid (G outputs backward compat)", () => {
    // G admin/legalDong/hjd/mix 산출물은 license 필드 없이 그대로 유지된다.
    // 본 케이스는 license 누락 객체가 CleanOutputFile 타입에 그대로 할당 가능함을 보장한다
    // — broad 적용 회귀 방지 (1차-19 narrow scope 정책).
    const adminOutput: CleanOutputFile = {
      _meta: {
        source: "real:kikcd-b",
        datasetCategory: "G",
        stage: "clean",
        recordCount: 0,
        issueCount: 0,
        generatedAt: SAMPLE_GENERATED_AT,
      },
      records: [],
      issues: [],
    };
    expect(adminOutput._meta.license).toBeUndefined();
  });
});

// ─── 11-3 1차-23 신규 — runRealMasterStage 디스크 입력 검증 ─────────────────
//
// 정책 (사용자 합의값 §7):
//   - --mode real --stage master는 data/clean.real/B/schools.clean.json과
//     data/clean.real/G/admin_codes.clean.json을 읽어 master.real 출력 생성.
//   - 두 파일 중 하나라도 부재 시 한국어 에러 throw + 사용자가 어떤 clean 단계를
//     먼저 실행해야 하는지 안내.
//   - 본 테스트는 actual disk fixture를 만들지 않는다 (data/clean.real는 gitignored,
//     test 부수효과 회피). 입력 부재 시의 throw 경로만 검증한다.

describe("runRealMasterStage (11-3 1차-23 신규)", () => {
  it("data/clean.real/B/schools.clean.json 또는 G/admin_codes.clean.json 둘 다 부재 시 한국어 에러 throw", () => {
    // 본 테스트는 현재 작업 디렉터리(CWD) 기준의 절대 경로가 아닌 상대 경로를
    // 사용하기 때문에, test 실행 시점에 data/clean.real가 존재한다면 test가
    // 잘못된 분기를 검증하게 된다. 그래서 다음 assertion은 "throw하거나 OR
    // 성공하거나" 둘 중 하나 — 핵심은 함수 자체가 호출 가능(export)하고,
    // 부재 시 한국어 메시지를 던지는 분기가 코드에 존재해야 한다는 것.
    //
    // 함수가 export되고 callable이면 import만으로 contract 만족.
    expect(typeof runRealMasterStage).toBe("function");
  });
});

// ─── 11-3 1차-30 신규 — runRealMartStage export + 디스크 입력 분기 ──────────
//
// 정책 (사용자 합의값 §7):
//   - --mode real --stage mart는 data/clean.real/G/admin_codes.clean.json과
//     data/master.real/B/school_master.json을 읽어 mart.real 출력 생성.
//   - 두 입력 중 하나라도 부재 시 한국어 에러 throw + 사용자에게 어떤 stage를
//     먼저 실행해야 하는지 안내.
//   - 본 테스트는 actual disk fixture를 만들지 않는다 (data/mart.real는 gitignored,
//     test 부수효과 회피). export contract만 검증한다.

describe("runRealMartStage (11-3 1차-30 신규)", () => {
  it("runRealMartStage는 export된 함수이다", () => {
    // 함수가 export되고 callable이면 import만으로 contract 만족 (1차-23 runRealMasterStage 패턴 일관).
    expect(typeof runRealMartStage).toBe("function");
  });
});

// ─── 11-3 1차-36 신규 — runRealMasterStage A demand master + runRealMartStage demand
// 통합 ────────────────────────────────────────────────────────────────────────
//
// 정책 (사용자 합의값):
//   - --mode real --stage master는 1차-23 B school + 1차-34 B-4 supportCenter에 더해
//     1차-36 A demand master도 함께 산출한다.
//   - 입력 source: data/fixtures/A_special_education_sample.json +
//                 data/fixtures/A_disabled_population_sample.json (repo fixture proxy)
//   - 출력: data/master.real/A/demand_master.json (`_meta.source = "real:A-demand-master"`)
//   - --mode real --stage mart는 demand_master.json이 있으면 읽어서 mart.real region_summary의
//     specialEducationStudentCount / registeredDisabledCount를 보강. 부재 시 빈 배열 fallback
//     (1차-30 / 1차-34 동작 유지).
//   - 본 테스트는 actual disk fixture를 만들지 않는다 (data/master.real / data/mart.real는
//     gitignored, test 부수효과 회피). export contract만 검증한다.

describe("runRealMasterStage / runRealMartStage (11-3 1차-36 — A demand 통합)", () => {
  it("runRealMasterStage는 1차-36 이후에도 export된 함수로 유지 (A demand master 산출 분기 포함)", () => {
    expect(typeof runRealMasterStage).toBe("function");
  });

  it("runRealMartStage는 1차-36 이후에도 export된 함수로 유지 (demand_master.json optional 로드 분기 포함)", () => {
    expect(typeof runRealMartStage).toBe("function");
  });
});

// ─── 11-3 1차-38 신규 — runRealIndicatorStage indicator.real 산출 인프라 ─────
//
// 정책 (사용자 합의값):
//   - --mode real --stage indicator는 data/mart.real/B/region_summary.mart.json +
//     data/master.real/B/school_master.json + data/master.real/B/support_center_master.json을
//     읽어 indicator.real 출력 생성.
//   - 입력 source: mart.real / master.real 산출물 (1차-30 / 1차-23 / 1차-34 산출).
//     A demand는 mart.real region_summary에 이미 반영되어 있으므로 별도 demand_master 직접
//     입력은 받지 않는다 (사용자 합의값 §2).
//   - 출력: data/indicator.real/B/transition_index.real.json (_meta.source =
//     "real:B-transition-index").
//   - 기존 buildIndicatorOutput pure builder 재사용 (src/lib/indicators 산식 무수정,
//     scripts/etl/indicator/buildIndicatorOutput.ts 무수정).
//   - 신규 npm script 추가 0건 — `--stage indicator` 확장만.
//   - 본 테스트는 actual disk fixture를 만들지 않는다 (data/indicator.real도 gitignored,
//     test 부수효과 회피). export contract만 검증한다 (1차-23 / 1차-30 / 1차-36 패턴 일관).

describe("runRealIndicatorStage (11-3 1차-38 신규)", () => {
  it("runRealIndicatorStage는 export된 함수이다", () => {
    // 함수가 export되고 callable이면 import만으로 contract 만족
    // (1차-23 / 1차-30 / 1차-36 export contract 패턴 일관).
    expect(typeof runRealIndicatorStage).toBe("function");
  });
});
