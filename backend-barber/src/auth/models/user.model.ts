import mongoose, { Document, Schema } from 'mongoose';
import {
  AuthProvider,
  BarberRole,
  ClientRole,
  IBarberBaseInput,
  IClientBaseInput,
  IRegisteredClientInput,
  IUnregisteredClientInput,
} from '../types/user';

export interface IBarberBase extends Document, IBarberBaseInput {}
export interface IEmployee extends IBarberBase {
  role: 'empleado';
}
export interface IAdmin extends IBarberBase {
  role: 'admin';
}

export interface IClientBase extends Document, IClientBaseInput {}
export interface IRegisteredClient extends IClientBase, IRegisteredClientInput {}
export interface IUnregisteredClient extends IClientBase, IUnregisteredClientInput {}

const barberSchema = new Schema<IBarberBase>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    phone: { type: String, required: true, unique: true, sparse: true },
    twoFactorCode: { type: String },
    twoFactorExpires: { type: Date },
    role: {
      type: String,
      enum: ['empleado', 'admin'],
      required: true,
    },
  },
  {
    discriminatorKey: 'kind',
    collection: 'barbers',
  },
);

const Barber = mongoose.model<IBarberBase>('Barber', barberSchema);
const Employee = Barber.discriminator<IEmployee>('Empleado', new Schema({}, { _id: false }));
const Admin = Barber.discriminator<IAdmin>('Admin', new Schema({}, { _id: false }));

const clientSchema = new Schema<IClientBase>(
  {
    name: { type: String, required: true },
    lastname: { type: String, required: true },
    phone: { type: String, required: false, sparse: true },
    contactEmail: { type: String, required: false, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['cliente'],
      default: 'cliente',
      required: true,
    },
  },
  {
    discriminatorKey: 'kind',
    collection: 'clients',
  },
);

clientSchema.pre('save', function () {
  const doc = this as IClientBase & { email?: string };
  if (!doc.phone && !doc.contactEmail && !doc.email) {
    throw new Error('Debe incluir phone o contactEmail.');
  }
});

const Client = mongoose.model<IClientBase>('Client', clientSchema);

const registeredClientSchema = new Schema<IRegisteredClient>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: { type: String },
    twoFactorCode: { type: String },
    twoFactorExpires: { type: Date },
  },
  { _id: false },
);

const RegisteredClient = Client.discriminator<IRegisteredClient>('Registrado', registeredClientSchema);
const UnregisteredClient = Client.discriminator<IUnregisteredClient>('NoRegistrado', new Schema({}, { _id: false }));

export {
  Barber,
  Employee,
  Admin,
  Client,
  RegisteredClient,
  UnregisteredClient,
  AuthProvider,
  BarberRole,
  ClientRole,
};