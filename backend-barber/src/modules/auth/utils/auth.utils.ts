import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import {
    findBarberByEmail,
    updateBarberPassword,
} from '../services/barber.services';
import {
    findRegisteredClientByEmail,
    updateRegisteredClientPassword,
} from '../services/client.services';

export const hashPassword = (password: string) => {
  return bcrypt.hash(password, 10);
};

export const validatePassword = (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const findUserByEmail = async (email: string) => {
  const barber = await findBarberByEmail(email);
  if (barber) {
    return barber;
  }
  return findRegisteredClientByEmail(email);
};

export const updatePassword = async (
  userId: string | Types.ObjectId,
  passwordHash: string
) => {
  const barber = await updateBarberPassword(userId, passwordHash);
  if (barber) {
    return barber;
  }
  return updateRegisteredClientPassword(userId, passwordHash);
};
