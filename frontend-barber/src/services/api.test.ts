import { describe, expect, it, vi } from 'vitest';
import type { AxiosError } from 'axios';

const requestUse = vi.fn();
const responseUse = vi.fn();

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: requestUse },
          response: { use: responseUse },
        },
      })),
    },
  };
});

describe('api interceptors', () => {
  it('adds Authorization header when token exists', async () => {
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('token123'),
    };
    vi.stubGlobal('localStorage', localStorageMock);

    await import('./api');

    const requestHandler = requestUse.mock.calls[0][0];
    const config = { headers: {} } as { headers: Record<string, string> };
    const result = requestHandler(config);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
    expect(result.headers.Authorization).toBe('Bearer token123');
  });

  it('normalizes error responses', async () => {
    await import('./api');

    const responseErrorHandler = responseUse.mock.calls[0][1];
    const error = {
      response: { data: { error: 'Bad request' } },
    } as AxiosError<{ error?: string }>;

    await expect(responseErrorHandler(error)).rejects.toThrow('Bad request');
  });

  it('returns network error message', async () => {
    await import('./api');

    const responseErrorHandler = responseUse.mock.calls[0][1];
    const error = {
      code: 'ECONNREFUSED',
      message: 'Network Error',
    } as AxiosError;

    await expect(responseErrorHandler(error)).rejects.toThrow('No se pudo conectar al servidor');
  });
});
