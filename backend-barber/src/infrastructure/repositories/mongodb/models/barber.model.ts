import mongoose, { Document, Schema } from 'mongoose';
import { IAdminInput, IBarberBaseInput, IEmployeeInput } from '../../../types/user-input';
import type { BarberSchedule } from '../../../../domain/entities/Barber';

export interface IBarberBase extends Document, IBarberBaseInput {
  kind?: 'Admin' | 'Empleado';
  lastLoginAt?: Date;
  twoFactorFailedAttempts?: number;
  twoFactorLockedUntil?: Date;
  resetFailedAttempts?: number;
  resetLockedUntil?: Date;
}

export interface IEmployee extends IBarberBase, IEmployeeInput {
  kind: 'Empleado';
}

export interface IAdmin extends IBarberBase, IAdminInput {
  kind: 'Admin';
}

export interface IBarberRaw {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  kind?: string;
  services?: string[];
  age?: number;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
  schedule?: BarberSchedule;
}

export interface IEmployeeRaw extends IBarberRaw {
  kind: 'Empleado';
}

export interface IAdminRaw extends IBarberRaw {
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
    discriminatorKey: 'kind',
    collection: 'barbers',
  }
);

const Barber = mongoose.model<IBarberBase>('Barber', barberSchema);

const scheduleBreakSchema = new Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const scheduleDaySchema = new Schema(
  {
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    breaks: { type: [scheduleBreakSchema], default: [] },
  },
  { _id: false }
);

const scheduleSchema = new Schema(
  {
    monday: { type: scheduleDaySchema, required: true },
    tuesday: { type: scheduleDaySchema, required: true },
    wednesday: { type: scheduleDaySchema, required: true },
    thursday: { type: scheduleDaySchema, required: true },
    friday: { type: scheduleDaySchema, required: true },
    saturday: { type: scheduleDaySchema, required: true },
    sunday: { type: scheduleDaySchema, required: true },
  },
  { _id: false }
);

const Employee = Barber.discriminator<IEmployee>(
  'Empleado',
  new Schema(
    {
      services: {
        type: [String],
        default: [],
      },
      age: {
        type: Number,
      },
      photoUrl: {
        type: String,
        default: null,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      slotDuration: {
        type: Number,
        default: 30,
      },
      maxAdvanceDays: {
        type: Number,
        default: 30,
        min: 1,
      },
      schedule: {
        type: scheduleSchema,
        required: true,
      },
    },
    { _id: false }
  )
);

const Admin = Barber.discriminator<IAdmin>(
  'Admin',
  new Schema(
    {
      services: {
        type: [String],
        default: [],
      },
      age: {
        type: Number,
      },
      photoUrl: {
        type: String,
        default: null,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      slotDuration: {
        type: Number,
        default: 30,
      },
      maxAdvanceDays: {
        type: Number,
        default: 30,
        min: 1,
      },
      schedule: {
        type: scheduleSchema,
        required: true,
      },
    },
    { _id: false }
  )
);

export { Admin, Barber, Employee };

