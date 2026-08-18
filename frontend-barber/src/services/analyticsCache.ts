import type { Dispatch } from '@reduxjs/toolkit';
import { analyticsApi } from './analyticsApi';

export function invalidateAnalyticsAfterSuccess(queryFulfilled: Promise<unknown>, dispatch: Dispatch): void {
  void queryFulfilled.then(
    () => {
      dispatch(analyticsApi.util.invalidateTags(['Analytics']));
    },
    () => undefined,
  );
}
