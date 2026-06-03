import { BarberSchedule, BarberScheduleDay } from '../entities/Barber';

const TIME_ZONE = 'America/Montevideo';
const DEFAULT_SLOT_MINUTES = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type SlotsResult = {
  date: string;
  slots: string[];
};

export class SlotService {
  execute(date: string, schedule: BarberSchedule, slotDuration: number): SlotsResult {
    const dayKey = this.getScheduleDayKey(date);
    const daySchedule = schedule[dayKey];
    const slotMinutes = this.getSlotDuration(slotDuration);
    const slots = this.buildSlotsForDay(daySchedule, date, slotMinutes);

    return { date, slots };
  }

  isValidDate(date: string): boolean {
    return DATE_PATTERN.test(date);
  }

  private getScheduleDayKey(date: string): keyof BarberSchedule {
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
      throw new Error('Fecha inválida.');
    }

    return key;
  }

  private buildSlotsForDay(
    day: BarberScheduleDay,
    date: string,
    slotMinutes: number
  ): string[] {
    if (!day.startTime || !day.endTime) {
      return [];
    }

    const startMinutes = this.toMinutes(day.startTime);
    const endMinutes = this.toMinutes(day.endTime);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
      return [];
    }

    const breakRanges = day.breaks
      .map((entry) => {
        const start = this.toMinutes(entry.startTime);
        const end = this.toMinutes(entry.endTime);
        if (start === null || end === null || start >= end) {
          return null;
        }
        return { start, end };
      })
      .filter((entry): entry is { start: number; end: number } => Boolean(entry));

    const nowInfo = this.getNowInfo();
    const filterPast = nowInfo.date === date;

    const slots: string[] = [];
    for (let minutes = startMinutes; minutes + slotMinutes <= endMinutes; minutes += slotMinutes) {
      if (this.isInBreak(minutes, breakRanges)) {
        continue;
      }
      if (filterPast && minutes <= nowInfo.minutes) {
        continue;
      }
      slots.push(this.toTimeString(minutes));
    }

    return slots;
  }

  private getSlotDuration(value?: number): number {
    if (!value || !Number.isFinite(value) || value <= 0) {
      return DEFAULT_SLOT_MINUTES;
    }
    return Math.floor(value);
  }

  private toMinutes(time: string): number | null {
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
  }

  private toTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private isInBreak(minutes: number, breaks: { start: number; end: number }[]): boolean {
    return breaks.some((range) => minutes >= range.start && minutes < range.end);
  }

  private getNowInfo() {
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
  }
}
