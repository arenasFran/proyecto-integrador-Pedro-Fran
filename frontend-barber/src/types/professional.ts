export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ScheduleBreak = {
  startTime: string;
  endTime: string;
};

export type ScheduleDay = {
  startTime: string | null;
  endTime: string | null;
  breaks: ScheduleBreak[];
};

export type BarberSchedule = Record<DayKey, ScheduleDay>;

export type Professional = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: 'Admin' | 'Empleado';
  services: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  maxAdvanceDays: number;
  schedule: BarberSchedule;
};

export type ProfessionalPayload = {
  email: string;
  password?: string;
  name: string;
  lastname: string;
  phone: string;
  services: string[];
  age?: number;
  photoUrl?: string | null;
  slotDuration?: number;
  maxAdvanceDays?: number;
  schedule: BarberSchedule;
};

export type ProfessionalUpdatePayload = {
  email?: string;
  password?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  services?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
};

export type SlotsReason = 'day-off' | 'already-past' | 'fully-booked';

export type SlotsResponse = {
  date: string;
  slots: string[];
  reason?: SlotsReason;
};

export type OccupancyResponse = {
  barberId: string;
  date: string;
  totalSlots: number;
  blockedSlots: number;
  availableSlots: number;
  appointmentsCount: number;
  ocupacion: number;
};
