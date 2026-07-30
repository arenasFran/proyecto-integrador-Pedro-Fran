import mongoose from 'mongoose';
import { AnalisisCorteModel, ICorteRecomendado } from './models/analisis-corte.model';
import { ResultadoRecomendacion } from '../../../application/ports/IRecommendationService';

export type AnalisisCorteRecord = {
  id: string;
  clienteId: string;
  resultado: {
    formaCara: string;
    cortesRecomendados: ICorteRecomendado[];
    explicacionGeneral: string;
  };
  createdAt: Date;
};

export type FindByClienteIdParams = {
  page?: number;
  limit?: number;
};

export type AnalisisCortePaginado = {
  data: AnalisisCorteRecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export class MongoAnalisisCorteRepository {
  async create(
    clienteId: string,
    resultado: ResultadoRecomendacion,
    session?: mongoose.ClientSession
  ): Promise<AnalisisCorteRecord> {
    const docs = await AnalisisCorteModel.create(
      [
        {
          clienteId: new mongoose.Types.ObjectId(clienteId),
          resultado,
        },
      ],
      session ? { session } : {}
    );
    const doc = docs[0];
    return {
      id: doc._id.toString(),
      clienteId: doc.clienteId.toString(),
      resultado: doc.resultado,
      createdAt: doc.createdAt,
    };
  }

  async findByClienteId(
    clienteId: string,
    params: FindByClienteIdParams = {}
  ): Promise<AnalisisCortePaginado> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;
    const filter = { clienteId: new mongoose.Types.ObjectId(clienteId) };

    const [docs, total] = await Promise.all([
      AnalisisCorteModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AnalisisCorteModel.countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => ({
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        clienteId: doc.clienteId.toString(),
        resultado: doc.resultado,
        createdAt: doc.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  async findById(id: string): Promise<AnalisisCorteRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await AnalisisCorteModel.findById(id).lean();
    if (!doc) return null;

    return {
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      clienteId: doc.clienteId.toString(),
      resultado: doc.resultado,
      createdAt: doc.createdAt,
    };
  }

  async actualizarImagenEjemplo(id: string, corteIndex: number, imagenUrl: string): Promise<void> {
    await AnalisisCorteModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { [`resultado.cortesRecomendados.${corteIndex}.imagenEjemploUrl`]: imagenUrl } }
    );
  }
}
