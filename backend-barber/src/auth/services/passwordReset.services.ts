import crypto from 'crypto';
import { Types } from 'mongoose';
import PasswordReset from '../models/passwordReset.model';

const FALLBACK_EXP_MIN = 60;

const parseResetTokenExpirationMin = (value?: string) => {
  if (!value) {
    return FALLBACK_EXP_MIN;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return FALLBACK_EXP_MIN;
  }

  return parsedValue;
};

const DEFAULT_EXP_MIN = parseResetTokenExpirationMin(
  process.env.RESET_TOKEN_EXPIRATION_MIN,
);

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

/**
 * Atomically marks the token as used and returns the document (before update).
 * Returns null if the token is invalid, already used, or expired.
 * Using findOneAndUpdate prevents the race condition where two concurrent
 * requests both pass a separate verifyResetToken check and both reset the password.
 */
export const verifyAndConsumeResetToken = async (token: string) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const doc = await PasswordReset.findOneAndUpdate(
    { tokenHash, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true } },
    { new: false },
  );
  return doc;
};

export default { createResetToken, verifyResetToken, consumeResetToken, verifyAndConsumeResetToken };
