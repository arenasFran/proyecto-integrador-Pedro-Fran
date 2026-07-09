import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TimeSlotGrid } from './TimeSlotGrid';

describe('TimeSlotGrid', () => {
  it('debe mostrar skeleton loading cuando isLoading es true', () => {
    const { container } = render(
      <TimeSlotGrid slots={[]} selectedTime={null} selectedDate={null} isLoading={true} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Horarios')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('debe mostrar mensaje de seleccionar fecha cuando no hay fecha seleccionada ni slots', () => {
    render(<TimeSlotGrid slots={[]} selectedTime={null} selectedDate={null} isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Seleccioná una fecha')).toBeInTheDocument();
  });

  it('debe mostrar sin horarios cuando slots vacío y hay fecha seleccionada', () => {
    render(<TimeSlotGrid slots={[]} selectedTime={null} selectedDate="2024-01-01" isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Sin horarios disponibles')).toBeInTheDocument();
  });

  it('debe mostrar un mensaje de error distinto de "sin horarios" cuando falló el fetch', () => {
    render(
      <TimeSlotGrid slots={[]} selectedTime={null} selectedDate="2024-01-01" isLoading={false} error={true} onSelect={vi.fn()} />
    );
    expect(screen.getByText('No pudimos cargar los horarios. Intentá de nuevo.')).toBeInTheDocument();
    expect(screen.queryByText('Sin horarios disponibles')).not.toBeInTheDocument();
  });

  it('debe renderizar los slots disponibles', () => {
    const slots = ['10:00', '10:30', '11:00'];
    render(<TimeSlotGrid slots={slots} selectedTime={null} selectedDate="2024-01-01" isLoading={false} onSelect={vi.fn()} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('(3 disponibles)')).toBeInTheDocument();
  });

  it('debe llamar onSelect al hacer click en un slot', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TimeSlotGrid slots={['10:00']} selectedTime={null} selectedDate="2024-01-01" isLoading={false} onSelect={onSelect} />);
    await user.click(screen.getByText('10:00'));
    expect(onSelect).toHaveBeenCalledWith('10:00');
  });
});
