import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoginPage from './index';
import { renderWithProviders } from '../../../test/utils';
import { getAccessToken } from '../../../services/api';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../../services/api', () => ({
  default: apiMock,
  setupDispatch: vi.fn(),
  getAccessToken: vi.fn(() => {
    let token: string | null = null;
    // Sobrescribimos setAccessToken para que getAccessToken lo refleje
    const setAccessToken = (t: string | null) => { token = t; };
    return { getAccessToken: () => token, setAccessToken };
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it('renders credentials step by default', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar código de verificación/i })).toBeInTheDocument();
  });

  it('shows code step after submitting valid credentials', async () => {
    apiMock.mockResolvedValue({ data: { message: 'Código enviado' } });

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /enviar código de verificación/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/código de verificación/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verificar código/i })).toBeInTheDocument();
    });
  });

  it('shows error message on failed login', async () => {
    apiMock.mockRejectedValue(new Error('Credenciales inválidas'));

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /enviar código de verificación/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });
});
