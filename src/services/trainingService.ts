/**
 * Training service. 묶음 C — HRD-Net·발달장애인훈련센터 등의 훈련과정.
 */

import { callAdapter, getDataAdapter } from "./_adapter";

export const trainingService = {
  /** 시군구의 TrainingProgram 목록 */
  getTrainingProgramsByRegion(regionCode: string) {
    return callAdapter("training", () =>
      getDataAdapter().fetchTrainingProgramsByRegion(regionCode),
    );
  },
};
