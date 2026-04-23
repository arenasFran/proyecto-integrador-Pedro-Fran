import crypto from 'crypto';
import { Types } from 'mongoose';
import PasswordReset from '../models/passwordReset.model';

const DEFAULT_EXP_MIN = process.env.RESET_TOKEN_EXPIRATION_MIN
  ? Number(process.env.RESET_TOKEN_EXPIRATION_MIN)
  : 60;

export const createResetToken = async (userId: Types.ObjectId | string) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + DEFAULT_EXP_MIN * 60 * 1000);

  const doc = new PasswordReset({ userId, tokenHash, expiresAt });
  await doc.save();
  return token; // raw token to be sent by email
};

export const verifyResetToken = async (token: string) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const doc = await PasswordReset.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  return doc;
};

export const consumeResetToken = async (id: string | Types.ObjectId) => {
  await PasswordReset.findByIdAndUpdate(id, { used: true });
};

export default { createResetToken, verifyResetToken, consumeResetToken };
