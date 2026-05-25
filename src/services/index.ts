/**
 * Service layer barrel.
 *
 * 컴포넌트는 `import { regionService } from "../services"` 형태로만 접근한다.
 * mock 데이터를 직접 import하는 곳은 `adapters/mockAdapter.ts` 단일 파일이며,
 * 다른 service 파일이나 컴포넌트는 mock 경로를 참조하지 않는다.
 *
 * httpAdapter는 5단계 stub. 환경변수 `VITE_DATA_SOURCE=http` 설정 시 호출되며,
 * 실제 구현은 8단계 이후. service의 callAdapter()가 throw를 catch해
 * ApiResponse.success: false / error.code: "FETCH_FAILED"로 변환한다.
 */

export { regionService } from "./regionService";
export { schoolService } from "./schoolService";
export { institutionService } from "./institutionService";
export { trainingService } from "./trainingService";
export { careerExperienceService } from "./careerExperienceService";
export { jobPostingService } from "./jobPostingService";
export { employmentOutcomeService } from "./employmentOutcomeService";
export { welfareService } from "./welfareService";
export { mobilityService } from "./mobilityService";
export { transitionIndexService } from "./transitionIndexService";
export { recommendationService } from "./recommendationService";

// Adapter 인터페이스·테스트 주입용 함수도 함께 노출.
// (테스트 도입 9단계 전까지는 사용처 없으나 인터페이스는 안정.)
export type { DataAdapter } from "./_adapter";
export { setDataAdapter, getDataAdapter } from "./_adapter";
