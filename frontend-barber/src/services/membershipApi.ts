import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type {
  MyMembershipResponse,
  Membership,
  CreateMembershipPayload,
  MembershipWithUser,
  MembershipTransaction,
} from '../types/membership';
import type { InitiatePaymentResponse } from '../types/payment';
import { invalidateAnalyticsAfterSuccess } from './analyticsCache';

export const membershipApi = createApi({
  reducerPath: 'membershipApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Membership', 'Memberships', 'Transactions'],
  endpoints: (builder) => ({
    getMyMembership: builder.query<MyMembershipResponse, void>({
      query: () => ({ url: '/api/memberships/mine' }),
      providesTags: ['Membership'],
    }),

    createMembership: builder.mutation<Membership, CreateMembershipPayload>({
      query: (data) => ({ url: '/api/memberships', method: 'POST', data }),
      invalidatesTags: ['Membership', 'Memberships'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),

    getAllMemberships: builder.query<{ data: MembershipWithUser[]; total: number; page: number; totalPages: number; limit: number }, { status?: string; search?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: '/api/memberships', params }),
      providesTags: ['Memberships'],
    }),

    getPendingMemberships: builder.query<{ data: MembershipWithUser[] }, void>({
      query: () => ({ url: '/api/memberships/pending' }),
      providesTags: ['Memberships'],
    }),

    getExpiringSoon: builder.query<{ data: (MembershipWithUser & { daysLeft: number })[]; days: number }, { days?: number }>({
      query: (params) => ({ url: '/api/memberships/expiring-soon', params }),
      providesTags: ['Memberships'],
    }),

    getMembershipById: builder.query<Membership, string>({
      query: (id) => ({ url: `/api/memberships/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Membership', id }],
    }),

    getMembershipByUserId: builder.query<MyMembershipResponse, string>({
      query: (userId) => ({ url: `/api/memberships/user/${userId}` }),
      providesTags: ['Membership'],
    }),

    cancelMembership: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/memberships/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Membership', 'Memberships', 'Transactions'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),

    initiateMembershipPayment: builder.mutation<InitiatePaymentResponse, { userId: string }>({
      query: (data) => ({ url: '/api/memberships/initiate-payment', method: 'POST', data }),
      invalidatesTags: ['Membership', 'Memberships', 'Transactions'],
    }),

    retryMembershipPayment: builder.mutation<InitiatePaymentResponse, { userId: string }>({
      query: (data) => ({ url: '/api/memberships/retry-payment', method: 'POST', data }),
      invalidatesTags: ['Membership', 'Memberships', 'Transactions'],
    }),

    redeemCoupon: builder.mutation<{ remainingCoupons: number; couponsUsed: number }, { userId: string }>({
      query: (data) => ({ url: '/api/memberships/redeem', method: 'POST', data }),
      invalidatesTags: ['Membership', 'Memberships', 'Transactions'],
    }),

    approvePendingMembership: builder.mutation<Membership, string>({
      query: (id) => ({ url: `/api/memberships/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Membership', 'Memberships', 'Transactions'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),

    getTransactions: builder.query<{ data: MembershipTransaction[]; total: number; page: number; totalPages: number; limit: number }, {
      membershipId?: string;
      userId?: string;
      desde?: string;
      hasta?: string;
      paymentMethod?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({ url: '/api/memberships/transactions', params }),
      providesTags: ['Transactions'],
    }),

    getCouponHistory: builder.query<
      { membershipId: string; couponsTotal: number; couponsUsed: number; remainingCoupons: number; history: Array<{ appointmentId: string; date: string; startTime: string; serviceName: string; servicePrice: number; status: string; couponRestored: boolean; restoredAt: string | null }> },
      string
    >({
      query: (id) => ({ url: `/api/memberships/${id}/coupon-history` }),
      providesTags: ['Membership'],
    }),

    addCoupons: builder.mutation<
      { membershipId: string; couponsTotal: number; couponsUsed: number; remainingCoupons: number },
      { id: string; count: number }
    >({
      query: ({ id, count }) => ({ url: `/api/memberships/${id}/coupons`, method: 'PUT', data: { count } }),
      invalidatesTags: ['Membership', 'Memberships'],
    }),
  }),
});

export const {
  useGetMyMembershipQuery,
  useCreateMembershipMutation,
  useGetAllMembershipsQuery,
  useGetPendingMembershipsQuery,
  useGetExpiringSoonQuery,
  useGetMembershipByIdQuery,
  useGetMembershipByUserIdQuery,
  useCancelMembershipMutation,
  useInitiateMembershipPaymentMutation,
  useRetryMembershipPaymentMutation,
  useRedeemCouponMutation,
  useApprovePendingMembershipMutation,
  useGetTransactionsQuery,
  useGetCouponHistoryQuery,
  useAddCouponsMutation,
} = membershipApi;
