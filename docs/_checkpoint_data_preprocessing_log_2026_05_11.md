# 데이터 전처리 기록 체크포인트 — 2026-05-11

> **임시 체크포인트 문서.** 본 파일은 최종 docs/data_preprocessing_log.md로 병합하기
> 전에 데이터 전처리/ETL 구현 과정을 잃지 않도록 따로 저장한 초안입니다. 원본
> data_preprocessing_log.md는 그대로 유지되며, 본 체크포인트는 최종 병합 시
> 참고 자료입니다.

## 1. 작성 목적

- 공공데이터 전처리 과정의 **재현성 확보**: 같은 입력 → 같은 출력 보장.
- fixture 기반 ETL이 **어떤 입력을 받아 어떤 산출물을 만들었는지** 단계별로 기록.
- 발표자료(공모전 PPT) 또는 윤리·검증 페이지(EthicsValidation)에서 "데이터 처리 과정"의 근거 자료로 사용.
- 최종 docs/data_preprocessing_log.md 병합 전 **임시 체크포인트**. 단계별 수치(record/issue 카운트)와 envelope 메타가 손실되지 않도록 보존.

## 2. 전처리 원칙

- 데이터는 **Raw → Clean → Master → Mart → Indicator** 5단계를 단방향으로 흐른다. 단계를 건너뛰지 않는다.
- 현재 단계(11-1)는 **실제 API가 아닌 fixture 기반 demo ETL**.
- **실제 공공데이터 API 호출 0건.** fetch/axios/undici/node-fetch 미사용.
- **실제 API key 사용 0건.** `ETL_API_KEY_*` / `VITE_DATA_SOURCE`(비밀 용도) 미참조. `.env.local` 미생성. `.env.example`은 `VITE_DATA_SOURCE=mock` 한 줄만.
- **개인정보(PII) 0건.** 학생 이름·주민등록번호·학번·전화번호·이메일·보호자 정보·상세 주소·사진·진단정보 미수집. 시군구 단위 집계만.
- **`data/fixtures/`는 commit 가능한 demo 입력** ("(시연용)" 접미·`_meta.source="demo"`·`license="demo-only"` 명시).
- `data/clean/`, `data/master/`, `data/mart/`, `data/indicator/`는 **재생성 가능한 산출물**이며 `.gitignore` 대상.
- 실제 raw 데이터는 향후 `data/raw/`에 저장하되 **commit하지 않는다** (`.gitignore` 17행에 규칙 존재, 디렉토리 미존재).
- 산식·가중치(`src/lib/indicators/config.ts`의 `INDICATOR_VERSION="mvp-v1"`)는 본 단계에서 **수정하지 않는다**. 실 적용 시 교육청·특수교육 전문가·데이터 전문가 검토 필요.

## 3. A~G 7개 데이터 묶음

| 묶음 | 이름 | 현재 fixture ETL 포함 여부 | 비고 |
|------|------|----------------------------|------|
| **A** | 전환교육 수요 데이터 | **일부 포함** | 특수교육대상자 수, 등록장애인 수 (시군구 단위 6개 + INVALID 차단 케이스 1) |
| **B** | 학교·교육 여건 데이터 | **일부 포함** | 학교 기본정보(8건), 특수교육지원센터(3건). NEIS 코드 일부 부재 케이스 + 빈 schoolName 차단 케이스 |
| **C** | 진로체험·훈련 공급 데이터 | 미포함 | 후속 단계 (워크넷/꿈길/HRD-Net/발달장애인훈련센터 — 11-2 이후) |
| **D** | 일자리·고용 결과 데이터 | 미포함 | 후속 단계 (장애인 구인·취업/의무고용 — 11-2 이후) |
| **E** | 복지·생활지원 인프라 데이터 | 미포함 | 후속 단계 (장애인복지관/주간이용시설/직업재활시설 — 11-2 이후) |
| **F** | 이동권·접근성 데이터 | **mock에는 있음, fixture ETL에는 미포함** | mockAdapter는 12개 MobilityAccess(2025/2026 추세) 제공. fixture ETL에는 아직 F 도메인 cleaner 없음. 후속 실데이터 확장 예정 |
| **G** | 표준화·공간 결합 데이터 | **일부 포함** | 지역코드(7건, ABCD 차단), 지오코딩(8건, 검증 실패 일부 포함) fixture |

