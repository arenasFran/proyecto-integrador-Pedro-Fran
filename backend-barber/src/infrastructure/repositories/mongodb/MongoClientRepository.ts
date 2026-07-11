import mongoose from 'mongoose';
import { Client } from '../../../domain/entities/Client';
import { Client as ClientModel, UnregisteredClient } from './models/client.model';

export type UnregisteredClientData = {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toClientEntity = (doc: Record<string, any>): Client =>
  Client.create({
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name || '',
    lastname: doc.lastname || '',
    phone: doc.phone,
    contactEmail: doc.contactEmail ?? doc.email,
    kind: doc.kind || 'NoRegistrado',
    photoUrl: doc.photoUrl ?? null,
    registeredAt: (doc._id as mongoose.Types.ObjectId).getTimestamp(),
  });

export class MongoClientRepository {
  async findByEmail(email: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ contactEmail: normalizeEmail(email) }).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async findByPhone(phone: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ phone }).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async findByBoth(email: string, phone: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ contactEmail: normalizeEmail(email), phone }).lean();
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

  async findByIds(ids: string[]): Promise<Client[]> {
    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const docs = await ClientModel.find({ _id: { $in: objectIds } }).lean();
    return docs.map(toClientEntity);
  }

  async searchRegistered(query: string, limit = 10): Promise<Client[]> {
    const regex = new RegExp('^' + escapeRegex(query.trim()), 'i');
    const docs = await ClientModel.find({
      kind: 'Registrado',
      $or: [{ name: regex }, { lastname: regex }, { email: regex }, { phone: regex }],
    })
      .limit(limit)
      .lean();
    return docs.map(toClientEntity);
  }
}