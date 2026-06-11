import type { BarberSchedule, DayKey } from '../../../../types/professional';

export type ScheduleDayForm = {
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

export const days: Array<{ key: DayKey; label: string }> = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export const createEmptyDay = (): ScheduleDayForm => ({
  startTime: '',
  endTime: '',
  breakStart: '',
  breakEnd: '',
});

export const createEmptySchedule = (): Record<DayKey, ScheduleDayForm> => ({
  monday: createEmptyDay(),
  tuesday: createEmptyDay(),
  wednesday: createEmptyDay(),
  thursday: createEmptyDay(),
  friday: createEmptyDay(),
  saturday: createEmptyDay(),
  sunday: createEmptyDay(),
});

export const mapScheduleToForm = (
  schedule: BarberSchedule
): Record<DayKey, ScheduleDayForm> => {
  return days.reduce((acc, day) => {
    const current = schedule[day.key];
    const firstBreak = current.breaks[0];
    acc[day.key] = {
      startTime: current.startTime ?? '',
      endTime: current.endTime ?? '',
      breakStart: firstBreak?.startTime ?? '',
      breakEnd: firstBreak?.endTime ?? '',
    };
    return acc;
  }, createEmptySchedule());
};

export const isTimeRangeValid = (startTime: string, endTime: string) => {
  return startTime.length === 5 && endTime.length === 5 && startTime < endTime;
};

export const validateSchedule = (schedule: Record<DayKey, ScheduleDayForm>) => {
  for (const day of days) {
    const current = schedule[day.key];
    const hasStart = Boolean(current.startTime.trim());
    const hasEnd = Boolean(current.endTime.trim());

    if (hasStart !== hasEnd) {
      return `En ${day.label} completá inicio y fin del horario o dejalos vacíos.`;
    }

    if (hasStart && !isTimeRangeValid(current.startTime, current.endTime)) {
      return `En ${day.label} el horario debe ser válido y el inicio menor al fin.`;
    }

    const hasBreakStart = Boolean(current.breakStart.trim());
    const hasBreakEnd = Boolean(current.breakEnd.trim());

    if (hasBreakStart !== hasBreakEnd) {
      return `En ${day.label} completá inicio y fin del break o dejalo vacío.`;
    }

    if (hasBreakStart && !isTimeRangeValid(current.breakStart, current.breakEnd)) {
      return `En ${day.label} el break debe ser válido y el inicio menor al fin.`;
    }
  }

  return null;
};

export const normalizeServices = (value: string) => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const scheduleFromForm = (
  schedule: Record<DayKey, ScheduleDayForm>
): BarberSchedule => {
  return days.reduce((acc, day) => {
    const current = schedule[day.key];
    const breakStart = current.breakStart.trim();
    const breakEnd = current.breakEnd.trim();
    acc[day.key] = {
      startTime: current.startTime.trim() ? current.startTime.trim() : null,
      endTime: current.endTime.trim() ? current.endTime.trim() : null,
      breaks: breakStart && breakEnd ? [{ startTime: breakStart, endTime: breakEnd }] : [],
    };
    return acc;
  }, {} as BarberSchedule);
};
