import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RequestResetForm } from './RequestResetForm';
import { renderWithProviders } from '../../../../test/utils';

const mockRequestResetFn = vi.hoisted(() => vi.fn());
const mockUseRequestResetMutation = vi.hoisted(() => vi.fn(() => [mockRequestResetFn, { isLoading: false, error: null }]));

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
  useRequestResetMutation: mockUseRequestResetMutation,
}));

describe('RequestResetForm', () => {
  beforeEach(() => {
    mockRequestResetFn.mockReset();
    mockUseRequestResetMutation.mockReset();
    mockUseRequestResetMutation.mockReturnValue([mockRequestResetFn, { isLoading: false, error: null }]);
  });

  it('renders email field and submit button', () => {
    renderWithProviders(<RequestResetForm />);
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar instrucciones/i })).toBeInTheDocument();
  });

  it('does not submit when form is invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RequestResetForm />);

    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));
    expect(mockRequestResetFn).not.toHaveBeenCalled();
  });

  it('shows success on valid submit', async () => {
    mockRequestResetFn.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'ok' }) });
    const onSuccess = vi.fn();
    const user = userEvent.setup({ delay: 50 });
    renderWithProviders(<RequestResetForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('user@test.com');
    });
  });

  it('shows error on failure', async () => {
    mockRequestResetFn.mockReturnValue({ unwrap: () => Promise.reject(new Error('Error de red')) });
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<RequestResetForm />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));

    // Re-render with error state to simulate RTK Query state update
    mockUseRequestResetMutation.mockReturnValue([mockRequestResetFn, { isLoading: false, error: new Error('Error de red') }]);
    rerender(<RequestResetForm />);

    await waitFor(() => {
      expect(screen.getByText('Error de red')).toBeInTheDocument();
    });
  });
});
