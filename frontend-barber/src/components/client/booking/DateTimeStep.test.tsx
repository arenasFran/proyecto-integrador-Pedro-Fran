import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTimeStep } from './DateTimeStep';

const mockDispatch = vi.fn(() => ({ abort: vi.fn() }));

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock('../../../store/slices/bookingSlice', () => ({
  fetchAvailableSlots: vi.fn(
    (payload: { barberId: string; date: string }) =>
      ({ type: 'booking/fetchAvailableSlots', meta: { arg: payload } }) as never
  ),
}));

const defaultProps = {
  barberId: 'barber1',
  maxAdvanceDays: 30,
  selectedDate: null,
  selectedTime: null,
  availableSlots: [],
  isLoadingSlots: false,
  onSelectDate: vi.fn(),
  onSelectTime: vi.fn(),
};

describe('DateTimeStep', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders calendar and time slot grid with prompt', () => {
    render(<DateTimeStep {...defaultProps} />);
    expect(
      screen.getByText(/Elegí la fecha y el horario/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Horarios')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('shows "Seleccioná una fecha" when no date is selected and no slots', () => {
    render(<DateTimeStep {...defaultProps} />);
    expect(screen.getByText('Seleccioná una fecha')).toBeInTheDocument();
  });

  it('shows loading state for time slots when isLoadingSlots is true', () => {
    const { container } = render(
      <DateTimeStep
        {...defaultProps}
        selectedDate="2026-06-20"
        isLoadingSlots={true}
      />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows "Sin horarios disponibles" when date selected but no slots', () => {
    render(
      <DateTimeStep
        {...defaultProps}
        selectedDate="2026-06-20"
        selectedTime="10:00"
        availableSlots={[]}
      />
    );
    expect(
      screen.getByText('Sin horarios disponibles')
    ).toBeInTheDocument();
  });

  it('renders available time slots when provided', () => {
    render(
      <DateTimeStep
        {...defaultProps}
        selectedDate="2026-06-20"
        availableSlots={['10:00', '11:00', '12:00']}
      />
    );
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('dispatches fetchAvailableSlots when selectedDate and barberId are provided', () => {
    render(
      <DateTimeStep
        {...defaultProps}
        selectedDate="2026-06-20"
      />
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'booking/fetchAvailableSlots' })
    );
  });

  it('does not dispatch fetchAvailableSlots when selectedDate is null', () => {
    render(<DateTimeStep {...defaultProps} />);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'booking/fetchAvailableSlots' })
    );
  });

  it('calls onSelectTime when a time slot is clicked', async () => {
    const onSelectTime = vi.fn();
    const user = userEvent.setup();
    render(
      <DateTimeStep
        {...defaultProps}
        selectedDate="2026-06-20"
        availableSlots={['10:00', '11:00']}
        onSelectTime={onSelectTime}
      />
    );

    await user.click(screen.getByText('10:00'));
    expect(onSelectTime).toHaveBeenCalledWith('10:00');
  });
});
