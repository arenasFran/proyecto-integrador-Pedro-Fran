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

    getAllMemberships: builder.query<MembershipWithUser[], { status?: string; search?: string }>({
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

    redeemCoupon: builder.mutation<{ remainingCoupons: number; couponsUsed: number }, { userId: string }>({
      query: (data) => ({
        url: '/api/memberships/redeem',
        method: 'POST',
        data,
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
  useRedeemCouponMutation,
} = membershipApi;
