import mongoose from 'mongoose';
import { Appointment, AppointmentProps } from '../../../domain/entities/Appointment';
import { AppointmentStatus, PaymentStatus, PaymentMethod, StatusHistoryEntry } from '../../../domain/types/appointment';
import { AppError } from '../../../domain/errors/AppError';
import AppointmentModel from './models/appointment.model';

export type AppointmentFilters = {
  barberId?: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  date?: string;
  status?: AppointmentStatus;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export type CreateAppointmentData = Omit<AppointmentProps, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateStatusData = {
  status: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  statusHistoryEntry?: StatusHistoryEntry;
};

export type UpdateAppointmentData = {
  date?: string;
  startTime?: string;
  endTime?: string;
  barberId?: string;
  paymentMethod?: string;
};

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
    status: doc.status as AppointmentStatus,
    paymentStatus: doc.paymentStatus as PaymentStatus,
    paymentMethod: doc.paymentMethod as PaymentMethod,
    cancelReason: doc.cancelReason,
    cancelledAt: doc.cancelledAt,
    cancelledBy: doc.cancelledBy,
    createdBy: doc.createdBy,
    statusHistory: (doc.statusHistory || []),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

export class MongoAppointmentRepository {
  async findById(id: string): Promise<Appointment | null> {
    const doc = await AppointmentModel.findById(id).lean();
    if (!doc) return null;
    return toAppointmentEntity(doc);
  }

  async findMany(filters: AppointmentFilters): Promise<PaginatedResult<Appointment>> {
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
    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
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
    if (filters.searchTerm) {
      const tokens = filters.searchTerm.trim().split(/\s+/);
      const tokenOrs: Record<string, unknown>[] = [];
      for (const token of tokens) {
        if (!token) continue;
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const suffix = /\d$/.test(token) ? '(?!\\d)' : '';
        const pattern = `\\b${escaped}${suffix}`;
        const regex = { $regex: pattern, $options: 'i' };
        tokenOrs.push({
          $or: [
            { clientName: regex },
            { clientLastname: regex },
            { clientEmail: regex },
            { serviceName: regex },
          ],
        });
      }
      if (tokenOrs.length > 0) {
        const andConds: Record<string, unknown>[] = [];
        if (query.$or) {
          andConds.push({ $or: query.$or as Record<string, unknown>[] });
          delete query.$or;
        }
        query.$and = [...andConds, ...tokenOrs];
      }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      AppointmentModel.find(query)
        .sort({ date: -1, startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AppointmentModel.countDocuments(query),
    ]);

    return {
      data: docs.map((doc) => toAppointmentEntity(doc)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
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
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return null;
    return toAppointmentEntity(doc);
  }

  async updateClientId(id: string, clientId: string): Promise<Appointment | null> {
    const doc = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: { clientId: new mongoose.Types.ObjectId(clientId) }, $currentDate: { updatedAt: true } },
      { returnDocument: 'after' }
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
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return null;
    return toAppointmentEntity(doc);
  }
}


