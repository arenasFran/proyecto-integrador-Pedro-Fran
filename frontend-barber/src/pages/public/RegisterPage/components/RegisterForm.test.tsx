import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RegisterForm } from './RegisterForm';
import { renderWithProviders } from '../../../../test/utils';

const mockRegisterFn = vi.hoisted(() => vi.fn());
const mockUseRegisterMutation = vi.hoisted(() => vi.fn(() => [mockRegisterFn, { isLoading: false, error: null as Error | null }]));

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
  useRegisterMutation: mockUseRegisterMutation,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const fillRegisterForm = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/nombre/i), 'John');
  await user.type(screen.getByLabelText(/apellido/i), 'Doe');
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/teléfono/i), '598 91 234 567');
  await user.type(screen.getByLabelText(/contraseña/i), 'Password1!');
  await user.type(screen.getByLabelText(/confirmar/i), 'Password1!');
};

describe('RegisterForm', () => {
  beforeEach(() => {
    mockRegisterFn.mockReset();
    mockUseRegisterMutation.mockReset();
    mockUseRegisterMutation.mockReturnValue([mockRegisterFn, { isLoading: false, error: null }]);
    mockNavigate.mockReset();
  });

  it('renders all fields', () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar/i)).toBeInTheDocument();
  });

  it('does not submit when form is invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));
    expect(mockRegisterFn).not.toHaveBeenCalled();
  });

  it('submits and shows success on valid form', async () => {
    mockRegisterFn.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'ok' }) });
    const user = userEvent.setup({ delay: 50 });
    renderWithProviders(<RegisterForm />);

    await fillRegisterForm();
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { toast: expect.stringMatching(/registro/i), toastType: 'success' },
      });
    });
  });

  it('shows error message when registration fails', async () => {
    mockRegisterFn.mockReturnValue({ unwrap: () => Promise.reject(new Error('Email en uso')) });
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<RegisterForm />);

    await fillRegisterForm();
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    mockUseRegisterMutation.mockReturnValue([mockRegisterFn, { isLoading: false, error: new Error('Email en uso') }]);
    rerender(<RegisterForm />);

    await waitFor(() => {
      expect(screen.getByText('Email en uso')).toBeInTheDocument();
    });
  });
});
