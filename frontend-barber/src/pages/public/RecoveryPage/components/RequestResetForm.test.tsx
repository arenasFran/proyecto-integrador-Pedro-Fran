import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RequestResetForm } from './RequestResetForm';
import { requestResetThunk } from '../../../../store/slices/authSlice';
import { renderWithProviders } from '../../../../test/utils';

vi.mock('../../../../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    sendTwoFactorCode: vi.fn(),
    googleLogin: vi.fn(),
    verifyTwoFactorCode: vi.fn(),
    requestReset: vi.fn().mockResolvedValue('ok'),
    resetPassword: vi.fn(),
  },
}));

describe('RequestResetForm', () => {
  it('renders email field and submit button', () => {
    renderWithProviders(<RequestResetForm />);
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar instrucciones/i })).toBeInTheDocument();
  });

  it('shows validation error on submit when invalid', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<RequestResetForm />);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: requestResetThunk.pending.type })
    );
  });

  it('shows success state when requestResetSuccess is set', () => {
    renderWithProviders(<RequestResetForm />, {
      preloadedState: {
        auth: {
          isLoading: false,
          error: null,
          twoFactorSendSuccess: null,
          twoFactorPendingEmail: null,
          loginSuccess: null,
          loginToken: null,
          registerSuccess: null,
          requestResetSuccess: 'ok',
          resetPasswordSuccess: null,
        },
      },
    });

    expect(screen.getByText('¡Enviado!')).toBeInTheDocument();
  });
});
