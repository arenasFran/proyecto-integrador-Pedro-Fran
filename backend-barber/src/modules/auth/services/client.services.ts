import { Types } from 'mongoose';
import { RegisteredClient } from '../../../common/models/client.model';
import { IRegisteredClientInput } from '../../../common/types/user';

export const createRegisteredClient = async (
  newUser: IRegisteredClientInput
) => {
  const user = new RegisteredClient(newUser);
  await user.save();
  return user;
};

export const findRegisteredClientByEmail = (email: string) => {
  return RegisteredClient.findOne({ email });
};

export const findRegisteredClientByPhone = (phone: string) => {
  return RegisteredClient.findOne({ phone });
};

export const updateRegisteredClientPassword = (
  userId: string | Types.ObjectId,
  passwordHash: string
) => {
  return RegisteredClient.findByIdAndUpdate(userId, { password: passwordHash });
};
