import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { AppointmentActionsMenu } from './AppointmentActionsMenu';
import type { Appointment } from '../../../types/booking';
import type { AppointmentActions } from './useAppointmentActions';

const baseAppointment: Appointment = {
  id: 'apt-1',
  barberId: 'barber-1',
  clientName: 'Juan',
  clientLastname: 'Perez',
  clientEmail: 'juan@test.com',
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
  createdAt: '2099-01-01T00:00:00.000Z',
  updatedAt: '2099-01-01T00:00:00.000Z',
};

function makeActions(overrides: Partial<AppointmentActions> = {}): AppointmentActions {
  return {
    setCombinedActionTarget: vi.fn(),
    setRescheduleTarget: vi.fn(),
    setRescheduleDate: vi.fn(),
    setRescheduleTime: vi.fn(),
    setRescheduleBarberId: vi.fn(),
    setConfirmTarget: vi.fn(),
    setCancelTarget: vi.fn(),
    setCancelReason: vi.fn(),
    handleDuplicate: vi.fn(),
    handleSendReminder: vi.fn(),
    setChangeBarberTarget: vi.fn(),
    setChangeBarberNewId: vi.fn(),
    isUpdatingStatus: false,
    isCancelling: false,
    ...overrides,
  } as unknown as AppointmentActions;
}

describe('AppointmentActionsMenu', () => {
  it('no renderiza nada si el turno no está Confirmado', () => {
    const actions = makeActions();
    renderWithProviders(
      <AppointmentActionsMenu appointment={{ ...baseAppointment, status: 'Completado' }} actions={actions} />
    );
    expect(screen.queryByLabelText('Acciones del turno')).toBeNull();
  });

  it('muestra todas las acciones para un turno Confirmado sin pagar', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(<AppointmentActionsMenu appointment={baseAppointment} actions={actions} />);
    await user.click(screen.getByLabelText('Acciones del turno'));

    expect(screen.getByText('Completar')).toBeDefined();
    expect(screen.getByText('Marcar pagado')).toBeDefined();
    expect(screen.getByText('Reprogramar')).toBeDefined();
    expect(screen.getByText('Cambiar barbero')).toBeDefined();
    expect(screen.getByText('Duplicar')).toBeDefined();
    expect(screen.getByText('Recordatorio')).toBeDefined();
    expect(screen.getByText('No asistió')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();
  });

  it('oculta Marcar pagado si el turno ya está pagado', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(
      <AppointmentActionsMenu appointment={{ ...baseAppointment, paymentStatus: 'Pagado' }} actions={actions} />
    );
    await user.click(screen.getByLabelText('Acciones del turno'));
    expect(screen.queryByText('Marcar pagado')).toBeNull();
  });

  it('oculta Marcar pagado para turnos cubiertos por membresía', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(
      <AppointmentActionsMenu appointment={{ ...baseAppointment, paymentMethod: 'memberPass', paymentStatus: 'Pagado' }} actions={actions} />
    );
    await user.click(screen.getByLabelText('Acciones del turno'));
    expect(screen.queryByText('Marcar pagado')).toBeNull();
  });

  it('oculta Recordatorio si el cliente no tiene email', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(
      <AppointmentActionsMenu appointment={{ ...baseAppointment, clientEmail: undefined }} actions={actions} />
    );
    await user.click(screen.getByLabelText('Acciones del turno'));
    expect(screen.queryByText('Recordatorio')).toBeNull();
  });

  it('llama setCombinedActionTarget con primaryAction Completado al hacer click en Completar', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(<AppointmentActionsMenu appointment={baseAppointment} actions={actions} />);
    await user.click(screen.getByLabelText('Acciones del turno'));
    await user.click(screen.getByText('Completar'));
    expect(actions.setCombinedActionTarget).toHaveBeenCalledWith({ appointment: baseAppointment, primaryAction: 'Completado' });
  });

  it('llama setCancelTarget y limpia el motivo al hacer click en Cancelar', async () => {
    const user = userEvent.setup();
    const actions = makeActions();
    renderWithProviders(<AppointmentActionsMenu appointment={baseAppointment} actions={actions} />);
    await user.click(screen.getByLabelText('Acciones del turno'));
    await user.click(screen.getByText('Cancelar'));
    expect(actions.setCancelTarget).toHaveBeenCalledWith(baseAppointment);
    expect(actions.setCancelReason).toHaveBeenCalledWith('');
  });
});
