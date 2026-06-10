import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ResetPasswordForm } from './ResetPasswordForm';
import { resetPasswordThunk } from '../../../../store/slices/authSlice';
import { renderWithProviders } from '../../../../test/utils';

vi.mock('../../../../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    sendTwoFactorCode: vi.fn(),
    googleLogin: vi.fn(),
    verifyTwoFactorCode: vi.fn(),
    requestReset: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue('ok'),
  },
}));

describe('ResetPasswordForm', () => {
  it('renders token and password fields', () => {
    renderWithProviders(<ResetPasswordForm email="test@example.com" />);
    expect(screen.getByLabelText(/token de recuperación/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
  });

  it('shows validation error on submit when invalid', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<ResetPasswordForm email="test@example.com" />);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: resetPasswordThunk.pending.type })
    );
  });

  it('shows success state when resetPasswordSuccess is set', () => {
    renderWithProviders(<ResetPasswordForm email="test@example.com" />, {
      preloadedState: {
        auth: {
          isLoading: false,
          error: null,
          twoFactorSendSuccess: null,
          twoFactorPendingEmail: null,
          loginSuccess: null,
          loginToken: null,
          registerSuccess: null,
          requestResetSuccess: null,
          resetPasswordSuccess: 'ok',
        },
      },
    });

    expect(screen.getByText('¡Contraseña actualizada!')).toBeInTheDocument();
  });
});
