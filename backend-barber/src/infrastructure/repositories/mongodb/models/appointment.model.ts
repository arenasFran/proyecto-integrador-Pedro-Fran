import mongoose, { Document, Schema } from 'mongoose';

export interface IStatusHistoryEntry {
  status: string;
  timestamp: Date;
  actor: string;
}

export interface ICreatedBy {
  type: 'staff' | 'registered' | 'anonymous';
  userId?: string;
}

export interface IAppointmentDocument extends Document {
  barberId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy?: ICreatedBy;
  statusHistory: IStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistoryEntrySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, required: true },
    actor: { type: String, required: true },
  },
  { _id: false }
);

const createdBySchema = new Schema<ICreatedBy>(
  {
    type: { type: String, enum: ['staff', 'registered', 'anonymous'], required: true },
    userId: { type: String, required: false },
  },
  { _id: false }
);

const appointmentSchema = new Schema<IAppointmentDocument>(
  {
    barberId: {
      type: Schema.Types.ObjectId,
      ref: 'Barber',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientLastname: {
      type: String,
      required: true,
    },
    clientPhone: {
      type: String,
      required: false,
    },
    clientEmail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    serviceId: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    servicePrice: {
      type: Number,
      required: true,
    },
    serviceDuration: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Confirmado', 'Cancelado', 'Completado', 'NoShow'],
      default: 'Confirmado',
    },
    paymentStatus: {
      type: String,
      enum: ['Pendiente', 'Pagado'],
      default: 'Pendiente',
    },
    paymentMethod: {
      type: String,
      enum: ['local', 'online', 'memberPass'],
      default: 'local',
    },
    cancelReason: {
      type: String,
      required: false,
    },
    cancelledAt: {
      type: Date,
      required: false,
    },
    cancelledBy: {
      type: String,
      required: false,
    },
    createdBy: {
      type: createdBySchema,
      required: false,
    },
    statusHistory: {
      type: [statusHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index(
  { barberId: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $eq: 'Confirmado' } } }
);
appointmentSchema.index({ clientId: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ date: 1, status: 1 });

export default mongoose.model<IAppointmentDocument>('Appointment', appointmentSchema);
