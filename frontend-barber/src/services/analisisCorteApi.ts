import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { HistorialAnalisisCorte } from '../types/analisisCorte';

type ImagenEjemploCorteRequest = {
  analisisId: string;
  corteIndex: number;
};

type ImagenEjemploCorteResponse = {
  imagenUrl: string;
};

export const analisisCorteApi = createApi({
  reducerPath: 'analisisCorteApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['AnalisisCorte'],
  endpoints: (builder) => ({
    getHistorialAnalisisCorte: builder.query<HistorialAnalisisCorte, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/api/analisis-corte/historial', params: params ?? undefined }),
      providesTags: ['AnalisisCorte'],
    }),
    generarImagenEjemploCorte: builder.mutation<ImagenEjemploCorteResponse, ImagenEjemploCorteRequest>({
      query: (data) => ({ url: '/api/analisis-corte/imagen-ejemplo', method: 'POST', data }),
    }),
  }),
});

export const { useGetHistorialAnalisisCorteQuery, useGenerarImagenEjemploCorteMutation } = analisisCorteApi;
