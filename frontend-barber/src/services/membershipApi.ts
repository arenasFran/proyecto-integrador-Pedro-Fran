import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type {
  MyMembershipResponse,
  Membership,
  CreateMembershipPayload,
  MembershipWithUser,
} from '../types/membership';

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
  }),
});

export const {
  useGetMyMembershipQuery,
  useCreateMembershipMutation,
  useGetAllMembershipsQuery,
  useGetMembershipByIdQuery,
  useGetMembershipByUserIdQuery,
  useRedeemCouponMutation,
  useCancelMembershipMutation,
  useReactivateMembershipMutation,
} = membershipApi;
