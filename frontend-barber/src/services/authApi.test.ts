import { describe, expect, it, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

const mockApi = vi.hoisted(() => vi.fn());

vi.mock('./api', () => ({ default: mockApi }));

import { authApi } from './authApi';

function createStore() {
  return configureStore({
    reducer: { [authApi.reducerPath]: authApi.reducer },
    middleware: (gdm) => gdm().concat(authApi.middleware),
  });
}

describe('authApi', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  describe('peticiones exitosas', () => {
    it('sendTwoFactorCode envía POST a /auth/2fa/send', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Código enviado' } });
      const store = createStore();
      const result = await store.dispatch(
        authApi.endpoints.sendTwoFactorCode.initiate({ email: 'test@test.com', password: '123' })
      );
      expect(result.data).toEqual({ message: 'Código enviado' });
      expect(mockApi).toHaveBeenCalledWith({ url: '/auth/2fa/send', method: 'POST', data: { email: 'test@test.com', password: '123' } });
    });

    it('verifyTwoFactorCode envía POST a /auth/2fa/verify', async () => {
      const loginResp = { message: 'ok', token: 't', refreshToken: 'rt' };
      mockApi.mockResolvedValueOnce({ data: loginResp });
      const store = createStore();
      const result = await store.dispatch(
        authApi.endpoints.verifyTwoFactorCode.initiate({ email: 'test@test.com', code: '123456' })
      );
      expect(result.data).toEqual(loginResp);
      expect(mockApi).toHaveBeenCalledWith({
        url: '/auth/2fa/verify', method: 'POST', data: { email: 'test@test.com', code: '123456' },
      });
    });

    it('googleLogin envía POST a /auth/google', async () => {
      const googleResp = { message: 'ok', token: 't', refreshToken: 'rt' };
      mockApi.mockResolvedValueOnce({ data: googleResp });
      const store = createStore();
      const result = await store.dispatch(authApi.endpoints.googleLogin.initiate({ token: 'gt' }));
      expect(result.data).toEqual(googleResp);
      expect(mockApi).toHaveBeenCalledWith({ url: '/auth/google', method: 'POST', data: { token: 'gt' } });
    });

    it('completeGoogleProfile envía POST a /auth/google/complete-profile', async () => {
      const resp = { message: 'ok', token: 't', refreshToken: 'rt' };
      mockApi.mockResolvedValueOnce({ data: resp });
      const store = createStore();
      await store.dispatch(
        authApi.endpoints.completeGoogleProfile.initiate({ partialToken: 'pt', name: 'Juan' })
      );
      expect(mockApi).toHaveBeenCalledWith({
        url: '/auth/google/complete-profile', method: 'POST',
        data: { partialToken: 'pt', name: 'Juan' },
      });
    });

    it('refreshToken envía POST vacío a /auth/refresh', async () => {
      const resp = { message: 'ok', token: 't', refreshToken: 'rt' };
      mockApi.mockResolvedValueOnce({ data: resp });
      const store = createStore();
      const result = await store.dispatch(authApi.endpoints.refreshToken.initiate());
      expect(result.data).toEqual(resp);
      expect(mockApi).toHaveBeenCalledWith({ url: '/auth/refresh', method: 'POST', data: {} });
    });

    it('logout envía POST a /auth/logout', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Sesión cerrada' } });
      const store = createStore();
      const result = await store.dispatch(authApi.endpoints.logout.initiate());
      expect(result.data).toEqual({ message: 'Sesión cerrada' });
      expect(mockApi).toHaveBeenCalledWith({ url: '/auth/logout', method: 'POST' });
    });

    it('getProfile obtiene perfil de /api/users/me', async () => {
      const profile = { id: '1', name: 'Juan', lastname: 'Pérez', email: 'j@t.com', phone: '123', kind: 'Registrado' as const, photoUrl: null };
      mockApi.mockResolvedValueOnce({ data: profile });
      const store = createStore();
      const result = await store.dispatch(authApi.endpoints.getProfile.initiate());
      expect(result.data).toEqual(profile);
      expect(mockApi).toHaveBeenCalledWith({ url: '/api/users/me', method: 'GET' });
    });

    it('register envía POST a /auth/register', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Registrado' } });
      const store = createStore();
      const data = { email: 'a@b.com', password: '123', repeatPassword: '123', name: 'A', lastname: 'B', phone: '123' };
      await store.dispatch(authApi.endpoints.register.initiate(data));
      expect(mockApi).toHaveBeenCalledWith({ url: '/auth/register', method: 'POST', data });
    });

    it('requestReset envía POST a /auth/request-reset', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Correo enviado' } });
      const store = createStore();
      await store.dispatch(authApi.endpoints.requestReset.initiate({ email: 'test@test.com' }));
      expect(mockApi).toHaveBeenCalledWith({
        url: '/auth/request-reset', method: 'POST', data: { email: 'test@test.com' },
      });
    });

    it('resetPassword envía POST a /auth/reset-password', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Contraseña restablecida' } });
      const store = createStore();
      const data = { token: 'rt', password: 'new123', repeatPassword: 'new123', email: 'test@test.com' };
      await store.dispatch(authApi.endpoints.resetPassword.initiate(data));
      expect(mockApi).toHaveBeenCalledWith({ url: '/auth/reset-password', method: 'POST', data });
    });
  });

  describe('manejo de errores', () => {
    it('retorna error con status y mensaje de la API', async () => {
      mockApi.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Credenciales inválidas' } },
        message: 'Unauthorized',
      });
      const store = createStore();
      const result = await store.dispatch(
        authApi.endpoints.sendTwoFactorCode.initiate({ email: 'test@test.com', password: 'wrong' })
      );
      expect(result.error).toEqual({ status: 401, data: 'Credenciales inválidas' });
    });
  });
});
