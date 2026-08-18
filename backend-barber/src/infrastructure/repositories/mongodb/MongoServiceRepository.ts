import mongoose from 'mongoose';
import { Service, type ServiceStatus } from '../../../domain/entities/Service';
import { AppError } from '../../../domain/errors/AppError';
import ServiceModel from './models/service.model';

const toServiceEntity = (doc: Record<string, any>): Service =>
  Service.create({
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    price: doc.price,
    imageUrl: doc.imageUrl ?? '',
    status: doc.status ?? 'active',
  });

export class MongoServiceRepository {
  async findAll(): Promise<Service[]> {
    // TODO: deuda técnica — falta paginación si el sistema escala
    const docs = await ServiceModel.find({ status: 'active' }).lean();
    return docs.map((doc) => toServiceEntity(doc));
  }

  async findAllAdmin(): Promise<Service[]> {
    // TODO: deuda técnica — falta paginación si el sistema escala
    const docs = await ServiceModel.find({}).lean();
    return docs.map((doc) => toServiceEntity(doc));
  }

  async findById(id: string): Promise<Service | null> {
    const doc = await ServiceModel.findOne({ _id: id, status: 'active' }).lean();
    if (!doc) return null;
    return toServiceEntity(doc);
  }

  async findByIdIncludingInactive(id: string): Promise<Service | null> {
    const doc = await ServiceModel.findById(id).lean();
    if (!doc) return null;
    return toServiceEntity(doc);
  }

  async create(data: { name: string; description: string; price: number; imageUrl?: string; status?: ServiceStatus }): Promise<Service> {
    try {
      const doc = await ServiceModel.create({
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: data.imageUrl ?? '',
        status: data.status ?? 'active',
      });
      return toServiceEntity(doc);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('Ya existe un servicio con ese nombre.', 409);
      }
      throw error;
    }
  }

  async update(id: string, data: { name?: string; description?: string; price?: number; imageUrl?: string; status?: ServiceStatus }): Promise<Service | null> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.status !== undefined) updateData.status = data.status;

      const doc = await ServiceModel.findOneAndUpdate(
        { _id: id },
        { $set: updateData, $currentDate: { updatedAt: true } },
        { returnDocument: 'after' }
      ).lean();

      if (!doc) return null;
      return toServiceEntity(doc);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('Ya existe un servicio con ese nombre.', 409);
      }
      throw error;
    }
  }
}
