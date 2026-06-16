import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BookingCalendar } from './BookingCalendar';

const today = new Date();
// Use next month to ensure navigation and dates are always clickable
const futureMonth = today.getMonth() + 1 > 11 ? 0 : today.getMonth() + 1;
const futureYear = today.getMonth() + 1 > 11 ? today.getFullYear() + 1 : today.getFullYear();

const defaultProps = {
  selectedDate: null,
  onSelectDate: vi.fn(),
  month: futureMonth,
  year: futureYear,
  maxAdvanceDays: 30,
  onPrevMonth: vi.fn(),
  onNextMonth: vi.fn(),
};

describe('BookingCalendar', () => {
  it('debe renderizar el mes y año', () => {
    render(<BookingCalendar {...defaultProps} />);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const monthName = months[futureMonth];
    expect(screen.getByText(new RegExp(monthName, 'i'))).toBeInTheDocument();
  });

  it('debe renderizar los días de la semana', () => {
    render(<BookingCalendar {...defaultProps} />);
    expect(screen.getByText('LU')).toBeInTheDocument();
    expect(screen.getByText('DO')).toBeInTheDocument();
  });

  it('debe navegar al mes anterior', async () => {
    const onPrevMonth = vi.fn();
    const user = userEvent.setup();
    render(<BookingCalendar {...defaultProps} onPrevMonth={onPrevMonth} />);

    const prevButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg')
    );
    expect(prevButton).toBeTruthy();
    await user.click(prevButton!);
    expect(onPrevMonth).toHaveBeenCalled();
  });

  it('debe seleccionar una fecha al hacer click', async () => {
    const onSelectDate = vi.fn();
    const user = userEvent.setup();
    render(<BookingCalendar {...defaultProps} onSelectDate={onSelectDate} />);

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !isNaN(Number(btn.textContent)) && btn.textContent!.trim() !== ''
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    await user.click(dayButtons[0]);
    expect(onSelectDate).toHaveBeenCalled();
  });
});
