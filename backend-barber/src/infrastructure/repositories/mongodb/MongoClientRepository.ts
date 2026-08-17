import mongoose from 'mongoose';
import { Client } from '../../../domain/entities/Client';
import { AppError } from '../../../domain/errors/AppError';
import { Client as ClientModel, RegisteredClient, UnregisteredClient } from './models/client.model';
import { CUPO_DIAS_ANALISIS_CORTE } from '../../../application/use-cases/analisis-corte/calcularCupoAnalisisCorte';
import { escapeRegex } from '../../utils/regex';

export type UnregisteredClientData = {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
};

// Si un proceso muere entre reservar y liberar el lock, se considera abandonado
// pasado este tiempo (más que suficiente para Rekognition + Gemini).
const ANALISIS_LOCK_STALE_MS = 2 * 60 * 1000;

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
    consentimientoAnalisisIA: doc.consentimientoAnalisisIA ?? false,
    consentimientoAnalisisIAFecha: doc.consentimientoAnalisisIAFecha ?? null,
    ultimoAnalisisFecha: doc.ultimoAnalisisFecha ?? null,
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

  async updateAnalisisIA(
    id: string,
    data: {
      consentimientoAnalisisIA?: boolean;
      consentimientoAnalisisIAFecha?: Date;
      ultimoAnalisisFecha?: Date;
      analisisLockedAt?: Date | null;
    },
    session?: mongoose.ClientSession
  ): Promise<void> {
    await RegisteredClient.findByIdAndUpdate(id, { $set: data }, session ? { session } : {});
  }

  /**
   * Reserva atómicamente el cupo mensual de análisis de corte con IA.
   * Un solo findOneAndUpdate sobre un solo documento: Mongo lo serializa,
   * así que ante dos requests concurrentes solo una puede matchear el filtro.
   * Devuelve false si no hay cupo (mes en curso) o si ya hay un análisis en
   * curso (lock activo y no vencido) para este cliente.
   */
  async reservarAnalisisIA(id: string): Promise<boolean> {
    const cupoDisponibleDesde = new Date();
    cupoDisponibleDesde.setDate(cupoDisponibleDesde.getDate() - CUPO_DIAS_ANALISIS_CORTE);
    const lockStaleDesde = new Date(Date.now() - ANALISIS_LOCK_STALE_MS);

    const doc = await RegisteredClient.findOneAndUpdate(
      {
        _id: id,
        $and: [
          { $or: [{ ultimoAnalisisFecha: null }, { ultimoAnalisisFecha: { $lte: cupoDisponibleDesde } }] },
          { $or: [{ analisisLockedAt: null }, { analisisLockedAt: { $lte: lockStaleDesde } }] },
        ],
      },
      { $set: { analisisLockedAt: new Date() } }
    );

    return !!doc;
  }

  /** Libera el lock sin tocar ultimoAnalisisFecha (no se descuenta cupo). */
  async liberarLockAnalisisIA(id: string): Promise<void> {
    await RegisteredClient.findByIdAndUpdate(id, { $set: { analisisLockedAt: null } });
  }

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