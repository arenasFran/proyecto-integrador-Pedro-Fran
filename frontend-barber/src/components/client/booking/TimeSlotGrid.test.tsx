import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TimeSlotGrid } from './TimeSlotGrid';

describe('TimeSlotGrid', () => {
  it('debe mostrar skeleton loading cuando isLoading es true', () => {
    const { container } = render(
      <TimeSlotGrid slots={[]} selectedTime={null} isLoading={true} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Horarios')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('debe mostrar mensaje de seleccionar fecha cuando no hay slots ni selección', () => {
    render(<TimeSlotGrid slots={[]} selectedTime={null} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Seleccioná una fecha')).toBeInTheDocument();
  });

  it('debe mostrar sin horarios cuando slots vacío y hay fecha seleccionada', () => {
    render(<TimeSlotGrid slots={[]} selectedTime="10:00" isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Sin horarios disponibles')).toBeInTheDocument();
  });

  it('debe renderizar los slots disponibles', () => {
    const slots = ['10:00', '10:30', '11:00'];
    render(<TimeSlotGrid slots={slots} selectedTime={null} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('(3 disponibles)')).toBeInTheDocument();
  });

  it('debe llamar onSelect al hacer click en un slot', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TimeSlotGrid slots={['10:00']} selectedTime={null} isLoading={false} onSelect={onSelect} />);
    await user.click(screen.getByText('10:00'));
    expect(onSelect).toHaveBeenCalledWith('10:00');
  });
});
