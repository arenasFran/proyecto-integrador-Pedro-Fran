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
  createdBy: MembershipSource;
  adminId?: mongoose.Types.ObjectId;
  mpPreapprovalId?: string;
  nextBillingDate?: Date;
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
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    price: { type: Number, required: true, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    couponsTotal: { type: Number, required: true, default: 4 },
    couponsUsed: { type: Number, required: true, default: 0 },
    productDiscount: { type: Number, required: true, default: 10 },
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
    nextBillingDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ mpPreapprovalId: 1 });

export const MembershipModel = mongoose.model<IMembershipDocument>('Membership', membershipSchema);
