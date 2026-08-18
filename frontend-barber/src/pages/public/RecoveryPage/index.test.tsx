import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { RecoveryPage } from './index';

vi.mock('./components/RequestResetForm', () => ({
  RequestResetForm: ({ onSuccess }: { onSuccess?: (email: string) => void }) => (
    <div data-testid="request-reset-form">
      <button type="button" onClick={() => onSuccess?.('ana@test.com')}>
        request-success
      </button>
    </div>
  ),
}));

vi.mock('./components/VerifyCodeForm', () => ({
  VerifyCodeForm: ({ email, onSuccess }: { email: string; onSuccess?: (code: string) => void }) => (
    <div data-testid="verify-code-form">
      email:{email}
      <button type="button" onClick={() => onSuccess?.('123456')}>
        code-success
      </button>
    </div>
  ),
}));

vi.mock('./components/ResetPasswordForm', () => ({
  ResetPasswordForm: ({ email, code }: { email: string; code: string }) => (
    <div data-testid="reset-password-form">
      email:{email} code:{code}
    </div>
  ),
}));

describe('RecoveryPage', () => {
  it('starts on step 1 (request form) when there is no code in the URL', () => {
    renderWithProviders(<RecoveryPage />, { initialEntries: ['/recovery'] });
    expect(screen.getByTestId('request-reset-form')).toBeInTheDocument();
    expect(screen.queryByTestId('verify-code-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reset-password-form')).not.toBeInTheDocument();
  });

  it('moves to step 2 (verify code) after requesting the reset', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecoveryPage />, { initialEntries: ['/recovery'] });

    await user.click(screen.getByRole('button', { name: 'request-success' }));

    expect(screen.getByTestId('verify-code-form')).toHaveTextContent('email:ana@test.com');
    expect(screen.queryByTestId('request-reset-form')).not.toBeInTheDocument();
  });

  it('moves to step 3 (new password) after the code is verified', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecoveryPage />, { initialEntries: ['/recovery'] });

    await user.click(screen.getByRole('button', { name: 'request-success' }));
    await user.click(screen.getByRole('button', { name: 'code-success' }));

    const form = screen.getByTestId('reset-password-form');
    expect(form).toHaveTextContent('email:ana@test.com');
    expect(form).toHaveTextContent('code:123456');
    expect(screen.queryByTestId('verify-code-form')).not.toBeInTheDocument();
  });

  it('jumps straight to step 3 with the code and email prefilled when they come in the URL', () => {
    renderWithProviders(<RecoveryPage />, {
      initialEntries: ['/recovery?code=123456&email=ana%40test.com'],
    });
    expect(screen.queryByTestId('request-reset-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verify-code-form')).not.toBeInTheDocument();
    const form = screen.getByTestId('reset-password-form');
    expect(form).toHaveTextContent('email:ana@test.com');
    expect(form).toHaveTextContent('code:123456');
  });

it('starts on step 2 when the recovery request came from the profile', () => {
    renderWithProviders(<RecoveryPage />, {
      initialEntries: ['/recovery?email=ana%40test.com'],
    });

    expect(screen.getByTestId('verify-code-form')).toHaveTextContent('email:ana@test.com');
    expect(screen.queryByTestId('request-reset-form')).not.toBeInTheDocument();
  });

  it('shows a back to profile link when the recovery came from the profile', () => {
    renderWithProviders(<RecoveryPage />, {
      initialEntries: ['/recovery?email=ana%40test.com&from=profile'],
    });

    expect(screen.getByRole('link', { name: 'Volver al perfil' })).toHaveAttribute('href', '/perfil');
    expect(screen.queryByRole('link', { name: 'Volver al login' })).not.toBeInTheDocument();
  });

  it('shows a back to login link when the recovery came from the login flow', () => {
    renderWithProviders(<RecoveryPage />, {
      initialEntries: ['/recovery?email=ana%40test.com'],
    });

    expect(screen.getByRole('link', { name: 'Volver al login' })).toHaveAttribute('href', '/login');
  });
});
