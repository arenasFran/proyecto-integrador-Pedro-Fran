import mongoose, { Schema } from 'mongoose';
import type { BarberBlockProps } from '../../../../domain/entities/BarberBlock';

export type BarberBlockDocument = mongoose.Document & BarberBlockProps;

const barberBlockSchema = new Schema<BarberBlockDocument>(
  {
    barberId: {
      type: String,
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

barberBlockSchema.index({ barberId: 1, date: 1, startTime: 1 });

export const BarberBlockModel = mongoose.model<BarberBlockDocument>('BarberBlock', barberBlockSchema);
