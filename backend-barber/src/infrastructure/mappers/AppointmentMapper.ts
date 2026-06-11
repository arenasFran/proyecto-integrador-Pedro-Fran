import { Appointment } from '../../domain/entities/Appointment';
import type { IAppointmentDocument } from '../repositories/mongodb/models/appointment.model';

export class AppointmentMapper {
  static fromDocument(doc: IAppointmentDocument): Appointment {
    return Appointment.create({
      id: doc._id.toString(),
      barberId: doc.barberId.toString(),
      clientId: doc.clientId?.toString(),
      clientName: doc.clientName,
      clientLastname: doc.clientLastname,
      clientPhone: doc.clientPhone,
      clientEmail: doc.clientEmail,
      serviceId: doc.serviceId,
      serviceName: doc.serviceName,
      servicePrice: doc.servicePrice,
      serviceDuration: doc.serviceDuration,
      date: doc.date,
      startTime: doc.startTime,
      endTime: doc.endTime,
      status: doc.status as Appointment['status'],
      paymentStatus: doc.paymentStatus as Appointment['paymentStatus'],
      paymentMethod: doc.paymentMethod as Appointment['paymentMethod'],
      cancelReason: doc.cancelReason,
      cancelledAt: doc.cancelledAt,
      cancelledBy: doc.cancelledBy,
      statusHistory: (doc.statusHistory || []).map((entry) => ({
        status: entry.status,
        timestamp: entry.timestamp,
        actor: entry.actor,
      })) as any,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }


}
