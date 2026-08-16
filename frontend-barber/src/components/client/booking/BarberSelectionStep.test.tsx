import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BarberSelectionStep } from './BarberSelectionStep';
import type { BarberPublic } from '../../../types/booking';

const workingDay = { startTime: '09:00', endTime: '18:00', breaks: [] };
const mockSchedule = {
  monday: workingDay, tuesday: workingDay, wednesday: workingDay, thursday: workingDay,
  friday: workingDay, saturday: workingDay, sunday: { startTime: null, endTime: null, breaks: [] },
};

const mockBarber1: BarberPublic = {
  id: 'barber1',
  name: 'Carlos',
  lastname: 'López',
  services: ['corte'],
  photoUrl: null,
  isActive: true,
  slotDuration: 30,
  maxAdvanceDays: 30,
  schedule: mockSchedule,
};

const mockBarber2: BarberPublic = {
  id: 'barber2',
  name: 'María',
  lastname: 'García',
  services: ['corte', 'color'],
  photoUrl: null,
  isActive: true,
  slotDuration: 45,
  maxAdvanceDays: 30,
  schedule: mockSchedule,
};

const mockBarbers = [mockBarber1, mockBarber2];
const defaultProps = {
  barbers: mockBarbers,
  selectedBarber: null,
  isLoading: false,
  error: null,
  onSelect: vi.fn(),
};

describe('BarberSelectionStep', () => {
  it('does not render intermediate content while barbers are loading', () => {
    const { container } = render(
      <BarberSelectionStep {...defaultProps} barbers={[]} isLoading={true} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders error message when error and no barbers', () => {
    render(
      <BarberSelectionStep
        {...defaultProps}
        barbers={[]}
        error="Error al cargar barberos"
      />
    );
    expect(screen.getByText('Error al cargar barberos')).toBeInTheDocument();
    expect(screen.getByText('Intentá de nuevo más tarde')).toBeInTheDocument();
  });

  it('renders empty state when no barbers', () => {
    render(<BarberSelectionStep {...defaultProps} barbers={[]} />);
    expect(screen.getByText('No hay barberos disponibles')).toBeInTheDocument();
  });

  it('renders barber names when barbers are provided', () => {
    render(<BarberSelectionStep {...defaultProps} />);
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('López')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.getByText('García')).toBeInTheDocument();
  });

  it('renders error banner alongside barbers when error and barbers exist', () => {
    render(
      <BarberSelectionStep
        {...defaultProps}
        error="Algunos barberos no están disponibles"
      />
    );
    expect(
      screen.getByText('Algunos barberos no están disponibles')
    ).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
  });

  it('shows "any barber" button when onSelectAny provided', () => {
    render(<BarberSelectionStep {...defaultProps} onSelectAny={vi.fn()} />);
    expect(screen.getByText('No tengo preferencia')).toBeInTheDocument();
  });

  it('shows selected "any barber" state', () => {
    render(
      <BarberSelectionStep
        {...defaultProps}
        onSelectAny={vi.fn()}
        anyBarber={true}
      />
    );
    expect(
      screen.getByText('Sin preferencia (elegimos el mejor horario)')
    ).toBeInTheDocument();
  });

  it('calls onSelect when a barber card is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<BarberSelectionStep {...defaultProps} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Carlos López/ }));
    expect(onSelect).toHaveBeenCalledWith(mockBarber1);
  });

  it('calls onSelectAny when "any barber" button is clicked', async () => {
    const onSelectAny = vi.fn();
    const user = userEvent.setup();
    render(
      <BarberSelectionStep {...defaultProps} onSelectAny={onSelectAny} />
    );

    await user.click(screen.getByText('No tengo preferencia'));
    expect(onSelectAny).toHaveBeenCalledTimes(1);
  });
});
