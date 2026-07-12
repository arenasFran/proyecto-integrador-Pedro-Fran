import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import { RecoveryPage } from './index';

vi.mock('./components/RequestResetForm', () => ({
  RequestResetForm: () => <div data-testid="request-reset-form" />,
}));

vi.mock('./components/ResetPasswordForm', () => ({
  ResetPasswordForm: ({ email, initialToken }: { email: string; initialToken?: string }) => (
    <div data-testid="reset-password-form">
      email:{email} token:{initialToken}
    </div>
  ),
}));

describe('RecoveryPage', () => {
  it('starts on step 1 (request form) when there is no token in the URL', () => {
    renderWithProviders(<RecoveryPage />, { initialEntries: ['/recovery'] });
    expect(screen.getByTestId('request-reset-form')).toBeInTheDocument();
    expect(screen.queryByTestId('reset-password-form')).not.toBeInTheDocument();
  });

  it('jumps straight to step 2 with the token and email prefilled when they come in the URL', () => {
    renderWithProviders(<RecoveryPage />, {
      initialEntries: ['/recovery?token=token-abc&email=ana%40test.com'],
    });
    expect(screen.queryByTestId('request-reset-form')).not.toBeInTheDocument();
    const form = screen.getByTestId('reset-password-form');
    expect(form).toHaveTextContent('email:ana@test.com');
    expect(form).toHaveTextContent('token:token-abc');
  });
});
