import mongoose, { Schema, Document } from 'mongoose';

export interface IRevenueEntryDocument extends Document {
  source: 'appointment' | 'product_order' | 'membership';
  amount: number;
  date: Date;
  referenceId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const RevenueEntrySchema = new Schema<IRevenueEntryDocument>(
  {
    source: { type: String, enum: ['appointment', 'product_order', 'membership'], required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, index: true },
    referenceId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RevenueEntrySchema.index({ source: 1, date: 1 });

export const RevenueEntryModel = mongoose.model<IRevenueEntryDocument>('RevenueEntry', RevenueEntrySchema);
