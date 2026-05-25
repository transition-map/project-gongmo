# 프롬프트 로그 체크포인트 — 2026-05-11

> **임시 체크포인트 문서.** 본 파일은 최종 docs/prompt_log.md로 병합하기 전에
> 작업 흐름을 잃지 않도록 따로 저장한 초안입니다. 원본 prompt_log.md는 별도로
> 유지·갱신되며, 본 체크포인트는 최종 병합 시 참고 자료입니다.

## 1. 작성 목적

- 공공데이터 기반 전환교육 프로토타입 개발 과정에서 **Claude Code**와 **ChatGPT**를 어떻게 활용했는지 기록.
- 발표자료(공모전 PPT) 또는 윤리·검증 페이지(EthicsValidation)에서 "AI 활용 내역"의 근거 자료로 사용.
- **실제 구현에 반영된 지시**(코드/데이터/CI 변경)와 **계획·검토 단계의 지시**(브레인스토밍·아키텍처 합의)를 구분.
- 최종 docs/prompt_log.md 병합 전 **임시 체크포인트**. 단계별 메타(일자/도구/산출물/검증)가 손실되지 않도록 보존.

## 2. 작성 원칙

- 실제 프롬프트 전문이 아니라 **핵심 지시 내용 요약** 중심.
- **Claude Code 작업**은 구현·검증 중심으로 기록 (코드 생성·테스트 추가·CI 보강·문서 정합화 등).
- **ChatGPT 지시**는 기획·검토·프롬프트 설계 보조로 기록 (단계 합의·계획 수립·롤백 의사결정 등).
- 완료된 작업과 후속 예정 작업을 구분.
- **기준연도 2026 정합화는 "완료 / 검증 완료"로 기록** (남은 보정 없음).
- 본 체크포인트가 작성된 시점은 11-1 fixture ETL + CI 품질 게이트 + 기준연도 2026 정합화까지 완료된 상태.

## 3. 프롬프트 로그 표

