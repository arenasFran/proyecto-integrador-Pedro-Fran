import type { Dispatch } from '@reduxjs/toolkit';
import { membershipApi } from './membershipApi';

export function invalidateMembershipAfterSuccess(queryFulfilled: Promise<unknown>, dispatch: Dispatch): void {
  void queryFulfilled.then(
    () => {
      dispatch(membershipApi.util.invalidateTags(['Membership', 'Memberships', 'Transactions']));
    },
    () => undefined,
  );
}
