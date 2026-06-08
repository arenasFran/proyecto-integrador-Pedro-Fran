import { BarberSchedule, BarberScheduleDay } from '../entities/Barber';
import {
  toMinutes,
  toTimeString,
  doesOverlap,
  getDayKey,
  isInBreakRange,
  getNowInTimezone,
} from '../utils/time';

const DEFAULT_SLOT_MINUTES = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type OccupiedSlot = {
  startTime: string;
  endTime: string;
  status: string;
};

export type SlotsResult = {
  date: string;
  slots: string[];
};

export class SlotService {
  execute(
    date: string,
    schedule: BarberSchedule,
    slotDuration: number,
    occupiedSlots?: OccupiedSlot[]
  ): SlotsResult {
    const dayKey = getDayKey(date);
    const daySchedule = schedule[dayKey];
    const slotMinutes = this.getSlotDuration(slotDuration);
    const slots = this.buildSlotsForDay(daySchedule, date, slotMinutes);
    const filtered = this.filterOccupiedSlots(slots, slotMinutes, occupiedSlots);

    return { date, slots: filtered };
  }

  private filterOccupiedSlots(
    slots: string[],
    slotMinutes: number,
    occupiedSlots?: OccupiedSlot[]
  ): string[] {
    const busySlots = new Set<string>();
    if (occupiedSlots) {
      for (const appointment of occupiedSlots) {
        if (appointment.status === 'Cancelado') continue;
        const start = toMinutes(appointment.startTime);
        const end = toMinutes(appointment.endTime);
        if (start === null || end === null) continue;
        for (let m = start; m < end; m += slotMinutes) {
          busySlots.add(toTimeString(m));
        }
      }
    }

    return slots.filter((slot) => !busySlots.has(slot));
  }

  isValidDate(date: string): boolean {
    return DATE_PATTERN.test(date);
  }

  private buildSlotsForDay(
    day: BarberScheduleDay,
    date: string,
    slotMinutes: number
  ): string[] {
    if (!day.startTime || !day.endTime) {
      return [];
    }

    const startMinutes = toMinutes(day.startTime);
    const endMinutes = toMinutes(day.endTime);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
      return [];
    }

    const nowInfo = getNowInTimezone();
    const filterPast = nowInfo.date === date;

    const slots: string[] = [];
    for (let minutes = startMinutes; minutes + slotMinutes <= endMinutes; minutes += slotMinutes) {
      if (isInBreakRange(minutes, minutes + slotMinutes, day.breaks)) {
        continue;
      }
      if (filterPast && minutes <= nowInfo.minutes) {
        continue;
      }
      slots.push(toTimeString(minutes));
    }

    return slots;
  }

  private getSlotDuration(value?: number): number {
    if (!value || !Number.isFinite(value) || value <= 0) {
      return DEFAULT_SLOT_MINUTES;
    }
    return Math.floor(value);
  }
}
