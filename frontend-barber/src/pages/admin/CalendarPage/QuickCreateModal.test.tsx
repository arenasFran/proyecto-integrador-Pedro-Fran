import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { QuickCreateModal } from './QuickCreateModal';

const mockBarbers = [
  { id: 'b1', name: 'Juan', lastname: 'Pérez', services: [], isActive: true, slotDuration: 30, maxAdvanceDays: 30 },
];

const mockServices = [{ id: 's1', name: 'Corte', price: 500 }];
const mockSlots = ['10:00', '10:30', '11:00'];

const mockCreateAppointment = vi.fn().mockResolvedValue({});
const mockRegisteredClients = [
  { id: 'c1', name: 'Ana', lastname: 'Gómez', phone: '099111222', email: 'ana@test.com', photoUrl: null },
  { id: 'c2', name: 'Luis', lastname: 'Pérez', phone: '', email: 'luis@test.com', photoUrl: 'http://img/luis.jpg' },
];

vi.mock('../../../services/service.api', () => ({
  useGetServicesQuery: vi.fn(() => ({ data: mockServices })),
}));

vi.mock('../../../services/appointmentApi', () => ({
  useCreateAppointmentMutation: vi.fn(() => [mockCreateAppointment, { isLoading: false }]),
}));

vi.mock('../../../services/clientApi', () => ({
  useGetRegisteredClientsQuery: vi.fn(() => ({
    data: { clients: mockRegisteredClients },
    isFetching: false,
  })),
}));

vi.mock('../../../services/professional.service', () => ({
  professionalService: {
    getPublic: vi.fn(() => Promise.resolve(mockBarbers)),
    getSlots: vi.fn(() => Promise.resolve({ slots: mockSlots })),
  },
}));

describe('QuickCreateModal', () => {
  it('renders modal title with date', () => {
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);
    expect(screen.getByText(/nuevo turno/i)).toBeInTheDocument();
    expect(screen.getByText(/05\/07\/2026/i)).toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);
    expect(screen.getByText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
  });

  it('renders barber select after loading barbers', async () => {
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/seleccionar barbero/i)).toBeInTheDocument();
    });
  });

  it('creates appointment on submit with valid data', async () => {
    const onClose = vi.fn();
    mockCreateAppointment.mockResolvedValueOnce({});

    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText(/seleccionar barbero/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /crear turno/i }));
    expect(mockCreateAppointment).not.toHaveBeenCalled();
  });

  it('hides the client inputs and shows the searchable client list (with photos) when "cliente registrado" is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));

    expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/apellido/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/buscar cliente/i), 'ana');

    await user.click(screen.getByText('Ana Gómez'));

    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^teléfono/i)).not.toBeInTheDocument();
  });

  it('shows the phone field when the selected registered client has no phone on file', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));
    await user.type(screen.getByLabelText(/buscar cliente/i), 'luis');

    await user.click(screen.getByText('Luis Pérez'));

    expect(screen.queryByLabelText(/apellido/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^teléfono/i)).not.toBeDisabled();
    expect(screen.getByText(/este cliente no tiene teléfono cargado/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^teléfono/i), '099555666');
    expect(screen.getByDisplayValue('099555666')).toBeInTheDocument();
  });

  it('requires selecting a client when in "cliente registrado" mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/seleccionar barbero/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/seleccionar barbero/i));
    await user.click(await screen.findByText('Juan Pérez'));

    await user.click(screen.getByText(/seleccionar servicio/i));
    await user.click(await screen.findByText(/corte/i));

    await user.click(screen.getByText(/seleccionar horario/i));
    await user.click(await screen.findByText('10:00'));

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));
    await user.click(screen.getByRole('button', { name: /crear turno/i }));

    expect(await screen.findByText(/buscá y seleccioná un cliente/i)).toBeInTheDocument();
    expect(mockCreateAppointment).not.toHaveBeenCalled();
  });

  it('opens in data-entry mode with prefilled fields when the initial client is anonymous', () => {
    renderWithProviders(
      <QuickCreateModal
        dateStr="2026-07-05"
        onClose={vi.fn()}
        initialClient={{
          id: 'anon-1',
          name: 'Carlos',
          lastname: 'Ruiz',
          phone: '099111333',
          email: 'carlos@test.com',
          kind: 'anonymous',
        }}
      />
    );

    expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Carlos');
    expect(screen.getByLabelText(/apellido/i)).toHaveValue('Ruiz');
    expect(screen.getByLabelText(/^teléfono/i)).toHaveValue('099111333');
    expect(screen.getByLabelText(/email/i)).toHaveValue('carlos@test.com');
    expect(screen.queryByLabelText(/buscar cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
  });

  it('falls back to data-entry mode when the initial client is not in the registered list', async () => {
    renderWithProviders(
      <QuickCreateModal
        dateStr="2026-07-05"
        onClose={vi.fn()}
        initialClient={{
          id: 'anon-1',
          name: 'Carlos',
          lastname: 'Ruiz',
          phone: '099111333',
          email: 'carlos@test.com',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Carlos');
    });
    expect(screen.getByLabelText(/^teléfono/i)).toHaveValue('099111333');
    expect(screen.queryByLabelText(/buscar cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
  });

  it('finds the prefilled registered client when searching full name and lastname', () => {
    renderWithProviders(
      <QuickCreateModal
        dateStr="2026-07-05"
        onClose={vi.fn()}
        initialClient={{
          id: 'c2',
          name: 'Luis',
          lastname: 'Pérez',
          phone: '',
          email: 'luis@test.com',
          kind: 'registered',
        }}
      />
    );

    expect(screen.getByLabelText(/buscar cliente/i)).toHaveValue('Luis Pérez');
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
  });
});
