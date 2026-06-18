import mongoose from 'mongoose';
import { Appointment } from '../../../domain/entities/Appointment';
import {
  AppointmentFilters,
  CreateAppointmentData,
  IAppointmentRepository,
  UpdateStatusData,
  UpdateAppointmentData,
} from '../../../domain/repositories/IAppointmentRepository';
import { AppError } from '../../../application/errors/AppError';
import AppointmentModel from './models/appointment.model';

const toAppointmentEntity = (doc: Record<string, any>): Appointment =>
  Appointment.create({
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
    createdBy: doc.createdBy,
    statusHistory: (doc.statusHistory || []),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

export class MongoAppointmentRepository implements IAppointmentRepository {
  async findById(id: string): Promise<Appointment | null> {
    const doc = await AppointmentModel.findById(id).lean();
    if (!doc) return null;
    return toAppointmentEntity(doc);
  }

  async findMany(filters: AppointmentFilters): Promise<Appointment[]> {
    const query: Record<string, unknown> = {};

    if (filters.barberId) {
      query.barberId = new mongoose.Types.ObjectId(filters.barberId);
    }
    if (filters.clientId) {
      query.clientId = new mongoose.Types.ObjectId(filters.clientId);
    }
    if (filters.date) {
      query.date = filters.date;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.clientEmail || filters.clientPhone) {
      const orConditions: Record<string, unknown>[] = [];
      if (filters.clientEmail) orConditions.push({ clientEmail: filters.clientEmail });
      if (filters.clientPhone) orConditions.push({ clientPhone: filters.clientPhone });
      query.$or = orConditions;
    }
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) (query.date as Record<string, unknown>).$gte = filters.dateFrom;
      if (filters.dateTo) (query.date as Record<string, unknown>).$lte = filters.dateTo;
    }

    const docs = await AppointmentModel.find(query)
      .sort({ date: -1, startTime: -1 })
      .lean();

    return docs.map((doc) => toAppointmentEntity(doc));
  }

  async findByBarberAndDate(barberId: string, date: string, session?: mongoose.ClientSession): Promise<Appointment[]> {
    const query = AppointmentModel.find({
      barberId: new mongoose.Types.ObjectId(barberId),
      date,
    });
    if (session) query.session(session);
    const docs = await query.lean();

    return docs.map((doc) => toAppointmentEntity(doc));
  }

  async findByClientAndDate(clientId: string, date: string): Promise<Appointment[]> {
    const docs = await AppointmentModel.find({
      clientId: new mongoose.Types.ObjectId(clientId),
      date,
    }).lean();

    return docs.map((doc) => toAppointmentEntity(doc));
  }

  async findByContactAndDate(
    date: string,
    clientEmail?: string,
    clientPhone?: string
  ): Promise<Appointment[]> {
    const orConditions: Record<string, unknown>[] = [];
    if (clientEmail) orConditions.push({ clientEmail });
    if (clientPhone) orConditions.push({ clientPhone });

    if (orConditions.length === 0) return [];

    const docs = await AppointmentModel.find({
      date,
      $or: orConditions,
    }).lean();

    return docs.map((doc) => toAppointmentEntity(doc));
  }

  async findByClientId(clientId: string): Promise<Appointment[]> {
    const docs = await AppointmentModel.find({
      clientId: new mongoose.Types.ObjectId(clientId),
    }).lean();
    return docs.map((doc) => toAppointmentEntity(doc));
  }

  async findByContact(clientEmail: string, clientPhone: string): Promise<Appointment[]> {
    const docs = await AppointmentModel.find({
      clientEmail,
      clientPhone,
    }).lean();
    return docs.map((doc) => toAppointmentEntity(doc));
  }

  async create(data: CreateAppointmentData, session?: mongoose.ClientSession): Promise<Appointment> {
    try {
      const [doc] = await AppointmentModel.create([{
        ...data,
        barberId: new mongoose.Types.ObjectId(data.barberId),
        clientId: data.clientId ? new mongoose.Types.ObjectId(data.clientId) : undefined,
      }], session ? { session } : {});

      const created = await AppointmentModel.findById(doc._id).session(session ?? null).lean();
      if (!created) throw new Error('Error al crear el turno');

      return toAppointmentEntity(created);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('El horario ya está ocupado.', 409);
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateAppointmentData): Promise<Appointment | null> {
    const updateData: Record<string, unknown> = {};

    if (data.date !== undefined) updateData.date = data.date;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.barberId !== undefined) {
      updateData.barberId = new mongoose.Types.ObjectId(data.barberId);
    }
    if (data.paymentMethod !== undefined) {
      updateData.paymentMethod = data.paymentMethod;
    }

    const doc = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: updateData, $currentDate: { updatedAt: true } },
      { returnDocument: 'after', new: true }
    ).lean();

    if (!doc) return null;
    return toAppointmentEntity(doc);
  }

  async updateClientId(id: string, clientId: string): Promise<Appointment | null> {
    const doc = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: { clientId: new mongoose.Types.ObjectId(clientId) }, $currentDate: { updatedAt: true } },
      { returnDocument: 'after', new: true }
    ).lean();
    if (!doc) return null;
    return toAppointmentEntity(doc);
  }

  async updateStatus(id: string, data: UpdateStatusData): Promise<Appointment | null> {
    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.paymentStatus !== undefined) {
      updateData.paymentStatus = data.paymentStatus;
    }
    if (data.cancelReason !== undefined) {
      updateData.cancelReason = data.cancelReason;
    }
    if (data.cancelledAt !== undefined) {
      updateData.cancelledAt = data.cancelledAt;
    }
    if (data.cancelledBy !== undefined) {
      updateData.cancelledBy = data.cancelledBy;
    }

    const update: Record<string, unknown> = { $set: updateData };
    if (data.statusHistoryEntry) {
      update.$push = { statusHistory: data.statusHistoryEntry };
    }

    const doc = await AppointmentModel.findByIdAndUpdate(
      id,
      update,
      { returnDocument: 'after', new: true }
    ).lean();

    if (!doc) return null;
    return toAppointmentEntity(doc);
  }
}
