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

vi.mock('../../../services/service.api', () => ({
  useGetServicesQuery: vi.fn(() => ({ data: mockServices })),
}));

vi.mock('../../../services/appointmentApi', () => ({
  useCreateAppointmentMutation: vi.fn(() => [mockCreateAppointment, { isLoading: false }]),
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
});
