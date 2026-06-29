import mongoose from 'mongoose';
import { Service } from '../../../domain/entities/Service';
import { AppError } from '../../../application/errors/AppError';
import ServiceModel from './models/service.model';

const toServiceEntity = (doc: Record<string, any>): Service =>
  Service.create({
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    price: doc.price,
    imageUrl: doc.imageUrl ?? '',
    isActive: doc.isActive ?? true,
    isDeleted: doc.isDeleted ?? false,
  });

export class MongoServiceRepository {
  async findAll(): Promise<Service[]> {
    const docs = await ServiceModel.find({ isActive: true, isDeleted: false }).lean();
    return docs.map((doc) => toServiceEntity(doc));
  }

  async findAllAdmin(): Promise<Service[]> {
    const docs = await ServiceModel.find({ isDeleted: false }).lean();
    return docs.map((doc) => toServiceEntity(doc));
  }

  async findById(id: string): Promise<Service | null> {
    const doc = await ServiceModel.findOne({ _id: id, isActive: true, isDeleted: false }).lean();
    if (!doc) return null;
    return toServiceEntity(doc);
  }

  async findByIdIncludingInactive(id: string): Promise<Service | null> {
    const doc = await ServiceModel.findById(id).lean();
    if (!doc) return null;
    return toServiceEntity(doc);
  }

  async create(data: { name: string; description: string; price: number; imageUrl?: string; isActive?: boolean }): Promise<Service> {
    try {
      const doc = await ServiceModel.create({
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: data.imageUrl ?? '',
        isActive: data.isActive ?? true,
      });
      return toServiceEntity(doc);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('Ya existe un servicio con ese nombre.', 409);
      }
      throw error;
    }
  }

  async update(id: string, data: { name?: string; description?: string; price?: number; imageUrl?: string; isActive?: boolean; isDeleted?: boolean }): Promise<Service | null> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isDeleted !== undefined) updateData.isDeleted = data.isDeleted;

      const doc = await ServiceModel.findByIdAndUpdate(
        id,
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

  async softDelete(id: string): Promise<Service | null> {
    const doc = await ServiceModel.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true }, $currentDate: { updatedAt: true } },
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return null;
    return toServiceEntity(doc);
  }
}
