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

  async findByClienteId(clienteId: string): Promise<AnalisisCorteRecord[]> {
    const docs = await AnalisisCorteModel.find({
      clienteId: new mongoose.Types.ObjectId(clienteId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return docs.map((doc) => ({
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      clienteId: doc.clienteId.toString(),
      resultado: doc.resultado,
      createdAt: doc.createdAt,
    }));
  }
}
