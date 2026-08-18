import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../test/utils';
import { getAccessToken, silentRefresh } from '../services/api';
import { getTokenKind, isTokenValid } from '../utils/token';
import { RequireClientRoute } from './guards';
import type { User } from '../types/auth';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getAccessToken: vi.fn(), silentRefresh: vi.fn() };
});

vi.mock('../utils/token', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/token')>();
  return { ...actual, getTokenKind: vi.fn(), isTokenValid: vi.fn() };
});

const mockedGetAccessToken = vi.mocked(getAccessToken);
const mockedSilentRefresh = vi.mocked(silentRefresh);
const mockedGetTokenKind = vi.mocked(getTokenKind);
const mockedIsTokenValid = vi.mocked(isTokenValid);

function renderGuard(auth: { loginToken: string | null; user: User | null; isInitializing: boolean } = { loginToken: null, user: null, isInitializing: false }) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<p>landing</p>} />
      <Route path="/login" element={<p>login</p>} />
      <Route path="/admin/dashboard" element={<p>panel</p>} />
      <Route
        path="/mis-turnos"
        element={
          <RequireClientRoute>
            <p>cliente</p>
          </RequireClientRoute>
        }
      />
    </Routes>,
    {
      initialEntries: ['/mis-turnos'],
      preloadedState: {
        auth,
      },
    }
  );
}

describe('RequireClientRoute', () => {
  beforeEach(() => {
    mockedGetAccessToken.mockReset();
    mockedSilentRefresh.mockReset();
    mockedSilentRefresh.mockResolvedValue(false);
    mockedGetTokenKind.mockReset();
    mockedIsTokenValid.mockReset();
  });

  it('redirige a /admin/dashboard cuando un Admin entra a una ruta de cliente', async () => {
    mockedGetAccessToken.mockReturnValue('token-admin');
    mockedGetTokenKind.mockReturnValue('Admin');
    mockedIsTokenValid.mockReturnValue(true);

    renderGuard();

    expect(await screen.findByText('panel')).toBeInTheDocument();
    expect(screen.queryByText('cliente')).not.toBeInTheDocument();
  });

  it('redirige a /login cuando no hay token', async () => {
    mockedGetAccessToken.mockReturnValue(null);
    mockedGetTokenKind.mockReturnValue(null);
    mockedIsTokenValid.mockReturnValue(false);

    renderGuard();

    expect(await screen.findByText('login')).toBeInTheDocument();
    expect(screen.queryByText('cliente')).not.toBeInTheDocument();
  });

  it('redirige a la landing cuando el token es inválido o corrupto', async () => {
    mockedGetAccessToken.mockReturnValue('token-corrupto');
    mockedGetTokenKind.mockReturnValue(null);
    mockedIsTokenValid.mockReturnValue(false);

    renderGuard();

    expect(await screen.findByText('landing')).toBeInTheDocument();
    expect(screen.queryByText('cliente')).not.toBeInTheDocument();
  });

  it('limpia el token Redux stale cuando el JWT expiró', async () => {
    mockedGetAccessToken.mockReturnValue('token-expirado');
    mockedGetTokenKind.mockReturnValue(null);
    mockedIsTokenValid.mockReturnValue(false);

    const { store } = renderGuard({
      loginToken: 'token-expirado',
      user: { id: 'admin-1', name: 'Admin' } as User,
      isInitializing: false,
    });

    expect(await screen.findByText('landing')).toBeInTheDocument();
    expect(store.getState().auth.loginToken).toBeNull();
    expect(store.getState().auth.user).toBeNull();
  });

  it('renderiza el contenido de cliente para un usuario Registrado con token válido', async () => {
    mockedGetAccessToken.mockReturnValue('token-cliente');
    mockedGetTokenKind.mockReturnValue('Registrado');
    mockedIsTokenValid.mockReturnValue(true);

    renderGuard();

    expect(await screen.findByText('cliente')).toBeInTheDocument();
    expect(screen.queryByText('panel')).not.toBeInTheDocument();
    expect(screen.queryByText('login')).not.toBeInTheDocument();
  });
});
