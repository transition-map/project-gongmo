# data/fixtures

11-1 단계의 ETL 실행기를 검증하기 위한 **시연용(demo) fixture** 모음.

## 원칙

- **모두 demo 데이터**입니다. 실제 학생명, 주민번호, 연락처, 상세 주소, 보호자 정보, 사진, 상세 진단정보를 포함하지 않습니다.
- 기관명·학교명은 "(시연용)" 또는 "demo" 접미를 명시해 실제 기관과 혼동되지 않게 합니다.
- 각 파일은 `_meta` 필드로 `source: "demo"`, `license: "demo-only"` 임을 표시합니다.
- 일부 fixture는 비정상 입력 1~2건을 포함해 `IssueCollector` 누적 검증 용도로 사용합니다.

## 파일 목록 (11-1 1차)

| 파일 | 묶음 | 용도 |
|------|------|------|
| `G_region_codes_sample.json` | G | 시군구 코드 마스터 (sigungu 5자리) |
| `G_geocoding_sample.json` | G | 주소 → 좌표 매핑 |
| `A_special_education_sample.json` | A | 시군구별 특수교육대상자 수 |
| `A_disabled_population_sample.json` | A | 시군구별 등록장애인 수 |
| `B_school_basic_sample.json` | B | 학교 기본정보 (NEIS 코드 일부 부재 케이스 포함) |
| `B_special_support_center_sample.json` | B | 특수교육지원센터 |

## 파일 목록 (11-3 1차-55 신규 — official resource evidence cards / 1차-64 최신 갱신)

| 파일 | 용도 |
|------|------|
| `official_resources_sample.json` | 공식기관·중앙 공공기관 자료의 **link-only registry**. Dashboard `관련 공식자료` 카드 섹션에서 사용. 본문 전문 복제 없음 — 제목·기관·분류·짧은 요약·원문 URL 중심. **11-3 1차-64 정책으로 사용자 지정 4개 공식자료 + KEAD 지역본부·지사 확인 링크 1건 = 총 5건 보유** (KEAD 직업심리검사 / NISE-TEEMH / NISE 2026 워크숍 / CareerNet 자료실 / KEAD 지역본부·지사 안내). 1차-60의 4건에 1차-64에서 `kead-regional-branches` 카드 추가. 지역별 자동 추천이 아니라 사용자가 KEAD 페이지에서 자기 지역의 지사를 직접 확인하는 link-only 안내. |

### official resource registry 정책 (11-3 1차-55)

