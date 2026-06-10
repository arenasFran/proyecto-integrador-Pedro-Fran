import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true, refPath: 'userModel' },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

refreshTokenSchema.index({ userId: 1, revoked: 1 });

const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema, 'refresh_tokens');
export default RefreshTokenModel;
