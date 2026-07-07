import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BarberCard } from './BarberCard';
import type { BarberPublic } from '../../../types/booking';

const mockBarber: BarberPublic = {
  id: '1',
  name: 'Juan',
  lastname: 'Pérez',
  services: ['corte'],
  photoUrl: null,
  isActive: true,
  slotDuration: 30,
  maxAdvanceDays: 30,
};

describe('BarberCard', () => {
  it('debe renderizar nombre completo del barbero', () => {
    render(<BarberCard barber={mockBarber} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Pérez')).toBeInTheDocument();
  });

  it('debe mostrar icono de check cuando está seleccionado', () => {
    const { container } = render(<BarberCard barber={mockBarber} isSelected={true} onSelect={vi.fn()} />);
    const button = container.querySelector('button');
    expect(button?.className).toContain('border-[#FF5C00]');
  });

  it('debe mostrar icono de usuario cuando no hay foto', () => {
    render(<BarberCard barber={mockBarber} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Pérez')).toBeInTheDocument();
  });

  it('debe llamar onSelect al hacer click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<BarberCard barber={mockBarber} isSelected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockBarber);
  });
});
