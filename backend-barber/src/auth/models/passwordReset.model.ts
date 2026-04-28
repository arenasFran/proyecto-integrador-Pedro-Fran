import mongoose, { Document } from 'mongoose';
const { Schema } = mongoose;

export interface IPasswordReset extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const PasswordReset = mongoose.model<IPasswordReset>('PasswordReset', passwordResetSchema);
export default PasswordReset;
