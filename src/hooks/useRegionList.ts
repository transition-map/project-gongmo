/**
 * 지역 목록 hook.
 *
 * `regionService.getRegions()`를 한 번 호출해 6개 시군구 RegionSummary 목록을
 * 반환한다. service 응답이 ApiResponse 형태이므로 success/data를 확인하고
 * 실패 시 빈 배열로 fallback한다 (throw 없음).
 *
 * - cancelled flag로 unmount race 방지.
 * - React Query/SWR 등 외부 라이브러리 미사용.
 */

import { useEffect, useState } from "react";
import { regionService } from "../services";
import type { RegionSummary } from "../types";

export interface UseRegionListResult {
  regions: RegionSummary[];
  isLoading: boolean;
  error: Error | null;
}

const INITIAL: UseRegionListResult = {
  regions: [],
  isLoading: true,
  error: null,
};

export function useRegionList(): UseRegionListResult {
  const [state, setState] = useState<UseRegionListResult>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    // INITIAL이 이미 isLoading:true이므로 useEffect 본문에서 setState 직접 호출하지 않음
    // (react-hooks/set-state-in-effect 규칙 준수). fetch 콜백에서만 setState.

    regionService
      .getRegions()
      .then((resp) => {
        if (cancelled) return;
        if (resp.success && Array.isArray(resp.data)) {
          setState({ regions: resp.data, isLoading: false, error: null });
        } else {
          setState({
            regions: [],
            isLoading: false,
            error: resp.error
              ? new Error(resp.error.message)
              : new Error("getRegions failed"),
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          regions: [],
          isLoading: false,
          error: e instanceof Error ? e : new Error(String(e)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
