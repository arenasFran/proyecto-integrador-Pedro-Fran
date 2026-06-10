import mongoose, { Document, Schema } from 'mongoose';
import {
    IClientBaseInput,
    IRegisteredClientInput,
    IUnregisteredClientInput,
} from '../../../types/user-input';

export interface IClientBase extends Document, IClientBaseInput {
  kind?: 'Registrado' | 'NoRegistrado';
}

export interface IRegisteredClient extends IClientBase, IRegisteredClientInput {
  kind: 'Registrado';
  lastLoginAt?: Date;
  twoFactorFailedAttempts?: number;
  twoFactorLockedUntil?: Date;
  resetFailedAttempts?: number;
  resetLockedUntil?: Date;
}

export interface IUnregisteredClient extends IClientBase, IUnregisteredClientInput {
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
    throw new Error('Debe incluir phone, contactEmail o email.');
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
    twoFactorFailedAttempts: {
      type: Number,
      default: 0,
    },
    twoFactorLockedUntil: {
      type: Date,
      default: null,
    },
    resetFailedAttempts: {
      type: Number,
      default: 0,
    },
    resetLockedUntil: {
      type: Date,
      default: null,
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

export { Client, RegisteredClient, UnregisteredClient };

