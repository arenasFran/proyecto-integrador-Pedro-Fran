import mongoose from 'mongoose';
import { Client } from '../../../domain/entities/Client';
import { AppError } from '../../../domain/errors/AppError';
import { UnregisteredClient } from './models/client.model';

export type UnregisteredClientData = {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
};

const toClientEntity = (doc: Record<string, any>): Client =>
  Client.create({
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name || '',
    lastname: doc.lastname || '',
    phone: doc.phone,
    contactEmail: doc.contactEmail,
    kind: doc.kind || 'NoRegistrado',
  });

export class MongoClientRepository {
  async findByEmail(email: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ contactEmail: email }).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async findByPhone(phone: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ phone }).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async findByBoth(email: string, phone: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ contactEmail: email, phone }).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async createUnregistered(data: UnregisteredClientData): Promise<Client> {
    try {
      const doc = await UnregisteredClient.create({
        name: data.name,
        lastname: data.lastname,
        phone: data.phone,
        contactEmail: data.contactEmail,
      });
      return toClientEntity(doc);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('El número de teléfono ya está registrado. Probá con otro o iniciá sesión.', 409);
      }
      throw error;
    }
  }
}