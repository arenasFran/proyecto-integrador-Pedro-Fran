import { AppointmentStatus, PaymentStatus, PaymentMethod, StatusHistoryEntry } from '../types/appointment';
import { Email } from '../value-objects/Email';
import { Phone } from '../value-objects/Phone';
import { Price } from '../value-objects/Price';
import { DurationMinutes } from '../value-objects/DurationMinutes';

export type AppointmentCreateProps = {
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
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentPrimitives = {
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
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

type AppointmentData = {
  id: string;
  barberId: string;
  clientId?: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: Phone;
  clientEmail?: Email;
  serviceId: string;
  serviceName: string;
  servicePrice: Price;
  serviceDuration: DurationMinutes;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

export class Appointment {
  private props: AppointmentData;

  private constructor(props: AppointmentData) {
    this.props = { ...props };
  }

  static create(props: AppointmentCreateProps): Appointment {
    return new Appointment({
      id: props.id,
      barberId: props.barberId,
      clientId: props.clientId,
      clientName: props.clientName,
      clientLastname: props.clientLastname,
      clientPhone: props.clientPhone ? Phone.create(props.clientPhone) : undefined,
      clientEmail: props.clientEmail ? Email.create(props.clientEmail) : undefined,
      serviceId: props.serviceId,
      serviceName: props.serviceName,
      servicePrice: Price.create(props.servicePrice),
      serviceDuration: DurationMinutes.create(props.serviceDuration),
      date: props.date,
      startTime: props.startTime,
      endTime: props.endTime,
      status: props.status,
      paymentStatus: props.paymentStatus,
      paymentMethod: props.paymentMethod,
      cancelReason: props.cancelReason,
      cancelledAt: props.cancelledAt,
      cancelledBy: props.cancelledBy,
      statusHistory: props.statusHistory,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
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
    return this.props.clientPhone?.getValue();
  }

  get clientEmail(): string | undefined {
    return this.props.clientEmail?.getValue();
  }

  get serviceId(): string {
    return this.props.serviceId;
  }

  get serviceName(): string {
    return this.props.serviceName;
  }

  get servicePrice(): number {
    return this.props.servicePrice.getValue();
  }

  get serviceDuration(): number {
    return this.props.serviceDuration.getValue();
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

  get paymentStatus(): PaymentStatus {
    return this.props.paymentStatus;
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod;
  }

  get cancelReason(): string | undefined {
    return this.props.cancelReason;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get cancelledBy(): string | undefined {
    return this.props.cancelledBy;
  }

  get statusHistory(): StatusHistoryEntry[] {
    return this.props.statusHistory;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  addStatusHistoryEntry(status: AppointmentStatus, actor: string): void {
    this.props.statusHistory.push({ status, timestamp: new Date(), actor });
  }

  cancel(reason?: string, cancelledBy?: string): void {
    this.props.status = 'Cancelado';
    this.props.cancelReason = reason;
    this.props.cancelledAt = new Date();
    this.props.cancelledBy = cancelledBy;
    this.addStatusHistoryEntry('Cancelado', cancelledBy || 'system');
    this.props.updatedAt = new Date();
  }

  pay(actor?: string): void {
    this.props.paymentStatus = 'Pagado';
    this.props.updatedAt = new Date();
  }

  complete(actor?: string): void {
    this.props.status = 'Completado';
    this.addStatusHistoryEntry('Completado', actor || 'system');
    this.props.updatedAt = new Date();
  }

  markNoShow(actor?: string): void {
    this.props.status = 'NoShow';
    this.addStatusHistoryEntry('NoShow', actor || 'system');
    this.props.updatedAt = new Date();
  }

  toPrimitives(): AppointmentPrimitives {
    return {
      id: this.props.id,
      barberId: this.props.barberId,
      clientId: this.props.clientId,
      clientName: this.props.clientName,
      clientLastname: this.props.clientLastname,
      clientPhone: this.props.clientPhone?.getValue(),
      clientEmail: this.props.clientEmail?.getValue(),
      serviceId: this.props.serviceId,
      serviceName: this.props.serviceName,
      servicePrice: this.props.servicePrice.getValue(),
      serviceDuration: this.props.serviceDuration.getValue(),
      date: this.props.date,
      startTime: this.props.startTime,
      endTime: this.props.endTime,
      status: this.props.status,
      paymentStatus: this.props.paymentStatus,
      paymentMethod: this.props.paymentMethod,
      cancelReason: this.props.cancelReason,
      cancelledAt: this.props.cancelledAt,
      cancelledBy: this.props.cancelledBy,
      statusHistory: this.props.statusHistory,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
