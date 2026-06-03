import mongoose, { Document, Schema } from 'mongoose';
import { IAdminInput, IBarberBaseInput, IEmployeeInput } from '../../../types/user-input';

export interface IBarberBase extends Document, IBarberBaseInput {
  kind?: 'Admin' | 'Empleado';
}

export interface IEmployee extends IBarberBase, IEmployeeInput {
  kind: 'Empleado';
}

export interface IAdmin extends IBarberBase, IAdminInput {
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
      specialties: {
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
      specialties: {
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
      schedule: {
        type: scheduleSchema,
        required: true,
      },
    },
    { _id: false }
  )
);

export { Admin, Barber, Employee };

