import { AppError } from '../../application/errors/AppError';
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
  createdAt: Date;
  updatedAt: Date;
};

export class Appointment {
  constructor(public readonly props: AppointmentProps) {}

  static create(props: AppointmentProps): Appointment {
    return new Appointment(props);
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
