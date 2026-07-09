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
const mockTriggerSearchClients = vi.fn();
const mockRegisteredClients = [
  { id: 'c1', name: 'Ana', lastname: 'Gómez', phone: '099111222', contactEmail: 'ana@test.com' },
  { id: 'c2', name: 'Luis', lastname: 'Pérez', contactEmail: 'luis@test.com' },
];

vi.mock('../../../services/service.api', () => ({
  useGetServicesQuery: vi.fn(() => ({ data: mockServices })),
}));

vi.mock('../../../services/appointmentApi', () => ({
  useCreateAppointmentMutation: vi.fn(() => [mockCreateAppointment, { isLoading: false }]),
  useLazySearchClientsQuery: vi.fn(() => [
    mockTriggerSearchClients,
    { data: mockRegisteredClients, isFetching: false },
  ]),
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

  it('lets staff search and select a registered client, prefilling and locking all fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));
    await user.type(screen.getByLabelText(/buscar cliente/i), 'ana');

    const result = await screen.findByText('Ana Gómez');
    await user.click(result);

    expect(screen.getByDisplayValue('Ana')).toBeDisabled();
    expect(screen.getByDisplayValue('Gómez')).toBeDisabled();
    expect(screen.getByDisplayValue('099111222')).toBeDisabled();
    expect(screen.getByDisplayValue('ana@test.com')).toBeDisabled();
  });

  it('leaves the phone field editable when the selected client has no phone on file', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));
    await user.type(screen.getByLabelText(/buscar cliente/i), 'luis');

    const result = await screen.findByText('Luis Pérez');
    await user.click(result);

    expect(screen.getByDisplayValue('Luis')).toBeDisabled();
    expect(screen.getByDisplayValue('Pérez')).toBeDisabled();
    expect(screen.getByDisplayValue('luis@test.com')).toBeDisabled();
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
});
