import { BarberSchedule, BarberScheduleDay, BarberScheduleBreak } from '../entities/Barber';

const TIME_ZONE = 'America/Montevideo';

export const toMinutes = (time: string): number | null => {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export const toTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const doesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return true;
  }
  return aStart < bEnd && bStart < aEnd;
};

export const getDayKey = (date: string): keyof BarberSchedule => {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: TIME_ZONE,
  })
    .format(new Date(`${date}T12:00:00Z`))
    .toLowerCase();

  const map: Record<string, keyof BarberSchedule> = {
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
    sunday: 'sunday',
  };

  const key = map[weekday];
  if (!key) {
    throw new Error('Fecha invalida.');
  }
  return key;
};

export const isWithinSchedule = (
  startMinutes: number,
  endMinutes: number,
  daySchedule: BarberScheduleDay
): boolean => {
  if (!daySchedule.startTime || !daySchedule.endTime) return false;
  const dayStart = toMinutes(daySchedule.startTime);
  const dayEnd = toMinutes(daySchedule.endTime);
  if (dayStart === null || dayEnd === null) return false;
  return startMinutes >= dayStart && endMinutes <= dayEnd;
};

export const isInBreakRange = (
  startMinutes: number,
  endMinutes: number,
  breaks: BarberScheduleBreak[]
): boolean => {
  return breaks.some((b) => {
    const bStart = toMinutes(b.startTime);
    const bEnd = toMinutes(b.endTime);
    if (bStart === null || bEnd === null) return false;
    return startMinutes < bEnd && bStart < endMinutes;
  });
};

export const getNowInTimezone = (): { date: string; minutes: number } => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const date = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const minutes = Number(getPart('hour')) * 60 + Number(getPart('minute'));

  return { date, minutes };
};
