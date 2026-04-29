import mongoose, { Document, Schema } from 'mongoose';
import {
  AuthProvider,
  IBarberBaseInput,
  IClientBaseInput,
  IRegisteredClientInput,
  IUnregisteredClientInput,
} from '../types/user';

/* =========================
   BARBERS
========================= */

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

/* =========================
   CLIENTS
========================= */

export interface IClientBase extends Document, IClientBaseInput {
  kind?: 'Registrado' | 'NoRegistrado';
}

export interface IRegisteredClient
  extends IClientBase,
    IRegisteredClientInput {
  kind: 'Registrado';
}

export interface IUnregisteredClient
  extends IClientBase,
    IUnregisteredClientInput {
  kind: 'NoRegistrado';
}

const clientSchema = new Schema<IClientBase>(
  {
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
      required: false,
      unique: true,
      sparse: true,
    },
    contactEmail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
  },
  {
    discriminatorKey: 'kind',
    collection: 'clients',
  }
);

clientSchema.pre('save', function () {
  const doc = this as IClientBase & { email?: string };

  if (!doc.phone && !doc.contactEmail && !doc.email) {
    throw new Error(
      'Debe incluir phone, contactEmail o email.'
    );
  }
});

const Client = mongoose.model<IClientBase>('Client', clientSchema);

const registeredClientSchema = new Schema<IRegisteredClient>(
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
      required: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
    },
    twoFactorCode: {
      type: String,
    },
    twoFactorExpires: {
      type: Date,
    },
  },
  {
    _id: false,
  }
);

const RegisteredClient = Client.discriminator<IRegisteredClient>(
  'Registrado',
  registeredClientSchema
);

const UnregisteredClient = Client.discriminator<IUnregisteredClient>(
  'NoRegistrado',
  new Schema({}, { _id: false })
);

/* =========================
   EXPORTS
========================= */

export {
  Barber,
  Employee,
  Admin,
  Client,
  RegisteredClient,
  UnregisteredClient,
};
export type { AuthProvider };
