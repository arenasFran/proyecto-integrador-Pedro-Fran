import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { HistorialAnalisisCorte } from '../types/analisisCorte';

export const analisisCorteApi = createApi({
  reducerPath: 'analisisCorteApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['AnalisisCorte'],
  endpoints: (builder) => ({
    getHistorialAnalisisCorte: builder.query<HistorialAnalisisCorte, void>({
      query: () => ({ url: '/api/analisis-corte/historial' }),
      providesTags: ['AnalisisCorte'],
    }),
  }),
});

export const { useGetHistorialAnalisisCorteQuery } = analisisCorteApi;
