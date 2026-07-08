import mongoose, { Schema, Document } from 'mongoose';
import type { PaymentType, PaymentStatus } from '../../../../domain/types/payment.types';

export interface IPaymentDocument extends Document {
  type: PaymentType;
  referenceId: string;
  status: PaymentStatus;
  mpPaymentId?: string;
  mpPreferenceId?: string;
  amount: number;
  currency: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    type: {
      type: String,
      enum: ['appointment', 'membership', 'product_order'],
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    mpPaymentId: {
      type: String,
      required: false,
    },
    mpPreferenceId: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'UYU',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ referenceId: 1, type: 1 });
paymentSchema.index({ mpPreferenceId: 1 });
paymentSchema.index({ mpPaymentId: 1 });

export const PaymentModel = mongoose.model<IPaymentDocument>('Payment', paymentSchema);
