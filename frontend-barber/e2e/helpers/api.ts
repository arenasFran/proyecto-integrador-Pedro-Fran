import { request } from '@playwright/test';
import type { TestUser } from './test-data';

const apiBaseUrl = 'http://localhost:3000';

export const registerUser = async (user: TestUser) => {
  const context = await request.newContext({ baseURL: apiBaseUrl });
  const response = await context.post('/auth/register', { data: user });
  await context.dispose();
  return response;
};

export const sendTwoFactorCode = async (email: string, password: string) => {
  const context = await request.newContext({ baseURL: apiBaseUrl });
  const response = await context.post('/auth/2fa/send', {
    data: { email, password },
  });
  await context.dispose();
  return response;
};

export const verifyTwoFactorCode = async (email: string, code: string) => {
  const context = await request.newContext({ baseURL: apiBaseUrl });
  const response = await context.post('/auth/2fa/verify', {
    data: { email, code },
  });
  await context.dispose();
  return response;
};

export const getTwoFactorCode = async (email: string): Promise<string> => {
  const context = await request.newContext({ baseURL: apiBaseUrl });
  const response = await context.get('/__test/two-factor-code', {
    params: { email },
  });
  const data = await response.json() as { code: string };
  await context.dispose();
  if (!response.ok()) {
    throw new Error(`No se pudo obtener el código 2FA para ${email}`);
  }
  return data.code;
};
