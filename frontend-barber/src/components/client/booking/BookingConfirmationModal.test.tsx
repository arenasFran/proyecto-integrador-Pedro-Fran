import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BookingConfirmationModal } from './BookingConfirmationModal';
import type { BarberPublic, Service } from '../../../types/booking';

const mockBarber: BarberPublic = {
  id: '1', name: 'Juan', lastname: 'Pérez', services: ['corte'],
  photoUrl: null, isActive: true, slotDuration: 30, maxAdvanceDays: 30,
};

const mockService: Service = {
  id: '1', name: 'Corte', description: 'Corte clásico', price: 1500, imageUrl: '',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  barber: mockBarber,
  service: mockService,
  selectedDate: '2025-06-20',
  selectedTime: '10:00',
  totalPrice: 1500,
  totalDuration: 30,
};

describe('BookingConfirmationModal', () => {
  it('debe mostrar el modal cuando isOpen es true', () => {
    render(<BookingConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Revisá los detalles de tu turno')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Corte · 30 min')).toBeInTheDocument();
  });

  it('debe ocultarse cuando isOpen es false', () => {
    render(<BookingConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Revisá los detalles de tu turno')).not.toBeInTheDocument();
  });

  it('debe deshabilitar el botón si los datos son inválidos', () => {
    render(<BookingConfirmationModal {...defaultProps} />);
    const button = screen.getByRole('button', { name: /confirmar reserva/i });
    expect(button).toBeDisabled();
  });

  it('debe habilitar el botón con datos válidos', async () => {
    const user = userEvent.setup();
    render(<BookingConfirmationModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('Nombre *'), 'Carlos');
    await user.type(screen.getByPlaceholderText('Apellido *'), 'García');
    await user.type(screen.getByPlaceholderText('Teléfono'), '123456789');
    await user.type(screen.getByPlaceholderText('Email'), 'test@test.com');

    expect(screen.getByRole('button', { name: /confirmar reserva/i })).not.toBeDisabled();
  });

  it('debe llamar onSubmit con los datos del formulario', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<BookingConfirmationModal {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('Nombre *'), 'Carlos');
    await user.type(screen.getByPlaceholderText('Apellido *'), 'García');
    await user.type(screen.getByPlaceholderText('Teléfono'), '123456789');
    await user.type(screen.getByPlaceholderText('Email'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Carlos',
      lastname: 'García',
      phone: '123456789',
      email: 'test@test.com',
    });
  });
});
