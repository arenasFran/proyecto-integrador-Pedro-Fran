import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StickyBookingFooter } from './StickyBookingFooter';
import type { BarberPublic, Service } from '../../../types/booking';

const mockBarber: BarberPublic = {
  id: '1', name: 'Juan', lastname: 'Pérez', services: ['corte'],
  photoUrl: null, isActive: true, slotDuration: 30, maxAdvanceDays: 30,
};

const mockService: Service = {
  id: '1', name: 'Corte', description: 'Corte clásico', price: 1500, imageUrl: '',
};

const defaultProps = {
  barber: mockBarber,
  service: mockService,
  selectedDate: '2025-06-20',
  selectedTime: '10:00',
  isStepComplete: false,
  isConfirming: false,
  confirmError: null,
  onSubmit: vi.fn(),
};

describe('StickyBookingFooter', () => {
  it('debe renderizar resumen de reserva', () => {
    render(<StickyBookingFooter {...defaultProps} />);
    expect(screen.getByText('Resumen de reserva')).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
  });

  it('debe mostrar el precio del servicio', () => {
    render(<StickyBookingFooter {...defaultProps} />);
    const prices = screen.getAllByText('$1500');
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it('debe tener el botón deshabilitado cuando isStepComplete es false', () => {
    render(<StickyBookingFooter {...defaultProps} />);
    const buttons = screen.getAllByRole('button', { name: /confirmar reserva/i });
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('debe llamar onSubmit al confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<StickyBookingFooter {...defaultProps} isStepComplete={true} onSubmit={onSubmit} />);

    const buttons = screen.getAllByRole('button', { name: /confirmar reserva/i });
    await user.click(buttons[0]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar mensaje de error cuando confirmError tiene valor', () => {
    render(<StickyBookingFooter {...defaultProps} confirmError="Error al reservar" />);
    expect(screen.getByText('Error al reservar')).toBeInTheDocument();
  });
});
