import { BarberKind } from '../types/auth';

export type BarberScheduleBreak = {
  startTime: string;
  endTime: string;
};

export type BarberScheduleDay = {
  startTime: string | null;
  endTime: string | null;
  breaks: BarberScheduleBreak[];
};

export type BarberSchedule = {
  monday: BarberScheduleDay;
  tuesday: BarberScheduleDay;
  wednesday: BarberScheduleDay;
  thursday: BarberScheduleDay;
  friday: BarberScheduleDay;
  saturday: BarberScheduleDay;
  sunday: BarberScheduleDay;
};

export type BarberProps = {
  id: string;
  email: string;
  name: string;
  lastname: string;
  phone: string;
  kind: BarberKind;
  specialties: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  schedule: BarberSchedule;
  passwordHash?: string;
};

export class Barber {
  private props: BarberProps;

  private constructor(props: BarberProps) {
    this.props = { ...props };
  }

  static create(props: BarberProps): Barber {
    return new Barber(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get lastname(): string {
    return this.props.lastname;
  }

  get phone(): string {
    return this.props.phone;
  }

  get kind(): BarberKind {
    return this.props.kind;
  }

  get specialties(): string[] {
    return this.props.specialties;
  }

  get age(): number | undefined {
    return this.props.age;
  }

  get photoUrl(): string | null | undefined {
    return this.props.photoUrl;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get slotDuration(): number {
    return this.props.slotDuration;
  }

  get schedule(): BarberSchedule {
    return this.props.schedule;
  }

  get passwordHash(): string | undefined {
    return this.props.passwordHash;
  }

  toPrimitives(): BarberProps {
    return { ...this.props };
  }
}
