import { BarberKind } from '../types/auth';
import { Email } from '../value-objects/Email';
import { Phone } from '../value-objects/Phone';

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
  services: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  schedule: BarberSchedule;
  maxAdvanceDays: number;
  passwordHash?: string;
};

type BarberInternalProps = {
  id: string;
  email: Email;
  name: string;
  lastname: string;
  phone: Phone;
  kind: BarberKind;
  services: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  schedule: BarberSchedule;
  maxAdvanceDays: number;
  passwordHash?: string;
};

export class Barber {
  private props: BarberInternalProps;

  private constructor(props: BarberInternalProps) {
    this.props = { ...props };
  }

  static create(props: BarberProps): Barber {
    return new Barber({
      ...props,
      email: Email.create(props.email),
      phone: Phone.create(props.phone),
      maxAdvanceDays: props.maxAdvanceDays ?? 30,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email.getValue();
  }

  get name(): string {
    return this.props.name;
  }

  get lastname(): string {
    return this.props.lastname;
  }

  get phone(): string {
    return this.props.phone.getValue();
  }

  get kind(): BarberKind {
    return this.props.kind;
  }

  get services(): string[] {
    return [...this.props.services];
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
    const cloneDay = (d: BarberScheduleDay): BarberScheduleDay => ({
      startTime: d.startTime,
      endTime: d.endTime,
      breaks: d.breaks.map(b => ({ ...b })),
    });
    return {
      monday: cloneDay(this.props.schedule.monday),
      tuesday: cloneDay(this.props.schedule.tuesday),
      wednesday: cloneDay(this.props.schedule.wednesday),
      thursday: cloneDay(this.props.schedule.thursday),
      friday: cloneDay(this.props.schedule.friday),
      saturday: cloneDay(this.props.schedule.saturday),
      sunday: cloneDay(this.props.schedule.sunday),
    };
  }

  get maxAdvanceDays(): number {
    return this.props.maxAdvanceDays;
  }

  get passwordHash(): string | undefined {
    return this.props.passwordHash;
  }

  toPrimitives(): BarberProps {
    return {
      id: this.props.id,
      email: this.props.email.getValue(),
      name: this.props.name,
      lastname: this.props.lastname,
      phone: this.props.phone.getValue(),
      kind: this.props.kind,
      services: [...this.props.services],
      age: this.props.age,
      photoUrl: this.props.photoUrl ?? null,
      isActive: this.props.isActive,
      slotDuration: this.props.slotDuration,
      schedule: { ...this.props.schedule },
      maxAdvanceDays: this.props.maxAdvanceDays,
      passwordHash: this.props.passwordHash,
    };
  }
}
