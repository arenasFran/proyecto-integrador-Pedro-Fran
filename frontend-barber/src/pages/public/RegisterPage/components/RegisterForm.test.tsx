import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RegisterForm } from './RegisterForm';
import { renderWithProviders } from '../../../../test/utils';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/api', () => ({
  default: apiMock,
  setupDispatch: vi.fn(),
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
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockResolvedValue({ data: { message: 'Usuario registrado con éxito' } });
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
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('submits and shows success on valid form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillRegisterForm();
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Registro exitoso!')).toBeInTheDocument();
    });
  });

  it('shows error message when registration fails', async () => {
    apiMock.mockRejectedValue(new Error('Email en uso'));
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillRegisterForm();
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Email en uso')).toBeInTheDocument();
    });
  });
});
