import { AppError } from '../errors/AppError';
import { AppointmentStatus, PaymentStatus, PaymentMethod, StatusHistoryEntry, VALID_TRANSITIONS } from '../types/appointment';

export type CreatedBy = {
  type: 'staff' | 'registered' | 'anonymous';
  userId?: string;
};

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
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy?: CreatedBy;
  statusHistory: StatusHistoryEntry[];
  version: number;
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

  get id(): string { return this.props.id; }
  get barberId(): string { return this.props.barberId; }
  get clientId(): string | undefined { return this.props.clientId; }
  get clientName(): string { return this.props.clientName; }
  get clientLastname(): string { return this.props.clientLastname; }
  get clientPhone(): string | undefined { return this.props.clientPhone; }
  get clientEmail(): string | undefined { return this.props.clientEmail; }
  get serviceId(): string { return this.props.serviceId; }
  get serviceName(): string { return this.props.serviceName; }
  get servicePrice(): number { return this.props.servicePrice; }
  get serviceDuration(): number { return this.props.serviceDuration; }
  get date(): string { return this.props.date; }
  get startTime(): string { return this.props.startTime; }
  get endTime(): string { return this.props.endTime; }
  get status(): AppointmentStatus { return this.props.status; }
  get paymentStatus(): PaymentStatus { return this.props.paymentStatus; }
  get paymentMethod(): PaymentMethod { return this.props.paymentMethod; }
  get cancelReason(): string | undefined { return this.props.cancelReason; }
  get cancelledAt(): Date | undefined { return this.props.cancelledAt ? new Date(this.props.cancelledAt.getTime()) : undefined; }
  get cancelledBy(): string | undefined { return this.props.cancelledBy; }
  get createdBy(): CreatedBy | undefined { return this.props.createdBy ? { ...this.props.createdBy } : undefined; }
  get statusHistory(): StatusHistoryEntry[] { return [...this.props.statusHistory]; }
  get version(): number { return this.props.version; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  toPrimitives(): AppointmentProps {
    return { ...this.props };
  }

  addStatusHistoryEntry(status: AppointmentStatus, actor: string): void {
    this.props.statusHistory.push({ status, timestamp: new Date(), actor });
  }

  cancel(reason?: string, cancelledBy?: string): void {
    const allowed = VALID_TRANSITIONS[this.props.status];
    if (!allowed || !allowed.includes('Cancelado')) {
      throw new AppError(`No se puede cancelar un turno en estado ${this.props.status}.`, 400);
    }
    this.props.status = 'Cancelado';
    this.props.cancelReason = reason;
    this.props.cancelledAt = new Date();
    this.props.cancelledBy = cancelledBy;
    this.addStatusHistoryEntry('Cancelado', cancelledBy || 'system');
    this.props.updatedAt = new Date();
  }

  pay(actor?: string): void {
    if (this.props.status === 'Cancelado' || this.props.status === 'NoShow') {
      throw new AppError(`No se puede pagar un turno en estado ${this.props.status}.`, 400);
    }
    this.props.paymentStatus = 'Pagado';
    this.props.updatedAt = new Date();
  }

  complete(actor?: string): void {
    const allowed = VALID_TRANSITIONS[this.props.status];
    if (!allowed || !allowed.includes('Completado')) {
      throw new AppError(`No se puede completar un turno en estado ${this.props.status}.`, 400);
    }
    this.props.status = 'Completado';
    this.addStatusHistoryEntry('Completado', actor || 'system');
    this.props.updatedAt = new Date();
  }

  markNoShow(actor?: string): void {
    const allowed = VALID_TRANSITIONS[this.props.status];
    if (!allowed || !allowed.includes('NoShow')) {
      throw new AppError(`No se puede marcar como NoShow un turno en estado ${this.props.status}.`, 400);
    }
    this.props.status = 'NoShow';
    this.addStatusHistoryEntry('NoShow', actor || 'system');
    this.props.updatedAt = new Date();
  }
}

