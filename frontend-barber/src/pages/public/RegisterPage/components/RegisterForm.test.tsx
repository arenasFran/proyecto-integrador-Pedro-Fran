import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RegisterForm } from './RegisterForm';
import { registerThunk } from '../../../../store/slices/authSlice';
import { renderWithProviders } from '../../../../test/utils';

vi.mock('../../../../services/auth.service', () => ({
  authService: {
    register: vi.fn().mockResolvedValue('ok'),
    sendTwoFactorCode: vi.fn(),
    googleLogin: vi.fn(),
    verifyTwoFactorCode: vi.fn(),
    requestReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const fillRegisterForm = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/nombre/i), 'John');
  await user.type(screen.getByLabelText(/apellido/i), 'Doe');
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/teléfono/i), '+54 9 11 1234 5678');
  await user.type(screen.getByLabelText(/contraseña/i), 'Password1!');
  await user.type(screen.getByLabelText(/confirmar/i), 'Password1!');
};

describe('RegisterForm', () => {
  it('renders all fields', () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar/i)).toBeInTheDocument();
  });

  it('shows validation errors on submit when invalid', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<RegisterForm />);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: registerThunk.pending.type })
    );
  });

  it('dispatches register thunk on valid submit', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<RegisterForm />);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    await fillRegisterForm();
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('renders success state when registerSuccess is set', () => {
    renderWithProviders(<RegisterForm />, {
      preloadedState: {
        auth: {
          isLoading: false,
          error: null,
          twoFactorSendSuccess: null,
          twoFactorPendingEmail: null,
          loginSuccess: null,
          loginToken: null,
          registerSuccess: 'ok',
          requestResetSuccess: null,
          resetPasswordSuccess: null,
        },
      },
    });

    expect(screen.getByText('¡Registro exitoso!')).toBeInTheDocument();
  });

  it('shows error from store', () => {
    renderWithProviders(<RegisterForm />, {
      preloadedState: {
        auth: {
          isLoading: false,
          error: 'Error',
          twoFactorSendSuccess: null,
          twoFactorPendingEmail: null,
          loginSuccess: null,
          loginToken: null,
          registerSuccess: null,
          requestResetSuccess: null,
          resetPasswordSuccess: null,
        },
      },
    });

    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
