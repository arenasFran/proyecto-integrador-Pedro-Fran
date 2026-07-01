import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RequestResetForm } from './RequestResetForm';
import { renderWithProviders } from '../../../../test/utils';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/api', () => ({
  default: apiMock,
  setupDispatch: vi.fn(),
}));

describe('RequestResetForm', () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockResolvedValue({ data: { message: 'ok' } });
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
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('shows success on valid submit', async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<RequestResetForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('user@test.com');
    });
  });

  it('shows error on failure', async () => {
    apiMock.mockRejectedValue(new Error('Error de red'));
    const user = userEvent.setup();
    renderWithProviders(<RequestResetForm />);

    await user.type(screen.getByLabelText(/correo electrónico/i), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }));

    await waitFor(() => {
      expect(screen.getByText('Error de red')).toBeInTheDocument();
    });
  });
});
