import mongoose from 'mongoose';
import { Appointment } from '../../../domain/entities/Appointment';
import {
  AppointmentFilters,
  CreateAppointmentData,
  IAppointmentRepository,
  UpdateStatusData,
} from '../../../domain/repositories/IAppointmentRepository';
import { AppointmentMapper } from '../../mappers/AppointmentMapper';
import AppointmentModel from './models/appointment.model';

export class MongoAppointmentRepository implements IAppointmentRepository {
  async findById(id: string): Promise<Appointment | null> {
    const doc = await AppointmentModel.findById(id).lean();
    if (!doc) return null;
    return AppointmentMapper.fromDocument(doc as any);
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
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) (query.date as Record<string, unknown>).$gte = filters.dateFrom;
      if (filters.dateTo) (query.date as Record<string, unknown>).$lte = filters.dateTo;
    }

    const docs = await AppointmentModel.find(query)
      .sort({ date: -1, startTime: -1 })
      .lean();

    return docs.map((doc) => AppointmentMapper.fromDocument(doc as any));
  }

  async findByBarberAndDate(barberId: string, date: string): Promise<Appointment[]> {
    const docs = await AppointmentModel.find({
      barberId: new mongoose.Types.ObjectId(barberId),
      date,
    }).lean();

    return docs.map((doc) => AppointmentMapper.fromDocument(doc as any));
  }

  async create(data: CreateAppointmentData): Promise<Appointment> {
    const doc = await AppointmentModel.create({
      ...data,
      barberId: new mongoose.Types.ObjectId(data.barberId),
      clientId: data.clientId ? new mongoose.Types.ObjectId(data.clientId) : undefined,
    });

    const created = await AppointmentModel.findById(doc._id).lean();
    if (!created) throw new Error('Error al crear el turno');

    return AppointmentMapper.fromDocument(created as any);
  }

  async updateStatus(id: string, data: UpdateStatusData): Promise<Appointment | null> {
    const updateData: Record<string, unknown> = {
      status: data.status,
    };

    if (data.cancelReason !== undefined) {
      updateData.cancelReason = data.cancelReason;
    }
    if (data.cancelledAt !== undefined) {
      updateData.cancelledAt = data.cancelledAt;
    }

    const doc = await AppointmentModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', new: true }
    ).lean();

    if (!doc) return null;
    return AppointmentMapper.fromDocument(doc as any);
  }
}
