import mongoose, { Schema, Document } from 'mongoose';

export interface IMembershipTransactionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  membershipId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'mercadopago' | 'local';
  mpPaymentId?: string;
  createdBy: 'client' | 'admin';
  adminId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const membershipTransactionSchema = new Schema<IMembershipTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    membershipId: { type: Schema.Types.ObjectId, ref: 'Membership', required: true, index: true },
    amount: { type: Number, required: true, default: 0 },
    paymentMethod: { type: String, enum: ['mercadopago', 'local'], required: true },
    mpPaymentId: { type: String, required: false },
    createdBy: { type: String, enum: ['client', 'admin'], required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
);

membershipTransactionSchema.index({ userId: 1, createdAt: -1 });
membershipTransactionSchema.index({ membershipId: 1, createdAt: -1 });

export const MembershipTransactionModel = mongoose.model<IMembershipTransactionDocument>(
  'MembershipTransaction',
  membershipTransactionSchema
);
