import { describe, expect, it } from 'vitest';
import type { ScheduleDay } from '../types/professional';
import {
  addMinutes,
  formatDuration,
  getDayKey,
  getDaySchedule,
  isInBreak,
  isOutOfSchedule,
  isWithinSchedule,
  toMinutes,
  toTimeString,
} from './time';

const workday: ScheduleDay = {
  startTime: '09:00',
  endTime: '19:00',
  breaks: [{ startTime: '12:00', endTime: '14:00' }],
};

const dayOff: ScheduleDay = { startTime: null, endTime: null, breaks: [] };

describe('time utils', () => {
  it('convierte entre HH:mm y minutos', () => {
    expect(toMinutes('21:00')).toBe(1260);
    expect(toMinutes('23:59')).toBe(1439);
    expect(toMinutes('24:00')).toBeNull();
    expect(toMinutes('9:00')).toBeNull();
    expect(toTimeString(1260)).toBe('21:00');
    expect(toTimeString(1439)).toBe('23:59');
  });

  it('calcula la hora de fin del turno', () => {
    expect(addMinutes('21:00', 30)).toBe('21:30');
    expect(addMinutes('23:29', 30)).toBe('23:59');
    expect(addMinutes('23:45', 30)).toBe('');
    expect(addMinutes('', 30)).toBe('');
  });

  it('formatea la duración', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(0)).toBe('');
  });

  it('resuelve el día de la semana de una fecha', () => {
    expect(getDayKey('2026-07-05')).toBe('sunday');
    expect(getDayKey('2026-07-06')).toBe('monday');
    expect(getDayKey('05/07/2026')).toBeNull();
    expect(getDayKey('')).toBeNull();
  });

  it('detecta horarios fuera de la agenda, en descansos y en días libres', () => {
    expect(isWithinSchedule('10:00', '10:30', workday)).toBe(true);
    expect(isWithinSchedule('18:30', '19:00', workday)).toBe(true);
    expect(isWithinSchedule('18:45', '19:15', workday)).toBe(false);
    expect(isWithinSchedule('08:30', '09:00', workday)).toBe(false);

    expect(isInBreak('13:00', '13:30', workday)).toBe(true);
    expect(isInBreak('12:00', '12:30', workday)).toBe(true);
    expect(isInBreak('11:30', '12:00', workday)).toBe(false);
    expect(isInBreak('14:00', '14:30', workday)).toBe(false);

    expect(isOutOfSchedule('21:00', '21:30', workday)).toBe(true);
    expect(isOutOfSchedule('13:00', '13:30', workday)).toBe(true);
    expect(isOutOfSchedule('10:00', '10:30', workday)).toBe(false);
    expect(isOutOfSchedule('10:00', '10:30', dayOff)).toBe(true);
  });

  it('obtiene el horario del día según la fecha', () => {
    const schedule = {
      monday: workday,
      tuesday: workday,
      wednesday: workday,
      thursday: workday,
      friday: workday,
      saturday: workday,
      sunday: dayOff,
    };

    expect(getDaySchedule(schedule, '2026-07-06')).toBe(workday);
    expect(getDaySchedule(schedule, '2026-07-05')).toBe(dayOff);
    expect(getDaySchedule(null, '2026-07-06')).toBeNull();
    expect(getDaySchedule(schedule, '')).toBeNull();
  });
});
