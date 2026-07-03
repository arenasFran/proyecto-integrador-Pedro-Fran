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
  onComplete: vi.fn(),
  onNoShow: vi.fn(),
  onCancel: vi.fn(),
  onReschedule: vi.fn(),
  onMarkAsPaid: vi.fn(),
  onDuplicate: vi.fn(),
  onSendReminder: vi.fn(),
  onChangeBarber: vi.fn(),
  isCompleting: false,
  isMarkingNoShow: false,
  isMarkingPaid: false,
  isSendingReminder: false,
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

  it('muestra badge de origen Online', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getAllByText('Online').length).toBe(2);
  });

  it('muestra el historial de cambios', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Historial de cambios')).toBeDefined();
    expect(screen.getAllByText('Confirmado').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/por system/)).toBeDefined();
  });

  it('muestra botones de accion para turno Confirmado', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Completar')).toBeDefined();
    expect(screen.getByText('No asistió')).toBeDefined();
    expect(screen.getByText('Reprogramar')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();
    expect(screen.getByText('Duplicar')).toBeDefined();
    expect(screen.getByText('Cambiar barbero')).toBeDefined();
  });

  it('muestra boton Recordatorio solo si el cliente tiene email', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Recordatorio')).toBeDefined();
  });

  it('oculta boton Recordatorio si el cliente no tiene email', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, clientEmail: undefined }}
      />
    );
    expect(screen.queryByText('Recordatorio')).toBeNull();
  });

  it('muestra boton Marcar pagado para turno Pendiente', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} />
    );
    expect(screen.getByText('Marcar pagado')).toBeDefined();
  });

  it('oculta boton Marcar pagado si ya está pagado', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, paymentStatus: 'Pagado' }}
      />
    );
    expect(screen.queryByText('Marcar pagado')).toBeNull();
  });

  it('no muestra botones de accion para turno Completado', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, status: 'Completado' }}
      />
    );
    expect(screen.queryByText('Completar')).toBeNull();
    expect(screen.queryByText('Cancelar')).toBeNull();
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
    expect(screen.getByText(/Por: admin/)).toBeDefined();
  });

  it('llama onComplete con el appointment al hacer click en Completar', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} onComplete={onComplete} />
    );
    await user.click(screen.getByText('Completar'));
    expect(onComplete).toHaveBeenCalledWith(baseAppointment);
  });

  it('llama onMarkAsPaid con el appointment al hacer click en Marcar pagado', async () => {
    const user = userEvent.setup();
    const onMarkAsPaid = vi.fn();
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} onMarkAsPaid={onMarkAsPaid} />
    );
    await user.click(screen.getByText('Marcar pagado'));
    expect(onMarkAsPaid).toHaveBeenCalledWith(baseAppointment);
  });

  it('llama onDuplicate con el appointment al hacer click en Duplicar', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} onDuplicate={onDuplicate} />
    );
    await user.click(screen.getByText('Duplicar'));
    expect(onDuplicate).toHaveBeenCalledWith(baseAppointment);
  });

  it('llama onSendReminder con el id al hacer click en Recordatorio', async () => {
    const user = userEvent.setup();
    const onSendReminder = vi.fn();
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps} appointment={baseAppointment} onSendReminder={onSendReminder} />
    );
    await user.click(screen.getByText('Recordatorio'));
    expect(onSendReminder).toHaveBeenCalledWith('apt-1');
  });

  it('muestra origen Admin', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, createdBy: { type: 'staff', userId: 'admin-1' } }}
      />
    );
    expect(screen.getAllByText('Admin').length).toBe(2);
    expect(screen.getByText('ID: admin-1')).toBeDefined();
  });

  it('muestra origen Invitado', () => {
    renderWithProviders(
      <AppointmentDetailModal {...defaultProps}
        appointment={{ ...baseAppointment, createdBy: { type: 'anonymous' } }}
      />
    );
    expect(screen.getAllByText('Invitado').length).toBe(2);
  });
});
