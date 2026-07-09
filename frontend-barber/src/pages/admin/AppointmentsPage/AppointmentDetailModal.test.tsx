import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import type { Appointment } from '../../../types/booking';

const baseAppointment: Appointment = {
  id: 'apt-1',
  barberId: 'barber-1',
  barberName: 'Carlos Lopez',
  clientName: 'Juan',
  clientLastname: 'Perez',
  clientEmail: 'juan@test.com',
  clientPhone: '099123456',
  clientKind: 'Registrado',
  serviceId: 'svc-1',
  serviceName: 'Corte de pelo',
  servicePrice: 490,
  serviceDuration: 50,
  date: '2099-01-01',
  startTime: '10:00',
  endTime: '10:50',
  status: 'Confirmado',
  paymentStatus: 'Pendiente',
  paymentMethod: 'local',
  createdBy: { type: 'registered', userId: 'user-1' },
  statusHistory: [
    { status: 'Confirmado', timestamp: '2099-01-01T00:00:00.000Z', actor: 'system' },
  ],
  createdAt: '2099-01-01T00:00:00.000Z',
  updatedAt: '2099-01-01T00:00:00.000Z',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
};

describe('AppointmentDetailModal', () => {
  it('no renderiza nada si appointment es null', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={null} />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('muestra datos del cliente', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getAllByText('Juan Perez').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('juan@test.com')).toBeDefined();
    expect(screen.getByText('099123456')).toBeDefined();
  });

  it('muestra datos del turno', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Corte de pelo')).toBeDefined();
    expect(screen.getByText('$490')).toBeDefined();
    expect(screen.getByText('Carlos Lopez')).toBeDefined();
    expect(screen.getByText('(50 min)')).toBeDefined();
  });

  it('muestra estado de pago Pendiente', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Pendiente')).toBeDefined();
    expect(screen.getByText('Local')).toBeDefined();
  });

  it('muestra estado de pago Pagado', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, paymentStatus: 'Pagado' }}
      />
    );
    expect(screen.getByText('Pagado')).toBeDefined();
  });

  it('muestra badge de origen Web', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getAllByText('Web').length).toBe(2);
  });

  it('muestra el historial de cambios', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Historial')).toBeDefined();
    expect(screen.getAllByText('Confirmado').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/por system/)).toBeDefined();
  });

  it('muestra informacion de cancelacion cuando corresponde', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{
          ...baseAppointment,
          status: 'Cancelado',
          cancelReason: 'No pudo asistir',
          cancelledBy: 'admin',
          cancelledAt: '2099-01-01T10:00:00.000Z',
        }}
      />
    );
    expect(screen.getByText(/No pudo asistir/)).toBeDefined();
    expect(screen.getByText('admin')).toBeDefined();
  });

  it('muestra origen Barbero', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, createdBy: { type: 'staff', userId: 'admin-1' } }}
      />
    );
    expect(screen.getAllByText('Barbero').length).toBe(2);
  });

  it('muestra origen Invitado', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, createdBy: { type: 'anonymous' } }}
      />
    );
    expect(screen.getAllByText('Invitado').length).toBe(2);
  });

  it('muestra el boton "Crear turno para este cliente" y lo llama con el turno', async () => {
    const user = userEvent.setup();
    const onCreateAppointment = vi.fn();

    renderWithProviders(
      <AppointmentDetailModal
        {...defaultProps}
        appointment={{ ...baseAppointment, clientId: 'client-1' }}
        onCreateAppointment={onCreateAppointment}
      />
    );

    const button = screen.getByRole('button', { name: /crear turno para este cliente/i });
    await user.click(button);
    expect(onCreateAppointment).toHaveBeenCalledWith({ ...baseAppointment, clientId: 'client-1' });
  });

  it('no muestra el boton de crear turno si el turno no tiene clientId', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} onCreateAppointment={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /crear turno para este cliente/i })).not.toBeInTheDocument();
  });

  it('no muestra el boton de crear turno si no se pasa el callback', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={{ ...baseAppointment, clientId: 'client-1' }} />
    );
    expect(screen.queryByRole('button', { name: /crear turno para este cliente/i })).not.toBeInTheDocument();
  });
});
