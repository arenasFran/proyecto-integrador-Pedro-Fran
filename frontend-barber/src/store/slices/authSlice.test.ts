import { describe, expect, it, vi } from 'vitest';
import reducer, {
  clearAuthState,
  googleLoginThunk,
  registerThunk,
  requestResetThunk,
  resetPasswordThunk,
  sendTwoFactorCodeThunk,
  verifyTwoFactorCodeThunk,
} from './authSlice';
vi.mock('../../services/auth.service', () => ({
  authService: {
    sendTwoFactorCode: vi.fn(),
    googleLogin: vi.fn(),
    verifyTwoFactorCode: vi.fn(),
    register: vi.fn(),
    requestReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const initialState = {
  isLoading: false,
  error: null,
  twoFactorSendSuccess: null,
  twoFactorPendingEmail: null,
  loginSuccess: null,
  loginToken: null,
  registerSuccess: null,
  requestResetSuccess: null,
  resetPasswordSuccess: null,
  user: null,
  refreshToken: null,
  requiresProfileCompletion: null,
  profileCompletionError: null,
};

describe('authSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('clears error and success flags with clearAuthState', () => {
    const state = reducer(
      {
        ...initialState,
        error: 'Error',
        loginSuccess: 'ok',
        registerSuccess: 'ok',
        requestResetSuccess: 'ok',
        resetPasswordSuccess: 'ok',
        twoFactorSendSuccess: 'ok',
        twoFactorPendingEmail: 'email@test.com',
      },
      clearAuthState()
    );

    expect(state.error).toBeNull();
    expect(state.loginSuccess).toBeNull();
    expect(state.registerSuccess).toBeNull();
    expect(state.requestResetSuccess).toBeNull();
    expect(state.resetPasswordSuccess).toBeNull();
    expect(state.twoFactorSendSuccess).toBeNull();
    expect(state.twoFactorPendingEmail).toBeNull();
  });

  it('handles sendTwoFactorCodeThunk.pending', () => {
    const state = reducer(initialState, sendTwoFactorCodeThunk.pending('', { email: 'a@b.com', password: '123456' }));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.loginSuccess).toBeNull();
  });

  it('handles sendTwoFactorCodeThunk.fulfilled', () => {
    const payload = { message: 'Sent', email: 'a@b.com' };
    const state = reducer(initialState, sendTwoFactorCodeThunk.fulfilled(payload, '', { email: 'a@b.com', password: '123456' }));
    expect(state.isLoading).toBe(false);
    expect(state.twoFactorSendSuccess).toBe('Sent');
    expect(state.twoFactorPendingEmail).toBe('a@b.com');
  });

  it('handles sendTwoFactorCodeThunk.rejected', () => {
    const state = reducer(initialState, sendTwoFactorCodeThunk.rejected(new Error('fail'), '', { email: 'a@b.com', password: '123456' }, 'Error')); 
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('handles googleLoginThunk.pending', () => {
    const state = reducer(initialState, googleLoginThunk.pending('', { token: 'token' }));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.twoFactorSendSuccess).toBeNull();
    expect(state.twoFactorPendingEmail).toBeNull();
  });

  it('handles googleLoginThunk.fulfilled', () => {
    const payload = { message: 'ok', token: 'jwt' };
    const state = reducer(initialState, googleLoginThunk.fulfilled(payload, '', { token: 'token' }));
    expect(state.isLoading).toBe(false);
    expect(state.loginSuccess).toBe('ok');
    expect(state.loginToken).toBe('jwt');
  });

  it('handles googleLoginThunk.rejected', () => {
    const state = reducer(initialState, googleLoginThunk.rejected(new Error('fail'), '', { token: 'token' }, 'Error'));
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('handles verifyTwoFactorCodeThunk.pending', () => {
    const state = reducer(initialState, verifyTwoFactorCodeThunk.pending('', { email: 'a@b.com', code: '123456' }));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('handles verifyTwoFactorCodeThunk.fulfilled', () => {
    const payload = { message: 'ok', token: 'jwt' };
    const state = reducer(
      { ...initialState, twoFactorSendSuccess: 'sent', twoFactorPendingEmail: 'a@b.com' },
      verifyTwoFactorCodeThunk.fulfilled(payload, '', { email: 'a@b.com', code: '123456' })
    );
    expect(state.isLoading).toBe(false);
    expect(state.loginSuccess).toBe('ok');
    expect(state.loginToken).toBe('jwt');
    expect(state.twoFactorSendSuccess).toBeNull();
    expect(state.twoFactorPendingEmail).toBeNull();
  });

  it('handles verifyTwoFactorCodeThunk.rejected', () => {
    const state = reducer(initialState, verifyTwoFactorCodeThunk.rejected(new Error('fail'), '', { email: 'a@b.com', code: '123456' }, 'Error'));
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('handles registerThunk.pending', () => {
    const state = reducer(
      {
        ...initialState,
        registerSuccess: 'ok',
        requestResetSuccess: 'ok',
        resetPasswordSuccess: 'ok',
      },
      registerThunk.pending('', {
        email: 'a@b.com',
        password: '123456',
        repeatPassword: '123456',
        name: 'John',
        lastname: 'Doe',
        phone: '1234567',
      })
    );
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.registerSuccess).toBeNull();
  });

  it('handles registerThunk.fulfilled', () => {
    const state = reducer(initialState, registerThunk.fulfilled('ok', '', {
      email: 'a@b.com',
      password: '123456',
      repeatPassword: '123456',
      name: 'John',
      lastname: 'Doe',
      phone: '1234567',
    }));
    expect(state.isLoading).toBe(false);
    expect(state.registerSuccess).toBe('ok');
    expect(state.requestResetSuccess).toBeNull();
    expect(state.resetPasswordSuccess).toBeNull();
  });

  it('handles registerThunk.rejected', () => {
    const state = reducer(initialState, registerThunk.rejected(new Error('fail'), '', {
      email: 'a@b.com',
      password: '123456',
      repeatPassword: '123456',
      name: 'John',
      lastname: 'Doe',
      phone: '1234567',
    }, 'Error'));
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('handles requestResetThunk.pending', () => {
    const state = reducer(initialState, requestResetThunk.pending('', { email: 'a@b.com' }));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.registerSuccess).toBeNull();
  });

  it('handles requestResetThunk.fulfilled', () => {
    const state = reducer(initialState, requestResetThunk.fulfilled('ok', '', { email: 'a@b.com' }));
    expect(state.isLoading).toBe(false);
    expect(state.requestResetSuccess).toBe('ok');
    expect(state.resetPasswordSuccess).toBeNull();
  });

  it('handles requestResetThunk.rejected', () => {
    const state = reducer(initialState, requestResetThunk.rejected(new Error('fail'), '', { email: 'a@b.com' }, 'Error'));
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });

  it('handles resetPasswordThunk.pending', () => {
    const state = reducer(initialState, resetPasswordThunk.pending('', { token: '123456', password: '123456', repeatPassword: '123456' }));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.registerSuccess).toBeNull();
  });

  it('handles resetPasswordThunk.fulfilled', () => {
    const state = reducer(initialState, resetPasswordThunk.fulfilled('ok', '', { token: '123456', password: '123456', repeatPassword: '123456' }));
    expect(state.isLoading).toBe(false);
    expect(state.resetPasswordSuccess).toBe('ok');
  });

  it('handles resetPasswordThunk.rejected', () => {
    const state = reducer(initialState, resetPasswordThunk.rejected(new Error('fail'), '', { token: '123456', password: '123456', repeatPassword: '123456' }, 'Error'));
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error');
  });
});
