import mongoose, { Schema, Document } from 'mongoose';
import type { MembershipStatus, MembershipSource } from '../../../../domain/types/membership';

export interface IMembershipDocument extends Document {
  userId: mongoose.Types.ObjectId;
  status: MembershipStatus;
  price: number;
  startDate: Date;
  endDate: Date;
  couponsTotal: number;
  couponsUsed: number;
  productDiscount: number;
  durationDays: number;
  billingCycle: 'monthly' | 'onetime' | null;
  createdBy: MembershipSource;
  adminId?: mongoose.Types.ObjectId;
  mpPreapprovalId?: string;
  paymentMethod: 'mercadopago' | 'local' | null;
  paymentId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembershipDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'pending', 'cancelled'],
      default: 'active',
    },
    price: { type: Number, required: true, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    couponsTotal: { type: Number, required: true, default: 4 },
    couponsUsed: { type: Number, required: true, default: 0 },
    productDiscount: { type: Number, required: true, default: 10 },
    durationDays: { type: Number, required: true, default: 30 },
    billingCycle: {
      type: String,
      enum: ['monthly', 'onetime', null],
      default: null,
    },
    createdBy: {
      type: String,
      enum: ['client', 'admin'],
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    mpPreapprovalId: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: ['mercadopago', 'local', null],
      default: null,
    },
    paymentId: {
      type: String,
      required: false,
    },
    approvedBy: {
      type: String,
      required: false,
    },
    approvedAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

membershipSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
membershipSchema.index({ mpPreapprovalId: 1 });

export const MembershipModel = mongoose.model<IMembershipDocument>('Membership', membershipSchema);
