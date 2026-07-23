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

export type SlotsReason = 'day-off' | 'already-past' | 'fully-booked';

export type SlotsResult = {
  date: string;
  slots: string[];
  reason?: SlotsReason;
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

    const scheduledSlots = this.buildSlotsForDay(daySchedule, slotMinutes);
    if (scheduledSlots.length === 0) {
      return { date, slots: [], reason: 'day-off' };
    }

    const upcomingSlots = this.filterPastSlots(scheduledSlots, date);
    if (upcomingSlots.length === 0) {
      return { date, slots: [], reason: 'already-past' };
    }

    const filtered = this.filterOccupiedSlots(upcomingSlots, slotMinutes, occupiedSlots);
    if (filtered.length === 0) {
      return { date, slots: [], reason: 'fully-booked' };
    }

    return { date, slots: filtered };
  }

  private filterPastSlots(slots: string[], date: string): string[] {
    const nowInfo = getNowInTimezone();
    if (nowInfo.date !== date) return slots;
    return slots.filter((slot) => {
      const minutes = toMinutes(slot);
      return minutes !== null && minutes > nowInfo.minutes;
    });
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

    const slots: string[] = [];
    for (let minutes = startMinutes; minutes + slotMinutes <= endMinutes; minutes += slotMinutes) {
      if (isInBreakRange(minutes, minutes + slotMinutes, day.breaks)) {
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
