import mongoose, { Schema, Document } from 'mongoose';

export interface ICorteRecomendado {
  nombreCorte: string;
  descripcion: string;
  razon: string;
  servicioSugerido: string;
  imagenEjemploUrl?: string;
}

export interface IAnalisisCorteDocument extends Document {
  clienteId: mongoose.Types.ObjectId;
  resultado: {
    formaCara: string;
    cortesRecomendados: ICorteRecomendado[];
    explicacionGeneral: string;
  };
  createdAt: Date;
}

const corteRecomendadoSchema = new Schema<ICorteRecomendado>(
  {
    nombreCorte: { type: String, required: true },
    descripcion: { type: String, required: true },
    razon: { type: String, required: true },
    servicioSugerido: { type: String, required: true },
    imagenEjemploUrl: { type: String, required: false },
  },
  { _id: false }
);

const analisisCorteSchema = new Schema<IAnalisisCorteDocument>(
  {
    clienteId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    resultado: {
      formaCara: { type: String, required: true },
      cortesRecomendados: { type: [corteRecomendadoSchema], required: true },
      explicacionGeneral: { type: String, required: true },
    },
  },
  { timestamps: true }
);

analisisCorteSchema.index({ clienteId: 1, createdAt: -1 });

export const AnalisisCorteModel = mongoose.model<IAnalisisCorteDocument>('AnalisisCorte', analisisCorteSchema);
