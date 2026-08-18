import type { Dispatch } from '@reduxjs/toolkit';
import { paymentApi } from './paymentApi';

export function invalidatePaymentsAfterSuccess(queryFulfilled: Promise<unknown>, dispatch: Dispatch): void {
  void queryFulfilled.then(
    () => {
      dispatch(paymentApi.util.invalidateTags(['Payment']));
    },
    () => undefined,
  );
}
