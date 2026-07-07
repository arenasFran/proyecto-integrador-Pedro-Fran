import mongoose, { Schema, Document } from 'mongoose';
import type { MembershipStatus, MembershipSource } from '../../../../domain/types/membership';

export interface IMembershipDocument extends Document {
  userId: mongoose.Types.ObjectId;
  status: MembershipStatus;
  startDate: Date;
  endDate: Date;
  couponsTotal: number;
  couponsUsed: number;
  productDiscount: number;
  createdBy: MembershipSource;
  adminId?: mongoose.Types.ObjectId;
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
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, status: 1 });

export const MembershipModel = mongoose.model<IMembershipDocument>('Membership', membershipSchema);