## 4. 현재 fixture ETL 입력

### 4.1. 현재 포함 fixture (6개 파일)

`data/fixtures/` (commit 가능):

- `G_region_codes_sample.json` — 시군구 코드 마스터 (sigungu 5자리, 정상 6 + 비정상 "ABCD" 1)
- `G_geocoding_sample.json` — 주소 → 좌표 매핑 (검증 verified 다수 + failed/missing 일부)
- `A_special_education_sample.json` — 시군구별 특수교육대상자 수 (정상 6 + "INVALID" 1, year=2026)
- `A_disabled_population_sample.json` — 시군구별 등록장애인 수 (정상 6건, year=2026)
- `B_school_basic_sample.json` — 학교 기본정보 (정상 7 + 빈 schoolName 1)
- `B_special_support_center_sample.json` — 특수교육지원센터 (정상 3건)

### 4.2. 현재 미포함

다음 묶음은 **후속 단계(11-2 이후)**에서 fixture 또는 실데이터로 확장:

- **C 훈련공급** (workNet/HRD-Net/꿈길/발달장애인훈련센터)
- **D 고용결과** (장애인 구인 정보·취업률·의무고용)
- **E 복지인프라** (장애인복지관·주간이용시설·직업재활시설)
- **F 이동접근성 fixture ETL** (mock에는 존재. fixture clean 단계 미도입)

mart record는 C/D/E/F 카운트를 `0`으로 채우고, mart `_meta.partialFixture=true` / `missingDomains=["C","D","E","F"]`로 부재를 명시한다 (§8 참조).

## 5. ETL 단계별 처리 기록

