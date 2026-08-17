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
    const err = axiosError as (AxiosError<{ error?: string; code?: string }>) & { code?: string };
    const responseData = err.response?.data;
    return {
      error: {
        status: err.response?.status,
        data: responseData?.error ?? err.message,
        code: responseData?.code ?? err.code,
      },
    };
  }
};
