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
      cancelReason: doc.cancelReason,
      cancelledAt: doc.cancelledAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

}
