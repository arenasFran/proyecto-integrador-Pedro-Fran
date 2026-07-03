import mongoose, { Schema } from 'mongoose';
import type { BarberBlockProps } from '../../../../domain/entities/BarberBlock';

export interface IBarberBlockDocument extends mongoose.Document {
  barberId: mongoose.Types.ObjectId;
  date: string;
  startTime: string;
  endTime: string;
  createdBy?: string;
}

const barberBlockSchema = new Schema<IBarberBlockDocument>(
  {
    barberId: {
      type: Schema.Types.ObjectId,
      ref: 'Barber',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

barberBlockSchema.index({ barberId: 1, date: 1, startTime: 1 }, { unique: true });

export const BarberBlockModel = mongoose.model<IBarberBlockDocument>('BarberBlock', barberBlockSchema);
