import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../test/utils';
import { getAccessToken } from '../services/api';
import { getTokenKind, isTokenValid } from '../utils/token';
import { RequireClientRoute } from './guards';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getAccessToken: vi.fn() };
});

vi.mock('../utils/token', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/token')>();
  return { ...actual, getTokenKind: vi.fn(), isTokenValid: vi.fn() };
});

const mockedGetAccessToken = vi.mocked(getAccessToken);
const mockedGetTokenKind = vi.mocked(getTokenKind);
const mockedIsTokenValid = vi.mocked(isTokenValid);

function renderGuard() {
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
        auth: { loginToken: null, user: null, isInitializing: false },
      },
    }
  );
}

describe('RequireClientRoute', () => {
  beforeEach(() => {
    mockedGetAccessToken.mockReset();
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
