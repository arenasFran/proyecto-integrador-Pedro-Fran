import mongoose from 'mongoose';
import { Client } from '../../../domain/entities/Client';
import {
  IClientRepository,
  UnregisteredClientData,
} from '../../../domain/repositories/IClientRepository';
import { UnregisteredClient } from './models/client.model';

const toClientEntity = (doc: Record<string, any>): Client =>
  Client.create({
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name || '',
    lastname: doc.lastname || '',
    phone: doc.phone,
    contactEmail: doc.contactEmail,
    kind: doc.kind || 'NoRegistrado',
  });

export class MongoClientRepository implements IClientRepository {
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

  async createUnregistered(data: UnregisteredClientData): Promise<Client> {
    const doc = await UnregisteredClient.create({
      name: data.name,
      lastname: data.lastname,
      phone: data.phone,
      contactEmail: data.contactEmail,
    });
    return toClientEntity(doc);
  }
}