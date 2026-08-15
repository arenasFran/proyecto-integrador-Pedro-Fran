import mongoose, { Document, Schema } from 'mongoose';
import {
    IClientBaseInput,
    IRegisteredClientInput,
    IUnregisteredClientInput,
} from '../../../types/user-input';

export interface IClientBase extends Document, IClientBaseInput {
  kind?: 'Registrado' | 'NoRegistrado';
  photoUrl?: string | null;
  noShowCount?: number;
  sancionado?: boolean;
  fechaSancion?: Date | null;
  motivoSancion?: string | null;
  sancionadoPor?: string | null;
  termsVersion?: string;
  privacyVersion?: string;
  acceptedAt?: Date | null;
  marketingConsent?: boolean;
}

export interface IRegisteredClient extends IClientBase, IRegisteredClientInput {
  kind: 'Registrado';
  lastLoginAt?: Date;
  twoFactorFailedAttempts?: number;
  twoFactorLockedUntil?: Date;
  resetFailedAttempts?: number;
  resetLockedUntil?: Date;
  consentimientoAnalisisIA?: boolean;
  consentimientoAnalisisIAFecha?: Date | null;
  ultimoAnalisisFecha?: Date | null;
  analisisLockedAt?: Date | null;
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
    photoUrl: {
      type: String,
      default: null,
    },
    noShowCount: {
      type: Number,
      default: 0,
    },
    sancionado: {
      type: Boolean,
      default: false,
    },
    fechaSancion: {
      type: Date,
      default: null,
    },
    motivoSancion: {
      type: String,
      default: null,
    },
    sancionadoPor: {
      type: String,
      default: null,
    },
    termsVersion: {
      type: String,
      default: null,
    },
    privacyVersion: {
      type: String,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    marketingConsent: {
      type: Boolean,
      default: false,
    },
  },
  {
    discriminatorKey: 'kind',
    collection: 'clients',
  }
);

// Soporta el prefix-search de MongoClientRepository.searchRegistered (regex anclado ^).
clientSchema.index({ name: 1 });
clientSchema.index({ lastname: 1 });

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
    consentimientoAnalisisIA: {
      type: Boolean,
      default: false,
    },
    consentimientoAnalisisIAFecha: {
      type: Date,
      default: null,
    },
    ultimoAnalisisFecha: {
      type: Date,
      default: null,
    },
    analisisLockedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
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

export { Client, RegisteredClient, UnregisteredClient };

