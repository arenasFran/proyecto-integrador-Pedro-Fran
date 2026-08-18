import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import { invalidateAnalyticsAfterSuccess } from './analyticsCache';

type SancionResponse = {
  message: string;
};

export const clientApi = createApi({
  reducerPath: 'clientApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['ClientSanction'],
  endpoints: (builder) => ({
    sancionarCliente: builder.mutation<
      SancionResponse,
      { clientId: string; motivo: string }
    >({
      query: ({ clientId, motivo }) => ({
        url: `/api/clients/${clientId}/sancion`,
        method: 'PATCH',
        data: { motivo },
      }),
      invalidatesTags: ['ClientSanction'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),

    levantarSancion: builder.mutation<SancionResponse, string>({
      query: (clientId) => ({
        url: `/api/clients/${clientId}/sancion/levantar`,
        method: 'PATCH',
      }),
      invalidatesTags: ['ClientSanction'],
      onQueryStarted: (_arg, { dispatch, queryFulfilled }) => invalidateAnalyticsAfterSuccess(queryFulfilled, dispatch),
    }),
  }),
});

export const {
  useSancionarClienteMutation,
  useLevantarSancionMutation,
} = clientApi;
