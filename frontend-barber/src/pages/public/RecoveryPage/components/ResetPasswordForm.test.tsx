import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ResetPasswordForm } from './ResetPasswordForm';
import { renderWithProviders } from '../../../../test/utils';

const mockResetPasswordFn = vi.hoisted(() => vi.fn());
const mockUseResetPasswordMutation = vi.hoisted(() => vi.fn(() => [mockResetPasswordFn, { isLoading: false, error: null as Error | null }]));

const mockEndpointMatcher = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../../../services/authApi', () => ({
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
  useResetPasswordMutation: mockUseResetPasswordMutation,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    mockResetPasswordFn.mockReset();
    mockUseResetPasswordMutation.mockReset();
    mockUseResetPasswordMutation.mockReturnValue([mockResetPasswordFn, { isLoading: false, error: null }]);
    mockNavigate.mockReset();
  });

  it('renders only password fields', () => {
    renderWithProviders(<ResetPasswordForm email="test@example.com" code="123456" />);
    expect(screen.queryByLabelText(/código de recuperación/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
  });

  it('does not submit when form is invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm email="test@example.com" code="123456" />);

    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    expect(mockResetPasswordFn).not.toHaveBeenCalled();
  });

  it('shows success on valid submit', async () => {
    mockResetPasswordFn.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'ok' }) });
    const user = userEvent.setup({ delay: 50 });
    renderWithProviders(<ResetPasswordForm email="test@example.com" code="123456" />);

    await user.type(screen.getByLabelText(/nueva contraseña/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));

    await waitFor(() => {
      expect(mockResetPasswordFn).toHaveBeenCalledWith({
        code: '123456',
        password: 'NewPass1!',
        repeatPassword: 'NewPass1!',
        email: 'test@example.com',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { toast: expect.stringMatching(/contraseña/i), toastType: 'success' },
      });
    });
  });

  it('shows error on failure', async () => {
    mockResetPasswordFn.mockReturnValue({ unwrap: () => Promise.reject(new Error('Código inválido')) });
    const user = userEvent.setup({ delay: 50 });
    const { rerender } = renderWithProviders(<ResetPasswordForm email="test@example.com" code="123456" />);

    await user.type(screen.getByLabelText(/nueva contraseña/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));

    mockUseResetPasswordMutation.mockReturnValue([mockResetPasswordFn, { isLoading: false, error: new Error('Código inválido') }]);
    rerender(<ResetPasswordForm email="test@example.com" code="123456" />);

    await waitFor(() => {
      expect(screen.getByText('Código inválido')).toBeInTheDocument();
    });
  });
});
