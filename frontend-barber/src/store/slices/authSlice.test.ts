import { describe, expect, it } from 'vitest';
import reducer, { clearAuthState, logout, setUser, setInitialized } from './authSlice';

const initialState = {
  loginToken: null,
  user: null,
  isInitializing: true,
};

describe('authSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('resets to initial state with clearAuthState', () => {
    const state = reducer(
      { loginToken: 'token', user: { id: '1', name: 'Test', kind: 'Registrado' } as never, isInitializing: false },
      clearAuthState()
    );
    expect(state).toEqual(initialState);
  });

  it('clears tokens with logout', () => {
    const state = reducer(
      { loginToken: 'token', user: { id: '1', name: 'Test' } as never, isInitializing: false },
      logout()
    );

    expect(state.loginToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('sets user with setUser', () => {
    const user = { id: '1', name: 'John', email: 'john@test.com', kind: 'Registrado' as const };
    const state = reducer(initialState, setUser(user));
    expect(state.user).toEqual(user);
  });

  it('sets isInitializing to false with setInitialized', () => {
    const state = reducer({ loginToken: null, user: null, isInitializing: true }, setInitialized());
    expect(state.isInitializing).toBe(false);
  });
});