- **AI 정책 생성 아님**: 본 프로젝트 정책상 `mainIssue` / `policyUse` / `teacherUse` 같은 정책 문구 AI 생성 금지. official resource registry는 그 대안 — AI가 새 정책 문구를 쓰는 대신 공식자료 / 공공기관 자료 / 연구기관 자료로 **링크**합니다. 모든 record에 `aiGenerated: false` 강제 (테스트로 회귀 보호).
- **link-only 원칙**: 본문 전문 복제 0건. `_meta.policy.fullTextCopyAllowed = false`. 자료 추가 시 제목·기관명·분류·1~2문장 요약·원문 URL만 입력합니다. 본문 텍스트를 fixture에 복사하지 않습니다.
- **출처 한정**: 공식기관(예: 보건복지부·국립특수교육원·한국장애인고용공단·한국장애인개발원) / 공공기관(예: 한국직업능력연구원·국가장애인평생교육진흥센터) / 연구기관(예: 시·도교육연구원). 개인 블로그·상업 사이트·검증 미상 출처는 등록하지 않습니다.
- **schema**: `id` (unique) / `title` / `organization` / `category` / `targets?` / `useCases?` / `url?` (https://...) / `sourceType` (`official-site` / `official-manual` / `uploaded-report` / `research-paper` / `other`) / `summary` (1~2문장) / `licenseNote?` / `sourceNote?` / `aiGenerated: false`. `_meta.license = "link-only"`, `_meta.note`에 "AI 정책 생성이 아닙니다" 명문화 의무.
- **url 부재 케이스**: `uploaded-report` 등 외부 URL이 없는 record는 `sourceNote`로 출처 안내. 발표 단계에서 사람 검수 후 URL 추가 가능.
- **frontend 통합**: `src/data/officialResources.ts`가 fixture를 import해 `getOfficialResources()` / `getOfficialResourcesByCategory(category)` helper 제공. Dashboard에 "관련 공식자료" 카드 섹션 추가 (대표 자료 노출). region별 매칭 로직은 1차-55 미도입 — 후속 합의.
- **사용 안내 문구 (UI / docs 통일)**: "공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다." (11-3 1차-57 정책으로 통일). 자료 추가·삭제·요약 수정은 모두 사람 검토 결과만 반영. UI 안내문에 "정책 자동 생성이 아닌 공식자료 연결" 명시.

### official resource registry 정책 확장 (11-3 1차-57)

- **국가 기관·중앙 공공기관·중앙 공공서비스 중심 재정렬**: registry 등록은 국가 기관 (`organizationType: "national-agency"`, 예: 국립특수교육원, 보건복지부) / 중앙 공공기관 (`"public-institution"`, 예: 한국장애인고용공단, 한국장애인개발원, 한국직업능력연구원) / 중앙 공공서비스 (`"national-service"`, 예: 국가장애인평생교육진흥센터) 중심으로 한정. 지방 연구기관 보고서·교과 매뉴얼은 Dashboard 대표 카드 노출 제외.
- **schema 확장**: 모든 record에 `freshnessTier`(`"current" | "recent" | "foundational" | "date-unknown"`) 필수. `organizationType?` 도입 (featured record는 사실상 필수, 테스트로 강제). `publishedYear?: number` 도입 (1990~2100 정수). `featuredOrder?: number` 도입 (Dashboard 대표 카드 우선순위, 낮은 값이 상위, undefined면 대표 카드 미노출).
- **Dashboard 대표 카드 정책**: `getFeaturedOfficialResources(limit)` helper가 `featuredOrder` 정의된 record만 오름차순 반환. Dashboard.tsx는 `OFFICIAL_RESOURCE_PREVIEW_COUNT = 6`을 limit으로 호출 (1차-58 시점 실제 5건이라 limit=6이어도 5건 반환). 대표 카드 자료는 국가기관·중앙 공공기관 한정 + `current` freshnessTier (테스트로 강제).
- **1차-55 정책 유지**: link-only / 본문 전문 복제 금지 / `aiGenerated: false` / `_meta.policy.aiGeneratedAllowed: false` / `fullTextCopyAllowed: false` / `humanReviewRequired: true` 모두 그대로. AI 정책 문구 생성 금지 정책 강화 — `_meta.policy.preferredOrganizationTypes` 신규 추가로 등록 선호 기관 유형 명문화.

### official resource registry 전면 교체 (11-3 1차-58 — 사용자 지정 5건)

- **Dashboard 공식자료 카드 5건 우선순위 (1차-58 최종)**:
  1. `kead-online-occupational-test-guidance` — KEAD 온라인 직업심리검사 안내 (`public-institution` / `featuredOrder: 1`)
  2. `nise-teemh-intro` — NISE-TEEMH 소개 (`national-agency` / `featuredOrder: 2`)
  3. `careernet-data-1437` — 진로실행력검사 활용안내서 (`public-institution` / `featuredOrder: 3`)
  4. `nise-workshop-2026-737999` — 2026년 NISE 워크숍 (boardSeq=737999, `national-agency` / `publishedYear: 2026` / `featuredOrder: 4`)
  5. `careernet-data-list` — 커리어넷 자료실 (`public-institution` / `featuredOrder: 5`)
- **registry에서 제거된 자료 (1차-58)**: 1차-55 등록 11건 중 1차-57에서 제거된 2건(성과지표 매뉴얼·경기교육연구원 보고서) 외에, 1차-58에서 추가로 9건 더 제거. 최종 registry는 위 5건만 보유 — `career-net-data-595` (CareerNet 595, → `careernet-data-1437` / `careernet-data-list`로 대체) / `kead-youth-career-guidance` / `kead-student-employment-support` / `kead-developmental-disability-training-center` / `mohw-disability-job-program` / `koddi-disability-job-program` / `nise-eduable-board` / `nise-lifelong-board-460` / `nise-workshop-collection-2025` / `nise-workshop-collection-2026`(1차-57의 boardSeq=737200 워크숍, → 1차-58의 boardSeq=737999로 대체). 후속 활용은 별도 단계 합의.
- **registry 총수**: 5건 (1차-55의 11건 → 1차-57의 10건 → **1차-58의 5건**). `getOfficialResources()` 결과 길이 5. `getFeaturedOfficialResources(6)` 결과 길이 5 (limit이 총수보다 커도 정상).
- **registry _meta.note 갱신**: "11-3 1차-58 정책으로 사용자 지정 5건만 보유" + 통일 안내 문구 ("공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.").
- **1차-55 / 1차-57 정책 유지**: link-only / 본문 전문 복제 금지 / `aiGenerated: false` / `_meta.policy` 전체 그대로. AI 정책 문구 생성 금지 / mainIssue·policyUse·teacherUse 새 문장 창작 금지 정책 유지. Dashboard 안내문 "정책 자동 생성이 아닌 공식자료 연결" 유지.

### official resource registry CareerNet 중복 정리 (11-3 1차-60)

- **Dashboard 공식자료 카드 4건 우선순위 (1차-60 최종)**:
  1. `kead-online-occupational-test-guidance` — KEAD 온라인 직업심리검사 안내 (`featuredOrder: 1`)
  2. `nise-teemh-intro` — NISE-TEEMH 소개 (`featuredOrder: 2`)
  3. `nise-workshop-2026-737999` — 2026년 NISE 워크숍 (boardSeq=737999, `featuredOrder: 3`)
  4. `careernet-data-list` — 커리어넷 자료실 (`featuredOrder: 4`)
- **registry에서 제거된 자료 (1차-60)**: `careernet-data-1437` (CareerNet 진로실행력검사 활용안내서). 1차-58 시점 5건 중 같은 CareerNet 사이트 자료가 중복으로 들어가 있어 CareerNet 자료 1건(`careernet-data-list`)만 유지하는 정책으로 정리.
- **유지된 CareerNet 자료**: `careernet-data-list` (커리어넷 진로교육자료 전체 목록, https://www.career.go.kr/cloud/w/data/list) — 진로교육 자료실 전체 목록을 다루므로 진로실행력검사 활용안내서를 포함한 다른 CareerNet 자료에도 접근 가능. 사용자 합의로 1건 유지.
- **registry 총수 변화**: 5건 (1차-58) → **4건 (1차-60)**. `getOfficialResources()` 결과 길이 4. `getFeaturedOfficialResources(6)` 결과 길이 4 (limit이 총수보다 커도 정상).
- **`featuredOrder` 재정렬**: 1차-58의 [1,2,3,4,5]에서 record 3(`careernet-data-1437`) 제거 후 남은 4건이 새 [1,2,3,4]로 부여 — KEAD 직업심리검사(1) → NISE-TEEMH(2) → NISE 2026 워크숍(3) → CareerNet 자료실(4).
- **registry `_meta.note` 갱신**: "11-3 1차-60 정책으로 사용자 지정 4건만 보유" + 중복 정리 사유 ("1차-58 시점 5건 중 CareerNet 자료 중복 정리") + 통일 안내 문구 그대로.
- **1차-55 / 1차-57 / 1차-58 정책 유지**: link-only / 본문 전문 복제 금지 / `aiGenerated: false` / `_meta.policy.aiGeneratedAllowed: false` / `fullTextCopyAllowed: false` / `humanReviewRequired: true` 모두 그대로. AI 정책 문구 생성 금지 / mainIssue·policyUse·teacherUse 새 문장 창작 금지 / 통일 안내 문구 ("공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.") 모두 그대로.

### NEIS schoolInfo OpenAPI live fetch scaffold (11-3 1차-79 — 로컬 ETL 전용, 사용자 manual 실행)

- **신규 helper**: `scripts/etl/ingest/fetchNeisSchoolBasic.ts` — NEIS schoolInfo OpenAPI 호출
  helper. 5개 함수 export: `buildNeisSchoolInfoUrl` / `maskNeisUrlKey` / `fetchNeisSchoolBasicRaw` /
  `computeNeisRawOutputPath` / `saveNeisSchoolInfoRaw` + 통합 entry `runNeisFetch`.
- **신규 CLI**: `scripts/etl/cli/neisFetch.ts` — 사용자 manual 실행 entry. `--page` / `--size` /
  `--dry-run` / `--help` 옵션. `process.env.ETL_API_KEY_NEIS` 존재 여부만 확인 (값 출력 0건).
- **신규 테스트**: `scripts/etl/__tests__/fetchNeisSchoolBasic.test.ts` — **26 케이스** (URL builder
  / URL 마스킹 / mock fetch / HTTP 4xx·5xx·network error 키 미노출 / parser 호환 / 저장 경로
  계산 / mock write / dry-run / 통합 entry / 키 노출 회귀 보호 2건).
- **신규 npm script**: `package.json`에 1개 추가: `"etl:real:neis-fetch": "tsx scripts/etl/cli/neisFetch.ts"`.
- **실제 NEIS API 호출 0건**: 1차-79 코드 단계 commit 시점에 실제 endpoint 호출 0건. 테스트는
  모두 `vi.fn(async () => new Response(...))` mock fetch 주입. `runNeisFetch` / `saveNeisSchoolInfoRaw`도
  dependency-injection으로 mock write 주입.
- **API key 비노출 정책 (CLAUDE.md §10 / §17.32 일관)**:
  - `apiKey` 값을 `console.log` / `throw new Error(\`...${apiKey}...\`)` / URL 로그 출력에 포함 0건.
  - URL을 로깅할 때는 **반드시 `maskNeisUrlKey()`로 `KEY=value` → `KEY=***` 치환** 후 사용.
  - HTTP error / network error 발생 시 한국어 카테고리 메시지만 throw — raw body / key 미포함.
  - error message 회귀 보호 (테스트 5건: HTTP 4xx / 5xx / network error / saveError / 빈 key).
- **dry-run 모드**: `--dry-run` 옵션 사용 시 `runNeisFetch`가 fetch / write 호출 0건. maskedUrl +
  outputPath만 계산해 반환. 사용자가 실제 호출 전 안전 검증용.
- **저장 경로 정책**: `data/raw.api/B/neis/<YYYYMMDD>-page<page>.json` (gitignore line 32 보호).
  본 코드 단계에서는 실제 디렉터리/파일 생성 0건. 사용자 manual 실행 시점에만 생성.
- **CLI 사전 조건 (사용자 책임)**:
  1. 공공데이터포털(https://www.data.go.kr/)에서 본인 계정으로 인증키 발급
  2. 프로젝트 루트에 `.env.local` 직접 생성 (`*.local` line 13 gitignore 보호)
  3. `.env.local`에 `ETL_API_KEY_NEIS=본인_발급_키` 입력
  4. (선택) `npm run etl:real:neis-fetch -- --page 1 --size 100 --dry-run`으로 URL 마스킹·저장 경로 확인
  5. 정상 모드: `npm run etl:real:neis-fetch -- --page 1 --size 100`
  6. raw 응답 사람 검토 (학교명 / 라이선스 / PII 의심 필드)
  7. `data/raw.api/B/neis/REVIEW.md` 작성 (라이선스·검토 일자·검토자 가공명·PII 보호 검토 결과)
- **error message 분류** (key·raw body 미포함):
  - HTTP 401/403 → `"NEIS HTTP 401 인증 오류. URL=<masked>."`
  - HTTP 429 → `"NEIS HTTP 429 쿼터 제한 오류. URL=<masked>."`
  - HTTP 5xx → `"NEIS HTTP 500 서버 오류. URL=<masked>."`
  - HTTP 그 외 → `"NEIS HTTP <status> 요청 오류. URL=<masked>."`
  - network error → `"NEIS 네트워크 호출 실패. URL=<masked>."`
  - empty key → `"ETL_API_KEY_NEIS 환경변수가 설정되지 않았습니다. 프로젝트 루트의 .env.local 파일에 'ETL_API_KEY_NEIS=본인_발급_키' 행을 추가한 뒤 다시 실행하세요."`
- **frontend `src/*` 수정 0건** — `scripts/etl/` 경로의 Node 실행 전용 모듈, Vite tree-shaking으로
  client bundle 미포함. 1차-77 사후 검증 패턴 동형.
- **`VITE_NEIS_API_KEY` 사용 0건** — `VITE_*` prefix는 client bundle에 노출되므로 인증키 사용 금지.
  `ETL_API_KEY_*` prefix만 (1차-75 정책 일관).
- **production 노출 0건**:
  - Vercel mock mode 그대로 유지 (`VITE_DATA_SOURCE` 미설정 정책).
  - `/etl-data/*` 3종 404 그대로.
  - 1차-79 신규 모듈은 `scripts/etl/` 경로라 Vite tree-shaking 자동 제외.
- **개인정보/민감정보 노출 설계 0건**: 본 helper는 raw text를 fetch + 저장만 수행. 파싱·노출은
  기존 1차-75 `ingestNeisSchoolBasic` parser (11 슬롯 + PII 차단 회귀 테스트) 책임.
- **clean/master/mart 연결 0건**: 1차-79 단독으로는 raw 저장까지만. cleanSchools →
  buildSchoolMasterReal → mart.real 진입은 사용자 합의 후 별도 단계 (1차-83+ 보류).
- **1차-81+ 후속 단계 (보류)**:
  - 사용자 NEIS API key 발급 → `.env.local` 입력
  - `npm run etl:real:neis-fetch -- --dry-run`으로 안전 검증
  - 정상 모드 실행 → raw JSON 1~N건 저장
  - 사람 검토 (학교명·NEIS 코드·라이선스·PII 의심 필드)
  - `data/raw.api/B/neis/REVIEW.md` 라이선스 검토 결과 기록
  - cleanSchools → buildSchoolMasterReal → mart.real pipeline 연결 합의 (별도 시점)
  - production 공개 정책 합의 (현재는 production mock 그대로)

### NEIS schoolInfo OpenAPI ingest scaffold (11-3 1차-75 — parser-only, 실제 API 호출 0건)

- **신규 ingest**: `scripts/etl/ingest/ingestNeisSchoolBasic.ts` — NEIS schoolInfo OpenAPI 응답
  (또는 inline mock JSON)을 `IngestedNeisSchoolRecord[]` 형태로 변환하는 **pure function parser**.
  fetch / axios / URL builder / live API helper 도입 0건. fs / process.env / API key 의존 0건.
- **신규 테스트**: `scripts/etl/__tests__/ingestNeisSchoolBasic.test.ts` — 15 케이스 (정상 wrapper /
  schoolId 패턴 / 한글 필드 매핑 / null 필드 / 빈/에러 응답 / RESULT.CODE 분기 / license source-based
  분기 / PII 차단 회귀 보호 / fetch helper 미등장 회귀 보호).
- **실제 NEIS OpenAPI 호출 0건**: 1차-75 scaffold 단계는 **parser-only**. 실제 호출은 후속 사용자
  manual 단계에서만 진행 (Claude Code / CI / Vercel 호출 0건).
- **API key 정책 (CLAUDE.md §10 일관)**:
  - `ETL_API_KEY_*` prefix만 사용. `VITE_*` prefix는 client bundle에 노출되므로 인증키로 사용 금지.
  - `.env.example`에 `ETL_API_KEY_NEIS=` 빈 값 행 추가 (자리표시 + 안내 주석).
  - 실제 키 값은 사용자가 `.env.local`(gitignored, `*.local` line 13으로 보호)에 직접 입력.
  - Claude Code는 key 입력 / echo / log 출력 0건.
- **raw 저장 정책**:
  - `.gitignore`에 `data/raw.api/` 라인 추가 — 향후 사용자 manual fetch 시 raw 응답 저장 위치.
  - 1차-75 단계에서는 `data/raw.api/` 디렉터리 실제 생성 0건.
- **frontend 직접 호출 금지 (CLAUDE.md §17 1차-74+ 계획 단계 합의값)**:
  - `src/services/*` / `src/components/*` / `src/App.tsx` 등 client code에서 NEIS API 호출 구현 금지.
  - `scripts/etl/` 경로는 Node 실행 전용 — Vite client bundle에 포함되지 않음.
  - `VITE_NEIS_API_KEY` 같은 `VITE_*` 인증키 사용 금지.
- **NEIS schoolInfo → IngestedNeisSchoolRecord 매핑 정책**:

  | NEIS 필드 | IngestedNeisSchoolRecord | 비고 |
  |---|---|---|
  | `SD_SCHUL_CODE` | `neisSchoolCode` + `schoolId: "school:neis:${SD_SCHUL_CODE}"` | NEIS 학교 표준 코드 |
  | `SCHUL_NM` | `schoolName` | 학교명 |
  | `SCHUL_KND_SC_NM` | `schoolLevel` | 한글 그대로 ("초등학교" 등) — cleanSchools 1차-7 한글 매핑이 영문 canonical 변환 |
  | `FOND_SC_NM` | `establishmentType` | 한글 그대로 ("공립"/"사립"/"국립") — cleanSchools 1차-7 매핑 |
  | `ORG_RDNMA` | `address` | 도로명 주소 |
  | `LCTN_SC_NM` | `sidoName` | 시도 명 |
  | (NEIS 필드 부재) | `schoolType` | `null` — NEIS schoolInfo 응답에 일반/특수 구분 별도 필드 없음 |
  | (NEIS 필드 부재) | `sigunguName` | `null` — master.real G admin_codes lookup 단계로 보류 |
  | (NEIS 필드 부재) | `latitude` / `longitude` | `null` — 별도 geocoding 단계 |

- **응답 처리 정책**:
  - `{ schoolInfo: [{ head }, { row }] }` 표준 wrapper → `body.row` 배열 매핑
  - `{ RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } }` (top-level error) →
    빈 records + `info` issue
  - `{ RESULT: { CODE: "ERROR-300", ... } }` 등 다른 error code → 빈 records + `warning` issue
  - 빈 객체 `{}` 또는 wrapper 부재 → 빈 records (issue 0건)
  - JSON parse 실패 → 한국어 메시지로 throw
- **license 정책 (ingestSchools 1차-2 동형)**:
  - `source.startsWith("real:")` → `license: "unknown"` (사람 검토 후 수동 갱신)
  - 그 외 (`"fixture:..."` 등) → `license: "demo-only"`
  - 공공누리 유형 자동 가정 0건 — `data/raw.api/B/neis/REVIEW.md` 같은 위치에 사용자가 사람 검토
    결과 수동 기록 권장
- **PII 차단 회귀 보호 (CLAUDE.md §5 정합)**:
  - NEIS schoolInfo OpenAPI 응답은 기관(학교) 단위라 학생/보호자 PII 부재.
  - `IngestedNeisSchoolRecord` 슬롯 외 필드(가상의 `STDNT_NM` / `PHONE_NMBR` / `EMAIL_ADDR` 등)는
    자동 누락 (ingestSchools.ts 1차-1 정책 일관).
  - 테스트가 `Object.keys(record)`가 11 허용 키 집합 내부에 있는지 회귀 보호.
- **mainIssue / policyUse / teacherUse 새 문장 창작 0건** — NEIS schoolInfo는 학교 단위 메타데이터만
  포함, 정책 문구·분석 문구 미포함.
- **production 노출 0건**:
  - Vercel mock mode 그대로 유지 (`VITE_DATA_SOURCE` 미설정 정책 일관).
  - `/etl-data/*` 3종 404 그대로.
  - 1차-75 신규 모듈은 `scripts/etl/` 경로라 Vite client bundle에 포함되지 않음 (tree-shaking).
- **1차-77+ 후속 단계 (보류)**:
  - (1) 사용자 NEIS API key 발급(공공데이터포털) → `.env.local` 직접 입력
  - (2) live fetch helper 도입 합의 (사용자 manual 실행 entry point — `runEtl.ts` flag 또는 별도 script)
  - (3) raw 응답 저장 위치 (`data/raw.api/B/neis/<YYYYMMDD>.json`) 사용자 manual 실행
  - (4) 사람 라이선스 검토 → ingest meta license 수동 갱신 (`unknown` → `공공누리 1유형` 등)
  - (5) ingest 결과를 기존 `cleanSchools` → `buildSchoolMasterReal` → mart.real pipeline에 연결
  - (6) production 공개 정책 합의 (현재는 production mock 그대로)

### curated region text schema 인프라 추가 (11-3 1차-67 — schema-only)

- **신규 fixture**: `curated_region_text_sample.json` — region별 사람 작성·검토 분석 문구
  (mainIssue / policyUse / teacherUse) registry의 자리표시 schema. **records는 빈 배열로
  시작**하며 실제 문구는 사용자가 별도 단계에서 사람 검수 결과로만 채운다 (1차-67 단독은
  schema-only).
- **신규 helper**: `src/data/curatedRegionText.ts` — `CuratedRegionText` / `CuratedRegionTextMeta`
  type 정의 + `getCuratedRegionTexts()` / `getCuratedRegionText(regionCode)` exact lookup helper.
  records 빈 배열이라 1차-67에서 어떤 regionCode 인자도 `undefined` 반환.
- **정책 강제 (`_meta.policy`)**:
  - `aiGeneratedAllowed: false` — AI 정책 문구 생성 금지 (1차-55 official resource registry 정책 동형)
  - `humanReviewRequired: true` — 사람 검수 결과만 등록
  - `minimumReviewFields: ["curator", "reviewedAt"]` — "사람 검수 완료" 라벨 부여를 위해 record에 필수 필드
- **`_meta` 값**: `source: "demo:curated-region-text-registry"` / `license: "human-curated"` /
  `datasetCategory: "curated-region-text"` / `note`에 "AI 정책 생성이 아닙니다" 부정 + "사람
  검수 결과만 등록" + "1차-67 schema-only" + "regionAdapter fallback chain 연결 0건" +
  "regionCode 정확 매칭만, 자동 매칭이 아님" + 통일 안내 문구 ("공식 자료를 기반으로 한 시연용
  초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.")
- **record schema (후속 단계에서 사용자가 채울 때)**: `regionCode` (정확 lookup key) /
  `regionCodeType?` (`"sigungu" | "sido" | "demo"`) / `mainIssue?` / `policyUse?` /
  `teacherUse?` (1~2문장, 사람 작성) / `curator` (PII 회피 — 가공명·역할명 권장, 예: "교사 검토자 A") /
  `reviewedAt` (ISO 8601 KST) / `reviewVersion` (예: "v1.0") / `sourceNote?` (외부 보고서 인용 시
  출처 안내, 본문 발췌·복제 금지) / `aiGenerated: false` (리터럴 타입 강제).
- **regionAdapter fallback chain 연결 미도입**: 1차-67은 schema-only — `src/lib/dashboard/regionAdapter.ts`
  fallback chain (`region.X ?? legacyFallbackRegion?.X ?? ""`) 무수정. helper export만
  존재하고 호출자 0건. fallback chain 진입은 1차-69+ 별도 합의에서만.
- **Dashboard / RegionalAnalysis UI 미수정**: 1차-67은 schema-only — 화면 변화 0건.
  RegionalAnalysis 통합·다른 화면 통합·검수 메타 UI 노출 등은 별도 단계.
- **자동 추천 helper 미등장 회귀 보호**: `byRegion` / `forRegion` / `matchByPattern` /
  `recommendForRegion` / `autoMatch` / `generateText` 등 자동 추천 변형 export 0건 (테스트로
  회귀 보호). `getCuratedRegionText(regionCode)`는 정확 매칭(exact lookup)만 — record 인접성
  / 시도 단위 fallback / 자동 매칭 분기 모두 미도입.
- **테스트**: `src/data/__tests__/curatedRegionText.test.ts` 신규 15건 — records 빈 배열 검증 /
  `_meta` 6 정책 필드 검증 / helper 정확 매칭 + edge case (`""` / DEMO / KOSTAT) / aiGenerated
  false 강제 / 자동 추천 helper 미등장 회귀 보호.
- **1차-69+ 후속 단계**: (1) 사용자가 사람 검수 텍스트 1~N건 fixture에 추가 (Claude Code는
  텍스트 작성 0건) / (2) regionAdapter fallback chain 1순위 진입 합의 — `curatedText.X ??
  region.X ?? legacyFallbackRegion?.X ?? ""` / (3) RegionalAnalysis 통합 + 검수 메타 UI 노출
  정책 / (4) RecommendationResult 등 다른 화면 통합.

### official resource registry KEAD 지역본부·지사 안내 추가 (11-3 1차-64)

- **Dashboard 공식자료 카드 5건 우선순위 (1차-64 최종)**:
  1. `kead-online-occupational-test-guidance` — KEAD 온라인 직업심리검사 안내 (`featuredOrder: 1`)
  2. `nise-teemh-intro` — NISE-TEEMH 소개 (`featuredOrder: 2`)
  3. `nise-workshop-2026-737999` — 2026년 NISE 워크숍 (boardSeq=737999, `featuredOrder: 3`)
  4. `careernet-data-list` — 커리어넷 자료실 (`featuredOrder: 4`)
  5. **`kead-regional-branches` — 한국장애인고용공단 지역본부·지사 안내 (1차-64 신규, `featuredOrder: 5`)**
- **신규 카드 정책**: 지역본부·지사 확인용 **link-only 공식 안내 페이지**. 지역별 자동 추천이 아니라 사용자가 KEAD 페이지에서 자기 지역의 지사를 직접 확인. **정확한 관할은 원문에서 최종 확인**. organization: 한국장애인고용공단 (KEAD). organizationType: public-institution. sourceType: official-site. freshnessTier: current. url: `https://www.kead.or.kr/directions/directionsOtherPage.do?menuId=MENU0819&searchType=1`. category: "지역 안내 / 전환교육 연계".
- **regionCode → 기관 자동 매칭 미도입**: 1차-64는 단순 카드 추가만. `getOfficialResources()` / `getFeaturedOfficialResources(limit)` helper signature 변경 0건. region 인자 받는 helper 신규 등장 0건 (테스트로 회귀 보호 — `byRegion` / `forRegion` / `byRegionCode` / `regionalAgencies` / `matchAgencyToRegion` / `getResourcesByRegion` 등 export 0건 검증). RegionalAnalysis 통합 0건. 선택 지역에 따라 다른 기관을 보여주는 기능 0건. "이 지역 담당 기관" 단정 표현 0건.
- **registry 총수 변화**: 4건 (1차-60) → **5건 (1차-64)**. `getOfficialResources()` 결과 길이 5. `getFeaturedOfficialResources(6)` 결과 길이 5.
- **`featuredOrder` 확장**: 1차-60의 [1,2,3,4]에 5번이 추가되어 [1,2,3,4,5].
- **registry `_meta.note` 갱신**: "11-3 1차-64 정책으로 사용자 지정 4개 공식자료(KEAD 직업심리검사 / NISE-TEEMH / NISE 2026 워크숍 / CareerNet 자료실) + KEAD 지역본부·지사 확인 링크 1건 = 총 5건" + "지역별 자동 추천이 아니라 사용자가 KEAD 페이지에서 지역본부·지사를 직접 확인하는 link-only 안내" + "정확한 관할은 원문에서 최종 확인" + 통일 안내 문구 그대로.
- **별도 fixture 미신설**: `official_agencies_sample.json` 등 별도 registry 신규 생성 0건. 기존 `official_resources_sample.json` 1개 fixture에 5번째 record로 통합.
- **개인정보성 데이터 등록 금지**: 담당자명·개인 전화번호·이메일 등 PII 0건. 기관 단위 안내 페이지 URL만 등록.
- **1차-55 / 1차-57 / 1차-58 / 1차-60 정책 유지**: link-only / 본문 전문 복제 금지 / `aiGenerated: false` / `_meta.policy.aiGeneratedAllowed: false` / `fullTextCopyAllowed: false` / `humanReviewRequired: true` 모두 그대로. AI 정책 문구 생성 금지 / mainIssue·policyUse·teacherUse 새 문장 창작 금지 / 통일 안내 문구 ("공식 자료를 기반으로 한 시연용 초안이며, 실제 활용 전 교사의 종합적인 검토가 필요합니다.") 모두 그대로. Dashboard.tsx의 `getFeaturedOfficialResources(6)` 호출 그대로 유지 (5건 자연 반환 — 코드 변경 0).

## 갱신 정책

- fixture 데이터는 **commit 가능**합니다(`data/fixtures/`는 `.gitignore`되지 않음).
- 다른 단계 산출물(`data/clean/`, `data/master/`, `data/mart/`, `data/indicator/`, `data/raw/`, `data/clean.real/`, `data/master.real/`, `data/mart.real/`, `data/indicator.real/`)은 `.gitignore` 대상.
- 실제 공공데이터 원문은 절대 commit하지 않습니다.
- official resource registry는 AI 생성 금지 정책 유지. 모든 record `aiGenerated: false`. 사람 검수 결과만 갱신.
