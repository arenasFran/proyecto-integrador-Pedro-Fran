import { describe, expect, it, vi } from 'vitest';
import { authService } from './auth.service';
import api from './api';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn> };

describe('authService', () => {
  it('register posts to /auth/register and returns message', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    const result = await authService.register({
      email: 'a@b.com',
      password: '123456',
      repeatPassword: '123456',
      name: 'John',
      lastname: 'Doe',
      phone: '1234567',
      termsVersion: '1.0',
      privacyVersion: '1.0',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', {
      email: 'a@b.com',
      password: '123456',
      repeatPassword: '123456',
      name: 'John',
      lastname: 'Doe',
      phone: '1234567',
      termsVersion: '1.0',
      privacyVersion: '1.0',
    });
    expect(result).toBe('ok');
  });

  it('sendTwoFactorCode posts to /auth/2fa/send and returns data', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'sent' } });

    const result = await authService.sendTwoFactorCode({
      email: 'a@b.com',
      password: '123456',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/2fa/send', {
      email: 'a@b.com',
      password: '123456',
    });
    expect(result).toEqual({ message: 'sent' });
  });

  it('googleLogin posts to /auth/google and returns data', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok', token: 'jwt' } });

    const result = await authService.googleLogin({ token: 'token' });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/google', { token: 'token' });
    expect(result).toEqual({ message: 'ok', token: 'jwt' });
  });

  it('verifyTwoFactorCode posts to /auth/2fa/verify and returns data', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok', token: 'jwt' } });

    const result = await authService.verifyTwoFactorCode({
      email: 'a@b.com',
      code: '123456',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/2fa/verify', {
      email: 'a@b.com',
      code: '123456',
    });
    expect(result).toEqual({ message: 'ok', token: 'jwt' });
  });

  it('requestReset posts to /auth/request-reset and returns message', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    const result = await authService.requestReset({ email: 'a@b.com' });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/request-reset', { email: 'a@b.com' });
    expect(result).toBe('ok');
  });

  it('resetPassword posts to /auth/reset-password and returns message', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    const result = await authService.resetPassword({
      code: '123456',
      password: '123456',
      repeatPassword: '123456',
      email: 'test@example.com',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/reset-password', {
      code: '123456',
      password: '123456',
      repeatPassword: '123456',
      email: 'test@example.com',
    });
    expect(result).toBe('ok');
  });

  it('verifyResetCode posts to /auth/verify-reset-code and returns message', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: 'ok' } });

    const result = await authService.verifyResetCode({
      email: 'test@example.com',
      code: '123456',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/verify-reset-code', {
      email: 'test@example.com',
      code: '123456',
    });
    expect(result).toBe('ok');
  });
});
