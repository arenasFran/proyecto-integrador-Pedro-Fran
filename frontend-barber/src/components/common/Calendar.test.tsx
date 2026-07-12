import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Calendar } from './Calendar';
import type { BarberSchedule } from '../../types/professional';

const workingDay = { startTime: '09:00', endTime: '18:00', breaks: [] };
const dayOff = { startTime: null, endTime: null, breaks: [] };

const fullSchedule = (overrides?: Partial<BarberSchedule>): BarberSchedule => ({
  monday: workingDay,
  tuesday: workingDay,
  wednesday: workingDay,
  thursday: workingDay,
  friday: workingDay,
  saturday: workingDay,
  sunday: workingDay,
  ...overrides,
});

const today = new Date();

const defaultProps = {
  selectedDate: null,
  onSelectDate: vi.fn(),
  maxAdvanceDays: 60,
  schedule: fullSchedule(),
};

describe('Calendar', () => {
  it('debe renderizar el mes y año actuales', () => {
    render(<Calendar {...defaultProps} />);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    expect(screen.getByText(new RegExp(months[today.getMonth()], 'i'))).toBeInTheDocument();
  });

  it('debe renderizar los días de la semana', () => {
    render(<Calendar {...defaultProps} />);
    expect(screen.getByText('LU')).toBeInTheDocument();
    expect(screen.getByText('DO')).toBeInTheDocument();
  });

  it('debe seleccionar una fecha habilitada al hacer click', async () => {
    const onSelectDate = vi.fn();
    const user = userEvent.setup();
    render(<Calendar {...defaultProps} onSelectDate={onSelectDate} />);

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !isNaN(Number(btn.textContent)) && btn.textContent!.trim() !== '' && !(btn as HTMLButtonElement).disabled
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    await user.click(dayButtons[0]);
    expect(onSelectDate).toHaveBeenCalledWith(expect.any(String));
  });

  it('debe deshabilitar los días en que el barbero no trabaja', async () => {
    const onSelectDate = vi.fn();
    const user = userEvent.setup();

    render(
      <Calendar
        selectedDate={null}
        onSelectDate={onSelectDate}
        maxAdvanceDays={60}
        schedule={fullSchedule({ sunday: dayOff })}
      />
    );

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !isNaN(Number(btn.textContent)) && btn.textContent!.trim() !== ''
    );
    const disabledDay = dayButtons.find((btn) => (btn as HTMLButtonElement).disabled);
    expect(disabledDay).toBeTruthy();

    if (disabledDay) {
      await user.click(disabledDay);
    }
    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it('no debe deshabilitar días futuros por horario si todavía no llegó el schedule (undefined)', () => {
    render(<Calendar selectedDate={null} onSelectDate={vi.fn()} maxAdvanceDays={60} schedule={undefined} />);

    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !isNaN(Number(btn.textContent)) && btn.textContent!.trim() !== ''
    );
    const todayNumber = today.getDate();
    const futureDayButtons = dayButtons.filter((btn) => Number(btn.textContent) > todayNumber);

    futureDayButtons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
