import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VerifyCodeForm } from './VerifyCodeForm';
import { renderWithProviders } from '../../../../test/utils';

const mockVerifyResetCodeFn = vi.hoisted(() => vi.fn());
const mockUseVerifyResetCodeMutation = vi.hoisted(() => vi.fn(() => [mockVerifyResetCodeFn, { isLoading: false, error: null as Error | null }]));

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
  useVerifyResetCodeMutation: mockUseVerifyResetCodeMutation,
}));

describe('VerifyCodeForm', () => {
  beforeEach(() => {
    mockVerifyResetCodeFn.mockReset();
    mockUseVerifyResetCodeMutation.mockReset();
    mockUseVerifyResetCodeMutation.mockReturnValue([mockVerifyResetCodeFn, { isLoading: false, error: null }]);
  });

  it('renders code field and submit button', () => {
    renderWithProviders(<VerifyCodeForm email="test@example.com" />);
    expect(screen.getByLabelText(/código de recuperación/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verificar código/i })).toBeInTheDocument();
  });

  it('does not submit when form is invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VerifyCodeForm email="test@example.com" />);

    await user.click(screen.getByRole('button', { name: /verificar código/i }));
    expect(mockVerifyResetCodeFn).not.toHaveBeenCalled();
  });

  it('verifies the code and calls onSuccess', async () => {
    mockVerifyResetCodeFn.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Código verificado.' }) });
    const onSuccess = vi.fn();
    const user = userEvent.setup({ delay: 50 });
    renderWithProviders(<VerifyCodeForm email="test@example.com" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/código de recuperación/i), '123456');
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    await waitFor(() => {
      expect(mockVerifyResetCodeFn).toHaveBeenCalledWith({
        email: 'test@example.com',
        code: '123456',
      });
      expect(onSuccess).toHaveBeenCalledWith('123456');
    });
  });

  it('shows error on failure', async () => {
    mockVerifyResetCodeFn.mockReturnValue({ unwrap: () => Promise.reject(new Error('Código inválido o expirado.')) });
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<VerifyCodeForm email="test@example.com" />);

    await user.type(screen.getByLabelText(/código de recuperación/i), '000000');
    await user.click(screen.getByRole('button', { name: /verificar código/i }));

    // Re-render with error state to simulate RTK Query state update
    mockUseVerifyResetCodeMutation.mockReturnValue([mockVerifyResetCodeFn, { isLoading: false, error: new Error('Código inválido o expirado.') }]);
    rerender(<VerifyCodeForm email="test@example.com" />);

    await waitFor(() => {
      expect(screen.getByText('Código inválido o expirado.')).toBeInTheDocument();
    });
  });
});
