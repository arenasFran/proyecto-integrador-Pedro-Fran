import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RescheduleModal } from './RescheduleModal';
import type { Appointment } from '../../../types/booking';
import type { Professional } from '../../../types/professional';

const day = { startTime: '09:00', endTime: '19:00', breaks: [] };
const schedule = {
  monday: day,
  tuesday: day,
  wednesday: day,
  thursday: day,
  friday: day,
  saturday: day,
  sunday: day,
};

const barber = {
  id: 'b1',
  name: 'Juan',
  lastname: 'Pérez',
  email: 'juan@test.com',
  phone: '099111222',
  kind: 'Empleado',
  services: [],
  isActive: true,
  slotDuration: 30,
  maxAdvanceDays: 30,
  schedule,
} as Professional;

const target = {
  id: 'a1',
  barberId: 'b1',
  clientName: 'Pedro',
  clientLastname: 'Fran',
  date: '2026-07-06',
  startTime: '10:00',
} as Appointment;

const baseProps = {
  target,
  date: '2026-07-06',
  time: '10:00',
  barberId: 'b1',
  isRescheduling: false,
  barbers: [barber],
  slots: ['10:00', '10:30'],
  isLoadingSlots: false,
  onDateChange: vi.fn(),
  onTimeChange: vi.fn(),
  onBarberChange: vi.fn(),
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('RescheduleModal', () => {
  it('muestra la duración del turno', () => {
    render(<RescheduleModal {...baseProps} />);
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('permite reprogramar fuera de agenda con hora en formato 24 h', async () => {
    const onTimeChange = vi.fn();
    const user = userEvent.setup();

    render(<RescheduleModal {...baseProps} onTimeChange={onTimeChange} />);

    await user.click(screen.getByRole('button', { name: 'Fuera de agenda' }));
    await user.click(screen.getByRole('button', { name: '10' }));
    await user.click(screen.getByRole('option', { name: '21' }));

    expect(onTimeChange).toHaveBeenCalledWith('21:00');
  }, 15000);
});
