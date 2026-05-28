import { BarberSchedule, BarberScheduleDay } from '../../../domain/entities/Barber';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';

const TIME_ZONE = 'America/Montevideo';
const DEFAULT_SLOT_MINUTES = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type SlotsResult = {
  date: string;
  slots: string[];
};

export class GetAvailableSlotsUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(barberId: string, date: string): Promise<SlotsResult> {
    if (!DATE_PATTERN.test(date)) {
      throw new AppError('Fecha inválida. Formato esperado: YYYY-MM-DD.', 400);
    }

    const barber = await this.barberRepository.findEmployeeById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    const dayKey = getScheduleDayKey(date);
    const daySchedule = barber.schedule[dayKey];

    const slotMinutes = getSlotDuration(barber.slotDuration);
    const slots = buildSlotsForDay(daySchedule, date, slotMinutes);

    return { date, slots };
  }
}

const getScheduleDayKey = (date: string): keyof BarberSchedule => {
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
    throw new AppError('Fecha inválida.', 400);
  }

  return key;
};

const buildSlotsForDay = (
  day: BarberScheduleDay,
  date: string,
  slotMinutes: number
): string[] => {
  if (!day.startTime || !day.endTime) {
    return [];
  }

  const startMinutes = toMinutes(day.startTime);
  const endMinutes = toMinutes(day.endTime);
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
    return [];
  }

  const breakRanges = day.breaks
    .map((entry) => {
      const start = toMinutes(entry.startTime);
      const end = toMinutes(entry.endTime);
      if (start === null || end === null || start >= end) {
        return null;
      }
      return { start, end };
    })
    .filter((entry): entry is { start: number; end: number } => Boolean(entry));

  const nowInfo = getNowInfo();
  const filterPast = nowInfo.date === date;

  const slots: string[] = [];
  for (let minutes = startMinutes; minutes + slotMinutes <= endMinutes; minutes += slotMinutes) {
    if (isInBreak(minutes, breakRanges)) {
      continue;
    }
    if (filterPast && minutes <= nowInfo.minutes) {
      continue;
    }
    slots.push(toTimeString(minutes));
  }

  return slots;
};

const getSlotDuration = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_SLOT_MINUTES;
  }
  return Math.floor(value);
};

const toMinutes = (time: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const toTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const isInBreak = (minutes: number, breaks: { start: number; end: number }[]): boolean => {
  return breaks.some((range) => minutes >= range.start && minutes < range.end);
};

const getNowInfo = () => {
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
