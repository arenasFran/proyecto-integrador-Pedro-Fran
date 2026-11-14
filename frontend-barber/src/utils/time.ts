import type { BarberSchedule, DayKey, ScheduleDay } from '../types/professional';

export const LAST_MINUTE_OF_DAY = 23 * 60 + 59;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_KEYS: DayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function toMinutes(time: string): number | null {
  if (!isValidTime(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Devuelve la hora de fin o '' si el turno cruzaría la medianoche.
 * El backend rechaza esos turnos, así que la UI evita ofrecerlos.
 */
export function addMinutes(time: string, minutes: number): string {
  const start = toMinutes(time);
  if (start === null) return '';
  const end = start + minutes;
  if (end > LAST_MINUTE_OF_DAY) return '';
  return toTimeString(end);
}

export function getDayKey(dateStr: string): DayKey | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return DAY_KEYS[date.getDay()] ?? null;
}

export function isWithinSchedule(
  startTime: string,
  endTime: string,
  day: ScheduleDay
): boolean {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const dayStart = day.startTime ? toMinutes(day.startTime) : null;
  const dayEnd = day.endTime ? toMinutes(day.endTime) : null;
  if (start === null || end === null || dayStart === null || dayEnd === null) {
    return false;
  }
  return start >= dayStart && end <= dayEnd;
}

export function isInBreak(
  startTime: string,
  endTime: string,
  day: ScheduleDay
): boolean {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return false;

  return day.breaks.some((scheduleBreak) => {
    const breakStart = toMinutes(scheduleBreak.startTime);
    const breakEnd = toMinutes(scheduleBreak.endTime);
    if (breakStart === null || breakEnd === null) return false;
    return start < breakEnd && end > breakStart;
  });
}

export function isOutOfSchedule(
  startTime: string,
  endTime: string,
  day: ScheduleDay
): boolean {
  return !isWithinSchedule(startTime, endTime, day) || isInBreak(startTime, endTime, day);
}

export function getDaySchedule(
  schedule: BarberSchedule | null | undefined,
  dateStr: string
): ScheduleDay | null {
  const dayKey = getDayKey(dateStr);
  if (!schedule || !dayKey) return null;
  return schedule[dayKey] ?? null;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
