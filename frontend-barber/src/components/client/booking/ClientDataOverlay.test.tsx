import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ClientDataOverlay } from './ClientDataOverlay';
import type { BarberPublic, Service } from '../../../types/booking';

const mockBarber: BarberPublic = {
  id: '1', name: 'Juan', lastname: 'Pérez', services: ['corte'],
  photoUrl: null, isActive: true, slotDuration: 30, maxAdvanceDays: 30,
};

const mockService: Service = {
  id: '1', name: 'Corte', description: 'Corte clásico', price: 1500, imageUrl: '', status: 'active',
};

const defaultProps = {
  isOpen: true,
  barber: mockBarber,
  service: mockService,
  selectedDate: '2025-06-20',
  selectedTime: '10:00',
  clientName: '',
  clientLastname: '',
  clientPhone: '',
  clientEmail: '',
  isConfirming: false,
  confirmError: null,
  onChange: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('ClientDataOverlay', () => {
  it('debe mostrar el overlay cuando isOpen es true', () => {
    render(<ClientDataOverlay {...defaultProps} />);
    expect(screen.getByText('Casi listo')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Corte · $1500')).toBeInTheDocument();
  });

  it('debe ocultarse cuando isOpen es false', () => {
    render(<ClientDataOverlay {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Casi listo')).not.toBeInTheDocument();
  });

  it('debe deshabilitar el botón con datos inválidos', () => {
    render(<ClientDataOverlay {...defaultProps} />);
    expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeDisabled();
  });

  it('debe mostrar error cuando confirmError tiene valor', () => {
    render(<ClientDataOverlay {...defaultProps} confirmError="Error al confirmar" />);
    expect(screen.getByText('Error al confirmar')).toBeInTheDocument();
  });

  it('debe llamar onChange al escribir en los campos', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ClientDataOverlay {...defaultProps} onChange={onChange} clientName="Carlos" />);

    const input = screen.getByPlaceholderText('Nombre');
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Carlosx' })
    );
  });

  it('debe mostrar "Tus datos" cuando isLoggedIn es true', () => {
    render(<ClientDataOverlay {...defaultProps} isLoggedIn={true} />);
    expect(screen.getByText('Tus datos')).toBeInTheDocument();
  });
});
