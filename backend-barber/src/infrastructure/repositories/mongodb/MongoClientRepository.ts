import mongoose from 'mongoose';
import { Client } from '../../../domain/entities/Client';
import { AppError } from '../../../domain/errors/AppError';
import { Client as ClientModel, RegisteredClient, UnregisteredClient } from './models/client.model';
import { escapeRegex } from '../../utils/regex';

export type UnregisteredClientData = {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

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
    noShowCount: doc.noShowCount ?? 0,
    sancionado: doc.sancionado ?? false,
    fechaSancion: doc.fechaSancion ?? null,
    motivoSancion: doc.motivoSancion ?? null,
    sancionadoPor: doc.sancionadoPor ?? null,
  });

export class MongoClientRepository {
  async findById(id: string): Promise<Client | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ClientModel.findById(id).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async findByEmail(email: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ contactEmail: normalizeEmail(email) }).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async findRegisteredByEmail(email: string): Promise<Client | null> {
    const doc = await RegisteredClient.findOne({ email: normalizeEmail(email) }).lean();
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

  async createUnregistered(
    data: UnregisteredClientData,
    options: { allowNoContact?: boolean } = {}
  ): Promise<Client> {
    if (!data.phone && !data.contactEmail && !options.allowNoContact) {
      throw new AppError('El cliente debe tener teléfono o correo de contacto.', 400);
    }

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

  async incrementarNoShow(clientId: string, session?: mongoose.ClientSession): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) return;
    await ClientModel.findByIdAndUpdate(
      clientId,
      { $inc: { noShowCount: 1 } },
      session ? { session } : {}
    );
  }

  async aplicarSancion(
    clientId: string,
    data: { motivo: string; sancionadoPor: string },
    session?: mongoose.ClientSession
  ): Promise<Client | null> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) return null;
    const doc = await ClientModel.findByIdAndUpdate(
      clientId,
      {
        $set: {
          sancionado: true,
          fechaSancion: new Date(),
          motivoSancion: data.motivo,
          sancionadoPor: data.sancionadoPor,
        },
      },
      { returnDocument: 'after', ...(session ? { session } : {}) }
    ).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }

  async levantarSancion(clientId: string, session?: mongoose.ClientSession): Promise<Client | null> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) return null;
    const doc = await ClientModel.findByIdAndUpdate(
      clientId,
      {
        $set: {
          sancionado: false,
          fechaSancion: null,
          motivoSancion: null,
          sancionadoPor: null,
          noShowCount: 0,
        },
      },
      { returnDocument: 'after', ...(session ? { session } : {}) }
    ).lean();
    if (!doc) return null;
    return toClientEntity(doc);
  }
}
