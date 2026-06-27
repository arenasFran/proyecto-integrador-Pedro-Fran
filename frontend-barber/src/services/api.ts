import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let _accessToken: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _dispatch: ((action: any) => void) | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => _accessToken;

export const setupDispatch = (dispatch: (action: { type: string }) => void) => {
  _dispatch = dispatch;
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

const refreshTokens = async (): Promise<string> => {
  const { data } = await axios.post<{ token: string; refreshToken: string }>(
    `${API_URL}/auth/refresh`,
    {},
    { withCredentials: true }
  );
  setAccessToken(data.token);
  if (_dispatch) {
    _dispatch({ type: 'auth/setLoginToken', payload: data.token });
  }
  return data.token;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthError = error.response?.status === 401 ||
      (error.response?.status === 403 && error.response?.data?.error === 'Token inválido');

    if (isAuthError && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = await refreshTokens();
        processQueue(null, token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        if (_dispatch) {
          _dispatch({ type: 'auth/logout' });
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const errorData = error.response?.data as { error?: string; message?: string } | undefined;
    const errMsg = errorData?.error ?? errorData?.message;
    if (errMsg) {
      return Promise.reject(new Error(errMsg));
    }
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      return Promise.reject(new Error('No se pudo conectar al servidor'));
    }
    return Promise.reject(error);
  }
);

export const silentRefresh = async (): Promise<boolean> => {
  if (isRefreshing) {
    return new Promise<boolean>((resolve) => {
      failedQueue.push({
        resolve: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  isRefreshing = true;
  try {
    await refreshTokens();
    processQueue(null, _accessToken);
    return true;
  } catch {
    setAccessToken(null);
    processQueue(null, null);
    return false;
  } finally {
    isRefreshing = false;
  }
};

export default api;
