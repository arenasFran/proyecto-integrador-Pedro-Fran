import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type {
  MyMembershipResponse,
  Membership,
  CreateMembershipPayload,
  MembershipWithUser,
} from '../types/membership';
import type { InitiatePaymentResponse, CreateSubscriptionResponse } from '../types/payment';

export const membershipApi = createApi({
  reducerPath: 'membershipApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Membership', 'Memberships'],
  endpoints: (builder) => ({
    getMyMembership: builder.query<MyMembershipResponse, void>({
      query: () => ({
        url: '/api/memberships/mine',
      }),
      providesTags: ['Membership'],
    }),

    createMembership: builder.mutation<Membership, CreateMembershipPayload>({
      query: (data) => ({
        url: '/api/memberships',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Membership', 'Memberships'],
    }),

    createSubscription: builder.mutation<CreateSubscriptionResponse, { userId: string; email: string }>({
      query: (data) => ({
        url: '/api/memberships/create-subscription',
        method: 'POST',
        data,
      }),
    }),

    cancelSubscription: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/memberships/${id}/cancel-subscription`,
        method: 'POST',
      }),
      invalidatesTags: ['Membership'],
    }),

    initiateMembershipPayment: builder.mutation<InitiatePaymentResponse, { userId: string }>({
      query: (data) => ({
        url: '/api/memberships/initiate-payment',
        method: 'POST',
        data,
      }),
    }),

    getAllMemberships: builder.query<{ data: MembershipWithUser[]; total: number; page: number; totalPages: number; limit: number }, { status?: string; search?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: '/api/memberships',
        params,
      }),
      providesTags: ['Memberships'],
    }),

    getMembershipById: builder.query<Membership, string>({
      query: (id) => ({
        url: `/api/memberships/${id}`,
      }),
      providesTags: (_result, _error, id) => [{ type: 'Membership', id }],
    }),

    getMembershipByUserId: builder.query<MyMembershipResponse, string>({
      query: (userId) => ({
        url: `/api/memberships/user/${userId}`,
      }),
      providesTags: ['Membership'],
    }),

    redeemCoupon: builder.mutation<{ remainingCoupons: number; couponsUsed: number }, { userId: string }>({
      query: (data) => ({
        url: '/api/memberships/redeem',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Membership'],
    }),

    cancelMembership: builder.mutation<Membership, string>({
      query: (id) => ({
        url: `/api/memberships/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Membership'],
    }),

    reactivateMembership: builder.mutation<Membership, string>({
      query: (id) => ({
        url: `/api/memberships/${id}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['Membership'],
    }),

    requestLocalPayment: builder.mutation<Membership, { userId: string }>({
      query: (data) => ({
        url: '/api/memberships/request-local',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Membership', 'Memberships'],
    }),

    approvePendingMembership: builder.mutation<Membership, string>({
      query: (id) => ({
        url: `/api/memberships/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Membership', 'Memberships'],
    }),
  }),
});

export const {
  useGetMyMembershipQuery,
  useCreateMembershipMutation,
  useCreateSubscriptionMutation,
  useCancelSubscriptionMutation,
  useInitiateMembershipPaymentMutation,
  useGetAllMembershipsQuery,
  useGetMembershipByIdQuery,
  useGetMembershipByUserIdQuery,
  useRedeemCouponMutation,
  useCancelMembershipMutation,
  useReactivateMembershipMutation,
  useRequestLocalPaymentMutation,
  useApprovePendingMembershipMutation,
} = membershipApi;
