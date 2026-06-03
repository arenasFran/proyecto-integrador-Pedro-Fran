import { AppointmentStatus } from '../types/appointment';

export type AppointmentProps = {
  id: string;
  barberId: string;
  clientId?: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class Appointment {
  private props: AppointmentProps;

  private constructor(props: AppointmentProps) {
    this.props = { ...props };
  }

  static create(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get barberId(): string {
    return this.props.barberId;
  }

  get clientId(): string | undefined {
    return this.props.clientId;
  }

  get clientName(): string {
    return this.props.clientName;
  }

  get clientLastname(): string {
    return this.props.clientLastname;
  }

  get clientPhone(): string | undefined {
    return this.props.clientPhone;
  }

  get clientEmail(): string | undefined {
    return this.props.clientEmail;
  }

  get serviceId(): string {
    return this.props.serviceId;
  }

  get serviceName(): string {
    return this.props.serviceName;
  }

  get servicePrice(): number {
    return this.props.servicePrice;
  }

  get serviceDuration(): number {
    return this.props.serviceDuration;
  }

  get date(): string {
    return this.props.date;
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get endTime(): string {
    return this.props.endTime;
  }

  get status(): AppointmentStatus {
    return this.props.status;
  }

  get cancelReason(): string | undefined {
    return this.props.cancelReason;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  cancel(reason?: string): void {
    this.props.status = 'Cancelado';
    this.props.cancelReason = reason;
    this.props.cancelledAt = new Date();
    this.props.updatedAt = new Date();
  }

  confirm(): void {
    this.props.status = 'Confirmado';
    this.props.updatedAt = new Date();
  }

  complete(): void {
    this.props.status = 'Completado';
    this.props.updatedAt = new Date();
  }

  toPrimitives(): AppointmentProps {
    return { ...this.props };
  }
}
