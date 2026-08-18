import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoginPage from './index';
import { renderWithProviders } from '../../../test/utils';

const mockSendTwoFactorCode = vi.hoisted(() => vi.fn());
const mockUseSendTwoFactorCodeMutation = vi.hoisted(() => vi.fn(() => [mockSendTwoFactorCode, { isLoading: false, error: null }]));
const mockUseVerifyTwoFactorCodeMutation = vi.hoisted(() => vi.fn(() => [vi.fn(), { isLoading: false, error: null }]));
const mockUseGoogleLoginMutation = vi.hoisted(() => vi.fn(() => [vi.fn(), { isLoading: false, error: null }]));
const mockUseCompleteGoogleProfileMutation = vi.hoisted(() => vi.fn(() => [vi.fn(), { isLoading: false, error: null }]));

const mockEndpointMatcher = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../../services/authApi', () => ({
  authApi: {
    reducerPath: 'authApi',
    reducer: (s: Record<string, unknown> = {}) => s,
    middleware: [],
    endpoints: {
      verifyTwoFactorCode: { matchFulfilled: mockEndpointMatcher, matchRejected: mockEndpointMatcher },
      completeGoogleProfile: { matchFulfilled: mockEndpointMatcher },
      googleLogin: { matchFulfilled: mockEndpointMatcher },
      refreshToken: { matchFulfilled: mockEndpointMatcher, matchRejected: mockEndpointMatcher },
      getProfile: { matchFulfilled: mockEndpointMatcher, matchRejected: mockEndpointMatcher, initiate: vi.fn(() => ({ abort: vi.fn() })) },
    },
  },
  useSendTwoFactorCodeMutation: mockUseSendTwoFactorCodeMutation,
  useVerifyTwoFactorCodeMutation: mockUseVerifyTwoFactorCodeMutation,
  useGoogleLoginMutation: mockUseGoogleLoginMutation,
  useCompleteGoogleProfileMutation: mockUseCompleteGoogleProfileMutation,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockSendTwoFactorCode.mockReset();
    mockUseSendTwoFactorCodeMutation.mockReset();
    mockUseSendTwoFactorCodeMutation.mockReturnValue([mockSendTwoFactorCode, { isLoading: false, error: null }]);
  });

  it('renders credentials step by default', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar código de verificación/i })).toBeInTheDocument();
  });

  it('shows code step after submitting valid credentials', async () => {
    mockSendTwoFactorCode.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Código enviado' }) });

    const user = userEvent.setup({ delay: 50 });
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
    mockSendTwoFactorCode.mockReturnValue({ unwrap: () => Promise.reject(new Error('Credenciales inválidas')) });

    const user = userEvent.setup({ delay: 50 });
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /enviar código de verificación/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('shows resend button on code step with a 60s cooldown and resends code when clicked', async () => {
    vi.useFakeTimers();
    try {
      mockSendTwoFactorCode.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Código enviado' }) });

      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'user@test.com' } });
      fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'Password1' } });
      fireEvent.click(screen.getByRole('button', { name: /enviar código de verificación/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const countdownButton = screen.getByRole('button', { name: /enviar código en \d+s/i });
      expect(countdownButton).toBeDisabled();

      for (let second = 0; second < 60; second += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }

      expect(screen.queryByRole('button', { name: /enviar código en \d+s/i })).not.toBeInTheDocument();
      const resendAgainButton = screen.getByRole('button', { name: 'Reenviar código' });
      expect(resendAgainButton).toBeEnabled();

      mockSendTwoFactorCode.mockClear();
      mockSendTwoFactorCode.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Nuevo código enviado' }) });

      fireEvent.click(resendAgainButton);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Nuevo código enviado')).toBeInTheDocument();
      expect(mockSendTwoFactorCode).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Password1',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
