import mongoose, { Document, Schema } from 'mongoose';
import { IBarberBaseInput } from '../../../types/user-input';

export interface IBarberBase extends Document, IBarberBaseInput {
  kind?: 'Admin' | 'Empleado';
}

export interface IEmployee extends IBarberBase {
  kind: 'Empleado';
}

export interface IAdmin extends IBarberBase {
  kind: 'Admin';
}

const barberSchema = new Schema<IBarberBase>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    twoFactorCode: {
      type: String,
    },
    twoFactorExpires: {
      type: Date,
    },
  },
  {
    discriminatorKey: 'kind',
    collection: 'barbers',
  }
);

const Barber = mongoose.model<IBarberBase>('Barber', barberSchema);

const Employee = Barber.discriminator<IEmployee>(
  'Empleado',
  new Schema({}, { _id: false })
);

const Admin = Barber.discriminator<IAdmin>(
  'Admin',
  new Schema({}, { _id: false })
);

export { Admin, Barber, Employee };

