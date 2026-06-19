import type { AxiosError } from 'axios';
import api from './api';

export const axiosBaseQuery = async ({ url, method, data, params }: {
  url: string;
  method?: string;
  data?: unknown;
  params?: Record<string, unknown>;
}) => {
  try {
    const result = await api({
      url,
      method: method ?? 'GET',
      data,
      params,
    });
    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError<{ error?: string }>;
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data?.error ?? err.message,
      },
    };
  }
};
