import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

export interface GenerateTelegramLinkTokenResponse {
  token: string;
  deepLink: string;
}

export const telegramApi = createApi({
  reducerPath: 'telegramApi',
  baseQuery: axiosBaseQuery,
  endpoints: (builder) => ({
    generateTelegramLinkToken: builder.mutation<GenerateTelegramLinkTokenResponse, void>({
      query: () => ({ url: '/api/telegram/link-token', method: 'POST' }),
    }),
  }),
});

export const { useGenerateTelegramLinkTokenMutation } = telegramApi;
