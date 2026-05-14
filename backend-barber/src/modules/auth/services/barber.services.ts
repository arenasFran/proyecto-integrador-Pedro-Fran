import { Types } from 'mongoose';
import { Barber } from '../../../common/models/barber.model';

export const findBarberByEmail = (email: string) => {
  return Barber.findOne({ email });
};

export const findBarberByPhone = (phone: string) => {
  return Barber.findOne({ phone });
};

export const updateBarberPassword = (
  userId: string | Types.ObjectId,
  passwordHash: string
) => {
  return Barber.findByIdAndUpdate(userId, { password: passwordHash });
};