| 단계 | 입력 | 처리 내용 | 출력 | 검증 방식 | 비고 |
|------|------|----------|------|----------|------|
| **Fixture 입력** | (없음, 사람이 작성한 demo 입력) | demo 데이터 정형화. `_meta.source="demo"`, `license="demo-only"`. 비정상 케이스 1~2건 포함해 IssueCollector 누적 검증. | `data/fixtures/*.json` 6 파일 | 사람 검토 (실 기관·실명 0건) | commit 가능. 실데이터 도입 시 본 fixture로 회귀 검증 |
| **Clean 단계** | `data/fixtures/*.json` 6 파일 | 컬럼 표준화, 결측·이상치 처리, 단위 통일. 각 cleaner는 `CleanedXxxRecord` 타입 반환. IssueCollector로 데이터 품질 이슈 누적. | `data/clean/{G,A,B}/*.clean.json` 6 파일 | cleanFixture.test.ts (in-memory) + etlStages.test.ts (파일 산출물) | `_meta.stage="clean"`, recordCount/issueCount 일치 검증 |
| **Master 단계** | `data/clean/*` 6 파일의 records | 5자리 sigunguCode 게이트(`/^\d{5}$/`)로 region master 생성. demand는 outer join. school은 schoolName 누락 차단. supportCenter는 institutionName 차단. issue 분리(G/A/B-school/B-supportCenter). | `data/master/*.json` 4 파일 | master.test.ts (in-memory buildMaster) + etlStages.test.ts (파일) | `region_master`만 통과한 regionCode가 후속 단계 valid 집합 |
| **Mart 단계** | `data/master/*.json` 4 파일의 records | regionMaster 1:1 base + demand(left join) + school(group by) + supportCenter(group by) 결합. specialSchoolCount/specialClassCount/supportCenterCount 산출. C/D/E/F 카운트는 0. | `data/mart/region_summary_mart.json` 1 파일 | mart.test.ts (in-memory pipeline) + etlStages.test.ts (파일) | `_meta.partialFixture=true`, `missingDomains=["C","D","E","F"]` |
| **Indicator 단계** | mart 1 파일 + master의 school/supportCenter 2 파일 | mart record → RegionSummary 호환. school master → SchoolSummary. supportCenter master → InstitutionSummary. trainingPrograms/jobPostings/welfareFacilities/mobilityAccess는 빈 배열, employmentOutcome는 undefined. buildTransitionIndex(`mvp-v1`) 호출 (산식 무수정). | `data/indicator/transition_index_fixture.json` 1 파일 | indicator.test.ts (in-memory) + etlStages.test.ts (파일) | baseYear=2026, calculatedAt="2026-05-11T00:00:00+09:00" 고정 |
| **All stage** | clean→master→mart→indicator 전 단계 입력 | `--stage all` 단일 invoke로 4단계 순차 실행. 중간 단계 throw 시 후속 미실행. | data/* 4단계 산출물 일괄 | etlStages.test.ts의 beforeAll에서 `runEtlStage("all")` 단일 spawn | npm script `etl:fixture:all` |
| **CI 품질 게이트** | (없음, GitHub Actions ubuntu-latest) | npm ci → typecheck:etl → etl:fixture:all → lint → test → build. Secrets/API key/.env.local 미사용. | CI green | `.github/workflows/ci.yml`의 6개 step | push/PR 시 자동 강제 |

## 6. Clean 단계 처리 결과

`npm run etl:fixture` (또는 `etl:fixture:all`의 첫 stage) 실행 결과:

| 묶음/cleaner | records | issues | 비고 |
|--------------|---------|--------|------|
| G/region_codes | 7 | 1 | 비정상 "ABCD" 1건이 issue로 보고 (master 단계에서 차단) |
| G/geocoding | 8 | 3 | 좌표 부재·검증 실패 일부 |
| A/special_education | 7 | 1 | "INVALID" regionCode 1건 (master 단계에서 demand 결합 시 차단) |
| A/disabled_population | 6 | 0 | 정상 6건 모두 통과 |
| B/school_basic | 8 | 2 | 빈 schoolName 차단 + NEIS 코드 부재 일부 |
| B/support_center | 3 | 0 | 정상 3건 모두 통과 |

**clean 총 records = 39, clean 총 issues = 7.**

## 7. Master 단계 처리 결과

`npx tsx scripts/etl/runEtl.ts --mode fixture --stage master` (또는 `etl:fixture:all`의 두 번째 stage) 실행 결과:

| master 파일 | records | issues | datasetCategory | 비고 |
|-------------|---------|--------|-----------------|------|
| region_master.json | 6 | 3 | G | 5자리 sigunguCode만 통과 ("ABCD" 차단 1 + geocoding info 2) |
| demand_master.json | 6 | 1 | A | "INVALID" 차단. specialEducation + disabledPopulation outer join |
| school_master.json | 7 | 1 | B | 빈 schoolName 차단 후 7건 |
| support_center_master.json | 3 | 0 | B | issue 정밀 분리(classifyB) 후 0건 |

**master 총 records = 22, master 총 issues = 5.**

issue 분리 정책:
- G 카테고리 → region_master에만.
- A 카테고리 → demand_master에만.
- B 카테고리는 `classifyB(field+message)`로 school/supportCenter 정밀 분리:
  - `field === "schoolName"` 또는 `field === "regionCode"`이면서 message에 "school" 포함 → school.
  - `field === "institutionName"` 또는 `field === "regionCode"`이면서 message에 "supportCenter" 포함 → supportCenter.
  - 분류 불가 B issue는 두 master 파일에 모두 포함(누락 방지). 현재 buildMaster.ts 메시지 기준 발생 0건.

## 8. Mart 단계 처리 결과

`npx tsx scripts/etl/runEtl.ts --mode fixture --stage mart` (또는 `etl:fixture:all`의 세 번째 stage) 실행 결과:

- `data/mart/region_summary_mart.json`
  - **records = 6** (regionMaster 1:1 base)
  - **issues = 3** (info / B / supportCenterCount — 시군구 3곳에 지원센터 0건)
  - `_meta.partialFixture = true`
  - `_meta.missingDomains = ["C", "D", "E", "F"]`
  - `_meta.datasetCategory = "region-summary"`
  - `_meta.source = "demo:fixture-etl"`

각 record는 RegionSummary 호환:
- regionCode/regionCodeType/sidoCode/sigunguCode/sidoName/sigunguName/regionName/coordinate
- specialEducationStudentCount, registeredDisabledCount (demand 결합)
- schoolCount, specialSchoolCount, specialClassCount, supportCenterCount (집계)
- trainingInstitutionCount=0, careerExperienceCenterCount=0, welfareFacilityCount=0, jobPostingCount=0 (도메인 부재)

## 9. Indicator 단계 처리 결과

`npx tsx scripts/etl/runEtl.ts --mode fixture --stage indicator` (또는 `etl:fixture:all`의 네 번째 stage) 실행 결과:

- `data/indicator/transition_index_fixture.json`
  - **records = 6, issues = 0**
  - `_meta.stage = "indicator"`
  - `_meta.source = "demo:fixture-etl"`
  - `_meta.indicatorVersion = "mvp-v1"`
  - `_meta.baseYear = 2026`
  - `_meta.calculatedAt = "2026-05-11T00:00:00+09:00"`
  - `_meta.partialFixture = true`
  - `_meta.missingDomains = ["C", "D", "E", "F"]`

처리:
- 현재는 **G + A + B 일부 기반 partial fixture**.
- mart record → RegionSummary로 변환 (regionCode/regionName/specialEducationStudentCount/registeredDisabledCount/schoolCount 등).
- school master → SchoolSummary로 변환 (schoolId/schoolName/schoolType/region/address). schoolType은 `narrowSchoolType()` helper로 SchoolType union으로 안전 변환 (`as any` 미사용).
- supportCenter master → InstitutionSummary로 변환 (institutionId/institutionType="supportCenter"/institutionName).
- `trainingPrograms=[]`, `careerExperiencePrograms=[]`, `jobPostings=[]`, `welfareFacilities=[]`, `mobilityAccess=[]`, `employmentOutcome=undefined`로 전달.
- 산식은 `src/lib/indicators/buildTransitionIndex`를 사용. **산식 자체와 가중치는 수정하지 않음.**
- 결과적으로 C/D/E/F가 없으므로 `trainingSupplyIndex`, `employmentIndex`, `welfareIndex`, `accessibilityIndex`가 0에 근접 (정상 동작).
- `transitionGapIndex`는 demand 가중 0.4 + 공급 부재 가중치들의 합 → 6개 시군구에서 70 전후 ~ 90 미만 범위.

## 10. All stage 처리 결과

`npm run etl:fixture:all` 실행 결과:

```
[runEtl] mode=fixture, stage=all
[clean:G/region_codes] records=7, issues=1
[clean:G/geocoding] records=8, issues=3
[clean:A/special_education] records=7, issues=1
[clean:A/disabled_population] records=6, issues=0
[clean:B/school_basic] records=8, issues=2
[clean:B/support_center] records=3, issues=0
[master:region]        records=6, issues=3
[master:demand]        records=6, issues=1
[master:school]        records=7, issues=1
[master:supportCenter] records=3, issues=0
[mart:region_summary] records=6, issues=3
[indicator:transition_index] records=6, issues=0
[runEtl] DONE stage=all cleanRecords=39 masterRecords=22 martRecords=6 indicatorRecords=6
```

요약:
- clean → master → mart → indicator 순차 실행
- **cleanRecords = 39**
- **masterRecords = 22**
- **martRecords = 6**
- **indicatorRecords = 6**

## 11. 품질 게이트

### 11.1. 현재 표준 검증 절차 (모든 변경 후 필수, 5단계)

1. `npm run typecheck:etl`
2. `npm run etl:fixture:all`
3. `npm run lint`
4. `npm test`
5. `npm run build`

다섯 명령 모두 통과해야 PR/커밋 진행. CI(`.github/workflows/ci.yml`)도 동일 순서로 자동 강제.

### 11.2. 최근 검증 결과 (체크포인트 작성 시점)

- `typecheck:etl` — ✅ 통과
- `etl:fixture:all` — ✅ 통과 (위 §10 출력)
- `lint` — ✅ 통과
- `test` — ✅ 통과 (**12 files / 202 tests passed**)
- `build` — ✅ 통과 (dist 정상 생성, chunk size 경고는 기존 동일)

## 12. 데이터 품질 이슈 처리

`DataQualityIssue` 타입(src/types/dataQuality)과 `IssueCollector` 콜백 패턴(src/lib/etl/types)으로 ETL 단계 전반에서 부수효과 없이 데이터 품질 문제를 누적·보고한다.

### 12.1. IssueCollector 패턴

각 normalize/buildXxx 함수는 `collect: IssueCollector` 콜백을 받아 issue를 누적한다. 함수는 throw하지 않고 issue를 보고한 뒤 해당 record를 결과 array에서 제외하거나 우회한다. 호출자(runEtl)가 issue array를 envelope의 `issues` 필드로 직렬화한다.

### 12.2. 처리되는 이슈 유형

| 유형 | severity | datasetCategory | field | 처리 |
|------|---------|-----------------|-------|------|
| 비정상 regionCode (5자리 숫자 게이트 미통과) | warning | G/A/B | regionCode | master 단계 차단 + issue 보고 |
| geocoding 매칭 실패 (sigunguName 없음 / verified 미통과) | info | G | geocoding | region master에 coordinate만 미포함, record는 유지 |
| schoolName 누락 | warning | B | schoolName | school master 차단 + issue 보고 |
| institutionName 누락 | warning | B | institutionName | supportCenter master 차단 + issue 보고 |
| partial demand (special_education만 / disabled_population만 존재) | info | A | partialDemand | demand master는 유지하되 issue 표시 |
| mart: 시군구 학교 0건 | warning | B | schoolCount | mart record 유지 + issue 표시 |
| mart: 시군구 지원센터 0건 | info | B | supportCenterCount | mart record 유지 + issue 표시 |
| mart: regionMaster O / demandMaster X | info | A | demand | mart record 유지 (수요값 undefined) |

### 12.3. master 단계의 B 카테고리 issue 분리

school과 supportCenter가 동일한 datasetCategory("B")라 issue가 두 파일에 동시 포함되는 문제를 해결하기 위해 `classifyB(field+message)` helper 도입:
- field="schoolName" → school
- field="institutionName" → supportCenter
- field="regionCode" + message에 "school" → school
- field="regionCode" + message에 "supportCenter" → supportCenter
- 분류 불가는 두 파일에 모두 포함(누락 방지)

현재 buildMaster.ts 메시지 기준 분류 불가 케이스 0건. `support_center_master.json`의 issues = 0 확보.

### 12.4. partial fixture의 missingDomains 표시

mart와 indicator 단계의 `_meta`에서 C/D/E/F 도메인이 부재함을 명시:
- `_meta.partialFixture = true`
- `_meta.missingDomains = ["C", "D", "E", "F"]`

→ 화면·발표 시 "현재는 partial 데이터, 도메인 일부 미포함" 안내 근거.

### 12.5. 개인정보 차단

`DataQualityIssue`는 **데이터 품질 점검용**이며 개인정보를 포함하지 않는다. `field`는 컬럼명·도메인 라벨, `message`는 데이터 형식 위반 설명만. 학생 이름·번호·연락처·진단정보는 어떤 issue 메시지에도 포함되지 않는다.

## 13. 기준연도 2026 정합화 기록

### 13.1. 정책 (사용자 확정)

사용자가 본 프로토타입의 분석 데이터 기준연도를 **2026으로 확정**함. 화면 표시 기준연도와 분석 데이터 기준연도를 **모두 2026으로 통일**.

### 13.2. 통일된 기준값

- `DEFAULT_BASE_YEAR = 2026` (src/lib/dashboard/constants.ts)
- `DEMO_FIXED_CALCULATED_AT = "2026-05-11T00:00:00+09:00"` (src/lib/dashboard/constants.ts)
- `INDICATOR_BASE_YEAR = 2026` (scripts/etl/indicator/buildIndicatorOutput.ts)
- `INDICATOR_CALCULATED_AT = "2026-05-11T00:00:00+09:00"` (scripts/etl/indicator/buildIndicatorOutput.ts)
- `DEMO_BASE_YEAR = 2026` (src/data/mocks/_shared.ts, src/services/_meta.ts)
- `DEMO_PRIOR_YEAR = 2025` (전년 baseline, mobilityAccess 추세 비교 용도)
- `DEMO_CALCULATED_AT = "2026-05-11T00:00:00+09:00"` (mock 공통)
- `DEMO_COLLECTED_AT = "2026-05-10T00:00:00+09:00"`
- `DEMO_SOURCE_UPDATED_AT = "2026-05-01T00:00:00+09:00"`

### 13.3. fixture / mock 정합화

- `data/fixtures/A_special_education_sample.json` — 7 records `year: 2026`
- `data/fixtures/A_disabled_population_sample.json` — 6 records `year: 2026`
- `src/data/mocks/transitionIndexes.mock.ts` — `baseYear = DEMO_BASE_YEAR(=2026)` (constant 참조)
- `src/data/mocks/mobilityAccess.mock.ts` — **2025 전년 baseline + 2026 현재 분석 기준연도** 12 records 구조 (6 시군구 × 2 연도). `DEFAULT_BASE_YEAR=2026` 호출 시 2026 항목이 선택됨.
- `src/data/regions.json` — `currentYear: 2026`, yearlySupport는 **2022~2026 5년 추세**(2025는 추세 중간 항목으로 유지).

### 13.4. 남은 2025 분류 (정책상 유지)

남으면 안 되는 2025 기준값(DEFAULT_BASE_YEAR / INDICATOR_BASE_YEAR / `baseYear: 2025` / `"2025-12-31T15:00:00+09:00"` / 데이터 기준연도 2025 / fixture year 2025): **0건** ✅

남은 2025는 다음 4종으로 분류되어 정책상 유지:
- **(A) yearlySupport / 과거 추세** — regions.json 4개 권역의 2025 trend 항목, regionAdapter.test.ts의 yearlySupport pass-through 테스트 fixture.
- **(B) 전년 baseline** — `DEMO_PRIOR_YEAR=2025`, mobilityAccess 6 records `baseYear: 2025`, 관련 주석·테스트.
- **(C) 과거 작업 로그 / 무관 timestamp** — CLAUDE.md "단계별 완료 상태 (2025-12 기준)", docs/prompt_log.md 2025-08~09 과거 작업 행, buildTransitionIndex.test.ts의 sourceAt(metaOverrides pass-through 테스트의 무관 timestamp).
- **(D) demo 게시일** — jobPostings/trainingPrograms/careerExperiencePrograms mock의 postedAt/closingAt/startDate (분석 baseYear가 아닌 게시 timestamp, mock 수정 금지 범위 외).

### 13.5. 검증

- typecheck:etl — ✅ 통과
- etl:fixture:all — ✅ 통과
- lint — ✅ 통과
- test — ✅ 통과 (12 files / 202 tests)
- build — ✅ 통과

### 13.6. 상태

**완료 / 검증 완료.**

분석 baseYear, calculatedAt, fixture year, mobilityAccess 2025/2026 구조 정합화 완료. 후속 보정 항목 없음.

## 14. 본 체크포인트가 작성된 시점의 환경 요약

- Node 20+ / npm 9+ (CI는 actions/setup-node@v4 + node-version: '20')
- vitest 4.x (node environment, jsdom·RTL 미설치)
- tsx 4.x (TypeScript ETL 직접 실행)
- 별도 ETL typecheck: tsconfig.etl.json (scripts/etl + src/lib/etl + src/lib/indicators + src/types)
- 외부 라이브러리: 추가 설치 0건 (이번 단계 기준)
- 실제 API 호출: 0건. mockAdapter + fixture만 사용.
- 실제 API key: 0건. `ETL_API_KEY_*` 미참조, `.env.local` 미생성, `.env.example`은 `VITE_DATA_SOURCE=mock` 1줄.

## 15. 원본 docs/data_preprocessing_log.md와의 차이 (병합 시 참고)

- 원본 data_preprocessing_log.md는 발표자료 컨텍스트의 기준 문서이며, scripts/preprocess.py(1단계 CSV → regions.json) 기반의 산식 설명이 중심.
- 본 체크포인트는 **scripts/etl/ 기반 fixture ETL** (Raw → Clean → Master → Mart → Indicator 5단계)의 단계별 처리 기록이 중심.
- 두 문서는 충돌하지 않음 — 원본은 산식·가중치·결측 처리 정책, 본 체크포인트는 fixture 단계별 record/issue 카운트와 envelope 메타.
- 병합 시점에 본 §5(단계별 처리)·§6~9(단계별 결과)·§12(이슈 처리)를 원본의 적절한 절에 흡수하면 됨.
- 기준연도 2026 정합화(§13)는 원본 data_preprocessing_log.md의 "전제·기준값" 절에 그대로 반영 가능.
