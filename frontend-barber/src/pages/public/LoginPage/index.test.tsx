import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoginPage from './index';
import { renderWithProviders } from '../../../test/utils';
import { authService } from '../../../services/auth.service';

vi.mock('../../../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    sendTwoFactorCode: vi.fn().mockResolvedValue({ message: 'sent' }),
    googleLogin: vi.fn(),
    verifyTwoFactorCode: vi.fn().mockResolvedValue({ message: 'ok', token: 'jwt' }),
    requestReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const mockedAuthService = authService as unknown as {
  sendTwoFactorCode: ReturnType<typeof vi.fn>;
  verifyTwoFactorCode: ReturnType<typeof vi.fn>;
};

describe('LoginPage', () => {
  it('renders credentials step by default', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar código de verificación/i })).toBeInTheDocument();
  });

  it('renders code step when twoFactorPendingEmail is set', () => {
    renderWithProviders(<LoginPage />, {
      preloadedState: {
        auth: {
          isLoading: false,
          error: null,
          twoFactorSendSuccess: 'sent',
          twoFactorPendingEmail: 'user@test.com',
          loginSuccess: null,
          loginToken: null,
          registerSuccess: null,
          requestResetSuccess: null,
          resetPasswordSuccess: null,
        },
      },
    });

    expect(screen.getByText(/código enviado a/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/código de verificación/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });

  it('dispatches sendTwoFactorCode on valid credentials submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /enviar código de verificación/i }));

    await waitFor(() => {
      expect(mockedAuthService.sendTwoFactorCode).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Password1!',
      });
    });
  });

  it('stores auth token when loginToken is set', async () => {
    localStorage.clear();
    renderWithProviders(<LoginPage />, {
      preloadedState: {
        auth: {
          isLoading: false,
          error: null,
          twoFactorSendSuccess: null,
          twoFactorPendingEmail: null,
          loginSuccess: null,
          loginToken: 'jwt-token',
          registerSuccess: null,
          requestResetSuccess: null,
          resetPasswordSuccess: null,
        },
      },
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('jwt-token');
    });
  });
});
