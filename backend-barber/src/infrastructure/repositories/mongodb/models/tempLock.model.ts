import mongoose, { Document, Schema } from 'mongoose';

export interface ITempLockDocument extends Document {
  barberId: mongoose.Types.ObjectId;
  date: string;
  startTime: string;
  clientId?: string;
  ownerToken: string;
  createdAt: Date;
}

const tempLockSchema = new Schema<ITempLockDocument>(
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
    clientId: {
      type: String,
      required: false,
    },
    ownerToken: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

tempLockSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });
tempLockSchema.index({ barberId: 1, date: 1, startTime: 1 }, { unique: true });

export default mongoose.model<ITempLockDocument>('TempLock', tempLockSchema);