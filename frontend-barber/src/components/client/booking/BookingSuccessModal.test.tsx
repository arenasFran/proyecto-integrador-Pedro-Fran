import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BookingSuccessModal } from './BookingSuccessModal';
import type { Appointment } from '../../../types/booking';

const mockAppointment: Appointment = {
  id: '1',
  barberId: '1',
  clientName: 'Carlos',
  clientLastname: 'García',
  serviceId: '1',
  serviceName: 'Corte',
  servicePrice: 1500,
  serviceDuration: 30,
  date: '2025-06-20',
  startTime: '10:00',
  endTime: '10:30',
  status: 'Confirmado',
  paymentStatus: 'Pendiente',
  paymentMethod: 'local',
  createdAt: '2025-06-16T00:00:00Z',
  updatedAt: '2025-06-16T00:00:00Z',
};

describe('BookingSuccessModal', () => {
  it('debe mostrar la información del turno cuando está abierto', () => {
    render(<BookingSuccessModal isOpen={true} appointment={mockAppointment} onClose={vi.fn()} />);
    expect(screen.getByText('Reserva confirmada')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Carlos García')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 10:30')).toBeInTheDocument();
  });

  it('debe ocultarse cuando isOpen es false', () => {
    render(<BookingSuccessModal isOpen={false} appointment={mockAppointment} onClose={vi.fn()} />);
    expect(screen.queryByText('Reserva confirmada')).not.toBeInTheDocument();
  });

  it('debe ocultarse cuando appointment es null', () => {
    render(<BookingSuccessModal isOpen={true} appointment={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Reserva confirmada')).not.toBeInTheDocument();
  });

  it('debe llamar onClose al hacer clic en volver', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<BookingSuccessModal isOpen={true} appointment={mockAppointment} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /volver al inicio/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
