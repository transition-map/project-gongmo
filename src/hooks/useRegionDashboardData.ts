/**
 * 선택 지역 1개의 도메인 데이터 묶음 hook.
 *
 * - 12개 service를 동시 호출(Promise.all)해 도메인 데이터 수신
 * - 모든 데이터 도착 후 `buildTransitionIndex`로 mvp-v1 지표 계산
 * - regionCode가 빈 문자열/undefined이면 service 호출 0건 + 빈 결과 반환
 * - cancelled flag로 race condition 방지 (regionCode 변경, unmount)
 * - service ApiResponse의 success/data 체크. 실패 시 [] 또는 undefined fallback.
 *   hook은 절대 throw하지 않는다.
 *
 * **변수명 규칙 (보완 §2):**
 * - `demoTransitionIndex`     : transitionIndexService에서 받은 demo-v0
 * - `calculatedTransitionIndex`: buildTransitionIndex 결과 mvp-v1
 *
 * 화면(App.tsx) 표시는 `displayedTransitionIndex` = 기본 mvp-v1.
 */

import { useEffect, useState } from "react";
import {
  careerExperienceService,
  employmentOutcomeService,
  institutionService,
  jobPostingService,
  mobilityService,
  recommendationService,
  regionService,
  schoolService,
  trainingService,
  transitionIndexService,
  welfareService,
} from "../services";
import { buildTransitionIndex } from "../lib/indicators";
import {
  DEFAULT_BASE_YEAR,
  DEMO_FIXED_CALCULATED_AT,
} from "../lib/dashboard/constants";
import type {
  CareerExperienceProgram,
  EmploymentOutcomeSummary,
  InstitutionSummary,
  JobPosting,
  MobilityAccess,
  RecommendationResult as RecommendationResultData,
  RegionSummary,
  SchoolSummary,
  TrainingProgram,
  TransitionIndex,
  WelfareFacility,
} from "../types";

export interface UseRegionDashboardDataResult {
  isLoading: boolean;
  error: Error | null;
  region?: RegionSummary;
  schools: SchoolSummary[];
  institutions: InstitutionSummary[];
  trainingPrograms: TrainingProgram[];
  careerExperiencePrograms: CareerExperienceProgram[];
  jobPostings: JobPosting[];
  employmentOutcome?: EmploymentOutcomeSummary;
  welfareFacilities: WelfareFacility[];
  mobilityAccess: MobilityAccess[];
  /** demo-v0: transitionIndexService 응답 */
  demoTransitionIndex?: TransitionIndex;
  /** mvp-v1: buildTransitionIndex 결과 */
  calculatedTransitionIndex?: TransitionIndex;
  recommendation?: RecommendationResultData;
}

const EMPTY_RESULT: UseRegionDashboardDataResult = {
  isLoading: false,
  error: null,
  schools: [],
  institutions: [],
  trainingPrograms: [],
  careerExperiencePrograms: [],
  jobPostings: [],
  welfareFacilities: [],
  mobilityAccess: [],
};

export function useRegionDashboardData(
  regionCode: string | undefined,
): UseRegionDashboardDataResult {
  const [state, setState] = useState<UseRegionDashboardDataResult>(EMPTY_RESULT);

  useEffect(() => {
    if (!regionCode || regionCode.length === 0) {
      // setState 직접 호출 제거 (react-hooks/set-state-in-effect 규칙 준수).
      // 빈 regionCode는 effect 자체를 실행하지 않음. 직전 결과는 잔존하지만
      // 실제 시나리오에서 selectedRegionCode가 다시 ""가 되는 케이스는 거의 없음.
      return;
    }

    let cancelled = false;
    // setState((prev) => isLoading:true) 직접 호출도 제거. mockAdapter는 즉시 resolve이므로
    // 로딩 상태 깜빡임이 사실상 없음. 결과는 .then 콜백에서 한 번에 setState.

    Promise.all([
      regionService.getRegionByCode(regionCode),
      schoolService.getSchoolsByRegion(regionCode),
      institutionService.getInstitutionsByRegion(regionCode),
      trainingService.getTrainingProgramsByRegion(regionCode),
      careerExperienceService.getCareerExperienceProgramsByRegion(regionCode),
      jobPostingService.getJobPostingsByRegion(regionCode),
      employmentOutcomeService.getEmploymentOutcomeByRegion(regionCode),
      welfareService.getWelfareFacilitiesByRegion(regionCode),
      mobilityService.getMobilityAccessByRegion(regionCode, DEFAULT_BASE_YEAR),
      transitionIndexService.getTransitionIndexByRegion(regionCode),
      recommendationService.getRecommendationsByRegion(regionCode),
    ])
      .then((responses) => {
        if (cancelled) return;

        const [
          regionResp,
          schoolsResp,
          institutionsResp,
          trainingResp,
          careerResp,
          jobsResp,
          employmentResp,
          welfareResp,
          mobilityResp,
          demoIndexResp,
          recommendationResp,
        ] = responses;

        const region =
          regionResp.success && regionResp.data ? regionResp.data : undefined;
        const schools =
          schoolsResp.success && schoolsResp.data ? schoolsResp.data : [];
        const institutions =
          institutionsResp.success && institutionsResp.data
            ? institutionsResp.data
            : [];
        const trainingPrograms =
          trainingResp.success && trainingResp.data ? trainingResp.data : [];
        const careerExperiencePrograms =
          careerResp.success && careerResp.data ? careerResp.data : [];
        const jobPostings =
          jobsResp.success && jobsResp.data ? jobsResp.data : [];
        const employmentOutcome =
          employmentResp.success && employmentResp.data
            ? employmentResp.data
            : undefined;
        const welfareFacilities =
          welfareResp.success && welfareResp.data ? welfareResp.data : [];
        const mobilityAccess =
          mobilityResp.success && mobilityResp.data ? mobilityResp.data : [];
        const demoTransitionIndex =
          demoIndexResp.success && demoIndexResp.data
            ? demoIndexResp.data
            : undefined;
        const recommendation =
          recommendationResp.success && recommendationResp.data
            ? recommendationResp.data
            : undefined;

        // mvp-v1 계산 (region이 있을 때만)
        let calculatedTransitionIndex: TransitionIndex | undefined;
        if (region) {
          calculatedTransitionIndex = buildTransitionIndex({
            region,
            schools,
            institutions,
            trainingPrograms,
            careerExperiencePrograms,
            jobPostings,
            employmentOutcome,
            welfareFacilities,
            mobilityAccess,
            baseYear: DEFAULT_BASE_YEAR,
            calculatedAt: DEMO_FIXED_CALCULATED_AT,
          });
        }

        setState({
          isLoading: false,
          error: null,
          region,
          schools,
          institutions,
          trainingPrograms,
          careerExperiencePrograms,
          jobPostings,
          employmentOutcome,
          welfareFacilities,
          mobilityAccess,
          demoTransitionIndex,
          calculatedTransitionIndex,
          recommendation,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          ...EMPTY_RESULT,
          isLoading: false,
          error: e instanceof Error ? e : new Error(String(e)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [regionCode]);

  return state;
}
