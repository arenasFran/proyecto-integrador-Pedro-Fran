import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ResetPasswordForm } from './ResetPasswordForm';
import { renderWithProviders } from '../../../../test/utils';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/api', () => ({
  default: apiMock,
  setupDispatch: vi.fn(),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockResolvedValue({ data: { message: 'Contraseña restablecida con éxito' } });
  });

  it('renders token and password fields', () => {
    renderWithProviders(<ResetPasswordForm email="test@example.com" />);
    expect(screen.getByLabelText(/token de recuperación/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
  });

  it('does not submit when form is invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm email="test@example.com" />);

    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('shows success on valid submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm email="test@example.com" />);

    await user.type(screen.getByLabelText(/token de recuperación/i), 'abc123');
    await user.type(screen.getByLabelText(/nueva contraseña/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Contraseña actualizada!')).toBeInTheDocument();
    });
  });

  it('shows error on failure', async () => {
    apiMock.mockRejectedValue(new Error('Token inválido'));
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm email="test@example.com" />);

    await user.type(screen.getByLabelText(/token de recuperación/i), 'abc123');
    await user.type(screen.getByLabelText(/nueva contraseña/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }));

    await waitFor(() => {
      expect(screen.getByText('Token inválido')).toBeInTheDocument();
    });
  });
});