| 순번 | 단계 | 사용 도구 | 프롬프트 목적 | 주요 지시 내용 요약 | 산출물 | 반영 여부 | 검증 결과 | 비고 |
|------|------|----------|--------------|---------------------|--------|----------|----------|------|
| 1 | A~G 7개 공공데이터 묶음 설계 | ChatGPT (기획) | 데이터 도메인 분류 합의 | 전환교육 자원 단일 도메인 → A(수요)·B(학교)·C(훈련)·D(고용)·E(복지)·F(접근성)·G(표준화/공간) 7개 묶음으로 재정의. DB 테이블명이 아닌 데이터 도메인 분류. 묶음 간 결합은 Mart·Indicator 단계에서만. | CLAUDE.md §3 표 | 확정 | 후속 모든 단계의 베이스 | 시군구를 MVP 기본 단위로 채택 |
| 2 | 전체 개발 로드맵 수립 | ChatGPT (기획) | 단계 3~11+ 정의 | 타입 정의 → mock → service → indicator → 화면 → ETL stub → 테스트 → CI → 실 ETL fixture → 실데이터 연동 순서. 각 단계 산출물·검증 명령 합의. | CLAUDE.md §1 단계별 완료 상태 표 | 확정 | 단계별 일관 진행 가능 | 11-1까지 완료, 11-2는 후속 예정 |
| 3 | 3단계 타입·스키마 정의 | Claude Code (Opus 4.7) | 도메인 타입 13종 분리 | `src/types.ts` 단일 파일 → `src/types/` 13개 파일 분리 (region/school/institution/training/employment/welfare/mobility/indicator/recommendation/api/common/dataQuality/index). RegionRef + 5단계 region 단위 합의. PII 필드 차단. `RecommendationContext` 비식별 타입 도입. | src/types/* (13 파일) | 전면 반영 | tsc/lint 통과 | `DisabilityCategoryBreakdown` 집계 전용으로 추천 제한 사용 금지 명문화 |
| 4 | 4단계 TypeScript mock 데이터 재구성 | Claude Code (Opus 4.7) | 6시군구 demo 시드 | DEMO-SIGUNGU-01~06 (서울 강남/부산 해운대/수원 영통/청주 흥덕/목포/춘천). 도메인별 13개 mock 파일 + _shared.ts 공용 상수. `demo-v0` indicator를 mvp-v1과 구분. | src/data/mocks/* (13 파일) | 전면 반영 | mock import 일관 통과 | `DEMO_BASE_YEAR`, `DEMO_CALCULATED_AT` 등 _shared 단일 출처 |
| 5 | 5단계 service layer + mockAdapter/httpAdapter stub | Claude Code (Opus 4.7) | 데이터 출처 추상화 | 11개 도메인 service + `_adapter`/`_meta` + `setDataAdapter()` 시그니처. mockAdapter는 src/data/mocks 직접 import 유일 위치. httpAdapter는 throw stub. ApiMeta 표준 envelope 합의. | src/services/* (16 파일) | 전면 반영 | serviceLayer.test.ts 통과 | `VITE_DATA_SOURCE`로 어댑터 선택 (mockAdapter 기본) |
| 6 | 6단계 전환교육 지표 계산 모듈 | Claude Code (Opus 4.7) | 산식 mvp-v1 도입 | 정규화·가중평균 helper 7개, 도메인별 compute 함수 6개, transitionGapIndex 통합. INDICATOR_VERSION="mvp-v1". 가중치·임계값을 config.ts 단일 출처로 분리. pure function. | src/lib/indicators/* (5 파일) | 전면 반영 | 산식 단위 테스트 통과 | 산식·가중치는 본 단계 이후 수정 금지 원칙 |
| 7 | 7단계 화면·데이터 연결 | Claude Code (Opus 4.7) | hooks + dashboard adapter | `useRegionList`, `useRegionDashboardData` 도입. service → buildTransitionIndex 호출 → toRegionData로 legacy RegionData 변환. 컴포넌트는 mock JSON 직접 import 0건. | src/hooks/*, src/lib/dashboard/* | 전면 반영 | 화면 정상 렌더 + 단위 테스트 | DEMO_FIXED_CALCULATED_AT으로 화면 결정적 렌더 |
| 8 | selectedRegion 보정과 derived value 전환 | Claude Code (Opus 4.7) + ChatGPT (검토) | `useEffect` setState 제거 | App.tsx의 selectedRegionCode 초기화를 useEffect+setState → `useMemo` derived value 패턴으로 전환. `userSelectedRegionCode` source of truth + service regions 결합. | src/App.tsx | 전면 반영 | `react-hooks/set-state-in-effect` 위반 0건 | lint override 없이 코드 구조로 해결 |
| 9 | 8단계 ETL 인터페이스 스텁 | Claude Code (Opus 4.7) | normalize/pipeline/ingest 스텁 | normalize 6개 도메인 + ingest 7개 도메인 stub throw. IssueCollector 콜백 패턴 도입. ETL_API_KEY_* prefix만 허용, VITE_* 비밀키 금지 명문화. | src/lib/etl/* (11 파일) | 전면 반영 | normalize.test.ts 통과 | 실제 API 호출은 본 단계 X |
| 10 | 9단계 Vitest 테스트 기반 구축 | Claude Code (Opus 4.7) | 안 A 채택 (jsdom 미도입) | Vitest 단독 도입, jsdom·@testing-library/react 미설치. pure function·service·산식·adapter 중심 7파일 132 케이스. mock 분포(6 region / 12 school / 4 welfareCenter 등) 고정. | __tests__/* 7파일 | 전면 반영 | 7 files / 132 tests passed | npm test 표준 추가 |
| 11 | lint 보정 | Claude Code (Opus 4.7) | App.tsx override 제거 | 9단계 임시 `react-hooks/set-state-in-effect` App.tsx override → 코드 구조 개선(8번 참조)으로 해결, override 삭제. lint rule을 임의로 off 하지 않는 원칙 명문화. | eslint.config.js, App.tsx | 전면 반영 | npm run lint 통과 | CLAUDE.md §12-1로 명문화 |
| 12 | 10단계 README/CLAUDE/CI 문서화 | Claude Code (Opus 4.7) | 품질 게이트·CI 도입 | GitHub Actions ci.yml(npm ci → lint → test → build) 도입. README/CLAUDE 합치 (docs/ 폴더 미생성 결정). 표준 검증 절차 3단계 명문화. | .github/workflows/ci.yml, README.md, CLAUDE.md | 전면 반영 | CI green 가능 | secrets/API key 미사용 정책 |
| 13 | 11-1 fixture 기반 clean ETL | Claude Code (Opus 4.7) | offline demo ETL 1차 | `tsx scripts/etl/runEtl.ts --mode fixture --stage clean` 도입. 6개 cleaner(region_codes·geocoding·special_education·disabled_population·school_basic·support_center). FixtureFile envelope. CleanResult<TRecord> generic. IssueCollector 누적. | scripts/etl/clean/*, runEtl.ts, fixtures 6종 | 전면 반영 | clean records=39 issues=7 | mockAdapter 외 추가 외부 호출 0건 |
| 14 | scripts/etl 전용 typecheck 보정 | Claude Code (Opus 4.7) | tsconfig.etl.json 분리 | scripts/etl/* + src/lib/etl/* + src/lib/indicators/* + src/types/*을 위한 tsconfig.etl.json. types:["node"]. `typecheck:etl` npm script 도입. IDE의 tsconfig.app.json은 그대로 둠. | tsconfig.etl.json, package.json | 전면 반영 | npm run typecheck:etl 통과 | IDE에서 node 글로벌 빨간 줄은 알려진 IDE-only 이슈 |
| 15 | master stage 구현 | Claude Code (Opus 4.7) | 4개 master 통합 | buildMaster pure function. region(5자리 sigunguCode 게이트) / demand(outer join) / school(schoolName 누락 차단) / supportCenter(institutionName 차단). `--stage master` 추가. | scripts/etl/master/*, runEtl.ts | 전면 반영 | master records=22 issues=5 | 비정상 regionCode "ABCD"/"INVALID" 차단 후 6개 시군구만 통과 |
| 16 | master 테스트·issue 분리 보정 | Claude Code (Opus 4.7) | execSync 호환 + B 도메인 분리 | Windows `execFileSync(npx.cmd)` EINVAL(CVE-2024-27980) → `execSync` 전환. school/supportCenter 둘 다 카테고리 B라 issue가 두 파일에 동시 포함되던 문제를 `classifyB(field+message)`로 정밀 분리. | master.test.ts, runEtl.ts classifyB | 전면 반영 | support_center_master.json issues=0 | CleanResult<TRecord> generic도 이 단계에서 정립 |
| 17 | mart stage 구현 | Claude Code (Opus 4.7) | 시군구 단위 region summary | buildRegionSummaryMart pure function. regionMaster base + demand/school/supportCenter 결합. specialSchoolCount/specialClassCount/supportCenterCount 산출. C/D/E/F는 0. `_meta.partialFixture=true`, `missingDomains=["C","D","E","F"]`. | scripts/etl/mart/*, runEtl.ts | 전면 반영 | mart records=6 issues=3 | mart record는 RegionSummary 호환 형태 |
| 18 | ETL 테스트 산출물 동시 쓰기 방지 보정 | Claude Code (Opus 4.7) | flaky 회피 | master.test.ts / mart.test.ts에서 beforeAll의 stage 실행 제거 → pure function 테스트만 유지. 새 `etlStages.test.ts`가 stage 실행과 산출물 검증 단독 담당. `testEtlCommands.ts` helper 신설. | __tests__/etlStages.test.ts, master/mart.test.ts | 전면 반영 | 산출물 폴더 동시 쓰기 0건 | indicator 단계 추가에 대비한 구조 |
| 19 | indicator stage 구현 | Claude Code (Opus 4.7) | mart→TransitionIndex 변환 | buildIndicatorOutput pure function. mart record를 RegionSummary 호환 객체로 변환, school/supportCenter master를 SchoolSummary/InstitutionSummary로 변환. buildTransitionIndex(`mvp-v1`) 호출. C/D/E/F 입력은 빈 배열·undefined. baseYear/calculatedAt 고정. | scripts/etl/indicator/*, runEtl.ts | 전면 반영 | indicator records=6 issues=0 | 산식·가중치 무수정. `as any` 미사용 (narrowSchoolType helper) |
| 20 | --stage all 및 etl:fixture:all 연결 | Claude Code (Opus 4.7) | 통합 1회 실행 | `--stage all` 분기에서 clean → master → mart → indicator 순차 실행. `etl:fixture:all` npm script. etlStages.test.ts의 beforeAll을 4회 spawn → 1회 spawn으로 통합. | runEtl.ts, package.json, etlStages.test.ts | 전면 반영 | DONE stage=all cleanRecords=39 masterRecords=22 martRecords=6 indicatorRecords=6 | 중간 stage 실패 시 후속 미실행 |
| 21 | CI에 typecheck:etl + etl:fixture:all 반영 | Claude Code (Opus 4.7) | 품질 게이트 5단계 | ci.yml에 `ETL typecheck` + `ETL fixture pipeline` 두 step 신규 삽입. 최종 순서: npm ci → typecheck:etl → etl:fixture:all → lint → test → build. README/CLAUDE 표준 검증 절차 5단계로 갱신. | ci.yml, README.md, CLAUDE.md | 전면 반영 | 로컬 5단계 모두 통과 | Secrets / API key / .env.local 미사용 명시 |
| 22 | 기준연도 2026 정합화 | Claude Code (Opus 4.7) + ChatGPT (정책 확정) | 분석 baseYear 통일 | DEFAULT_BASE_YEAR=2026, DEMO_BASE_YEAR=2026, INDICATOR_BASE_YEAR=2026, *_CALCULATED_AT="2026-05-11T00:00:00+09:00". mobilityAccess는 2025 baseline + 2026 분석 기준 추세. fixture A_*.json year=2026. yearlySupport 2025는 추세 항목으로 유지. | 15개 파일 (상수 6 + 데이터 5 + 테스트 7 + 문서 1) | **완료** | **typecheck:etl, etl:fixture:all, lint, test, build 통과** | **분석 baseYear, calculatedAt, fixture year, mobilityAccess 2025/2026 구조 정합화 완료** |

## 4. 후속 예정 단계 (참고용, 본 체크포인트 시점에서 "미진행")

| 순번 | 단계 | 사용 도구(예정) | 목적 |
|------|------|----------------|------|
| 23 | 11-2 실 공공데이터 연동 계획 | ChatGPT (기획) + Claude Code | NEIS/HRD-Net/워크넷/꿈길/장애인복지관/교통약자 API 키 분리, httpAdapter 실 구현, ETL_API_KEY_* 환경변수 도입, zod 검증 |
| 24 | C/D/E/F fixture 또는 실데이터 ETL 확장 | Claude Code | partial fixture → full coverage |
| 25 | 지도 라이브러리 도입 | ChatGPT (선정 검토) + Claude Code | react-leaflet / mapbox-gl / deck.gl 중 1 |
| 26 | 산식 가중치·임계값 전문가 검토 | 사람 검토 | mvp-v1 → mvp-v2 보정 |
| 27 | 컴포넌트 smoke test | Claude Code | jsdom + @testing-library/react 별도 도입 |
| 28 | E2E 테스트 (Playwright) | Claude Code | 발표 시연 시나리오 자동화 |

## 5. AI 활용 시 유의사항 (체크포인트 갱신)

1. 모든 AI 산출물은 **초안**으로만 사용하며, 교사·담당자의 검토를 거친 후 활용한다.
2. 시연용 더미 데이터(DEMO-SIGUNGU-01~06)로 생성된 문구를 실제 학생·지역에 그대로 사용하지 않는다.
3. 산식·임계값·가중치는 본 문서와 `data_preprocessing_log.md`에 명시된 대로 "예시 (`mvp-v1`)"임을 발표 시 명확히 안내한다.
4. AI 도구를 사용하여 추가 산출물을 생성할 때는 본 표 §3 끝에 일자·도구·목적·반영 여부를 추가 기록한다.
5. **학생 개인 식별이 가능한 입력값을 AI 도구에 직접 입력하지 않는다** (본 프로토타입은 개인정보를 저장·전송하지 않음, "개인정보 저장 없음" 배지 상시 노출).
6. 실제 공공데이터 API 키를 AI 도구에 노출하지 않는다 (11-1 시점 ETL_API_KEY_* 사용 0건, 11-2 도입 시점에 별도 보안 절차 추가 예정).

## 6. 자기 검증 체크리스트 (체크포인트 시점)

- [x] AI 활용 단계별 기록 22건 (구현·검증 완료분)
- [x] Claude Code와 ChatGPT 역할 구분 (구현 vs 기획·검토)
- [x] 각 단계의 검증 결과 함께 기록
- [x] 기준연도 2026 정합화 완료 표기
- [x] 본 체크포인트가 원본 docs/prompt_log.md를 덮어쓰지 않음
- [x] 실제 학생/기관 식별자 0건
- [x] API key·secret 0건

## 7. 원본 docs/prompt_log.md와의 차이 (병합 시 참고)

- 원본 prompt_log.md는 발표자료 14쪽 윤리·검증 절차의 기준 문서이며, 표 컬럼이 "일자/도구/모델/프롬프트 목적/주요 지시/입력 자료/산출물/반영 여부/검토자/비고" 형식.
- 본 체크포인트는 "순번/단계/사용 도구/프롬프트 목적/주요 지시 요약/산출물/반영 여부/검증 결과/비고" 형식 — **검증 결과** 컬럼이 추가됨.
- 원본은 발표 대상 청중(공모전 심사위원·교육청)을 의식한 문체. 본 체크포인트는 내부 추적용 상세 기록.
- 병합 시점에 본 표를 원본 표의 추가 행으로 흡수하면서 일자(예: 2026-05-09~11)·검토자·중요도를 보강하면 됨.

## 8. 본 체크포인트가 작성된 시점의 git 상태 요약 (참고)

본 파일이 작성된 시점에서 git status:
- 추적 변경: 12 modified + 1 deleted (`src/types.ts` → `src/types/` 디렉토리 분리)
- 미추적: 11개 경로 (`.env.example`, `.github/`, `CLAUDE.md`, `data/`, `scripts/etl/`, `src/data/mocks/`, `src/hooks/`, `src/lib/`, `src/services/`, `src/types/`, `tsconfig.etl.json`)
- 본 체크포인트 자체는 새 파일(`docs/_checkpoint_prompt_log_2026_05_11.md`)로 untracked 상태로 추가됨.
