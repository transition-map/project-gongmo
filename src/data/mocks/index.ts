/**
 * 4단계 mock 데이터 barrel.
 *
 * - 모든 도메인 mock array는 named export로 노출.
 * - `_shared`의 helper·상수는 mock 작성 도구로만 사용하며, 외부 컴포넌트는
 *   필요 시 직접 `./_shared`에서 import한다.
 *
 * 본 모듈은 화면 컴포넌트에서 즉시 import되지 않는다.
 * 5단계 API service layer / 7단계 컴포넌트 마이그레이션 시점에 연결된다.
 */

export { regions } from "./regions.mock";
export { schools } from "./schools.mock";
export { institutions } from "./institutions.mock";
export { trainingPrograms } from "./trainingPrograms.mock";
export { careerExperiencePrograms } from "./careerExperiencePrograms.mock";
export { jobPostings } from "./jobPostings.mock";
export { employmentOutcomes } from "./employmentOutcomes.mock";
export { welfareFacilities } from "./welfareFacilities.mock";
export { mobilityAccess } from "./mobilityAccess.mock";
export {
  TRANSITION_INDEX_NOTE,
  transitionIndexes,
} from "./transitionIndexes.mock";
export { recommendations } from "./recommendations.mock";
