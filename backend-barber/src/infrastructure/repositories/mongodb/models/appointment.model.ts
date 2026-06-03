import mongoose, { Document, Schema } from 'mongoose';

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
  cancelReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
      enum: ['Pendiente', 'Confirmado', 'Cancelado', 'Completado'],
      default: 'Pendiente',
    },
    cancelReason: {
      type: String,
      required: false,
    },
    cancelledAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ barberId: 1, date: 1, startTime: 1 });
appointmentSchema.index({ clientId: 1 });
appointmentSchema.index({ date: 1 });

export default mongoose.model<IAppointmentDocument>('Appointment', appointmentSchema);
