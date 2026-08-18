import type { Dispatch } from '@reduxjs/toolkit';
import { productApi } from './productApi';

export function invalidateProductsAfterSuccess(queryFulfilled: Promise<unknown>, dispatch: Dispatch): void {
  void queryFulfilled.then(
    () => {
      dispatch(productApi.util.invalidateTags(['Products', 'Product']));
    },
    () => undefined,
  );
}
