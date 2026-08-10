import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Employee, Admin } from '../../src/infrastructure/repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../../src/infrastructure/repositories/mongodb/models/client.model';
import AppointmentModel from '../../src/infrastructure/repositories/mongodb/models/appointment.model';
import ServiceModel from '../../src/infrastructure/repositories/mongodb/models/service.model';
import TempLockModel from '../../src/infrastructure/repositories/mongodb/models/tempLock.model';
import { ProductModel } from '../../src/infrastructure/repositories/mongodb/models/product.model';
import type { BarberSchedule } from '../../src/domain/entities/Barber';

const SCHEDULE: BarberSchedule = {
  monday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  tuesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  wednesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  thursday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  friday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  saturday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  sunday: { startTime: '09:00', endTime: '18:00', breaks: [] },
};

export function signToken(overrides?: Partial<{ id: string; email: string; kind: string }>) {
  const id = overrides?.id || new mongoose.Types.ObjectId().toString();
  const email = overrides?.email || 'test@example.com';
  const kind = overrides?.kind || 'Admin';
  return {
    token: jwt.sign(
      {
        id,
        email,
        kind,
        type: 'access',
        iss: 'barberia-api',
        aud: 'barberia-client',
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m', algorithm: 'HS256' as jwt.Algorithm }
    ),
    id,
    email,
    kind,
  };
}

export async function seedBarber(overrides?: {
  id?: string;
  email?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  schedule?: BarberSchedule;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
}): Promise<{ _id: mongoose.Types.ObjectId; barberId: string }> {
  const barberId = overrides?.id || new mongoose.Types.ObjectId().toString();
  const passwordHash = await bcrypt.hash('Test1234!', 10);
  const doc = await Employee.create({
    _id: barberId,
    email: overrides?.email || 'barbero@test.com',
    password: passwordHash,
    name: overrides?.name || 'Carlos',
    lastname: overrides?.lastname || 'Lopez',
    phone: overrides?.phone || '098765432',
    services: [],
    isActive: overrides?.isActive ?? true,
    slotDuration: overrides?.slotDuration ?? 30,
    maxAdvanceDays: overrides?.maxAdvanceDays ?? 30,
    schedule: overrides?.schedule || SCHEDULE,
  });
  return { _id: doc._id as mongoose.Types.ObjectId, barberId: doc._id.toString() };
}

export async function seedAdmin(overrides?: {
  email?: string;
  phone?: string;
}): Promise<{ _id: mongoose.Types.ObjectId; adminId: string }> {
  const adminId = new mongoose.Types.ObjectId().toString();
  const passwordHash = await bcrypt.hash('Admin1234!', 10);
  const doc = await Admin.create({
    _id: adminId,
    email: overrides?.email || 'admin@test.com',
    password: passwordHash,
    name: 'Admin',
    lastname: 'Test',
    phone: overrides?.phone || `099${String(Date.now()).slice(-6)}`,
    services: [],
    isActive: true,
    slotDuration: 30,
    maxAdvanceDays: 30,
    schedule: SCHEDULE,
  });
  return { _id: doc._id as mongoose.Types.ObjectId, adminId: doc._id.toString() };
}

export async function seedRegisteredClient(overrides?: {
  email?: string;
  phone?: string;
  name?: string;
  lastname?: string;
}): Promise<{ _id: mongoose.Types.ObjectId; clientId: string; email: string }> {
  const email = overrides?.email || 'cliente@test.com';
  const passwordHash = await bcrypt.hash('Client1234!', 10);
  const doc = await RegisteredClient.create({
    email,
    password: passwordHash,
    name: overrides?.name || 'Juan',
    lastname: overrides?.lastname || 'Perez',
    phone: overrides?.phone || '099222222',
    authProvider: 'local',
  });
  return { _id: doc._id as mongoose.Types.ObjectId, clientId: doc._id.toString(), email };
}

export async function seedService(overrides?: {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  status?: string;
}): Promise<{ _id: mongoose.Types.ObjectId; serviceId: string }> {
  const doc = await ServiceModel.create({
    name: overrides?.name || 'Corte de pelo',
    description: overrides?.description || 'Incluye barba/cejas/lavado/bebida a elección',
    price: overrides?.price ?? 490,
    imageUrl: overrides?.imageUrl || '',
    status: overrides?.status ?? 'active',
  });
  return { _id: doc._id as mongoose.Types.ObjectId, serviceId: doc._id.toString() };
}

export async function seedAppointment(overrides: {
  barberId: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  date?: string;
  startTime?: string;
  status?: string;
  serviceId?: string;
}): Promise<{ appointmentId: string }> {
  const now = new Date();
  const doc = await AppointmentModel.create({
    barberId: new mongoose.Types.ObjectId(overrides.barberId),
    clientId: overrides.clientId ? new mongoose.Types.ObjectId(overrides.clientId) : undefined,
    clientName: 'Juan',
    clientLastname: 'Perez',
    clientPhone: overrides.clientPhone ?? '099333333',
    clientEmail: overrides.clientEmail !== undefined ? overrides.clientEmail : 'cliente@test.com',
    serviceId: overrides.serviceId || SERVICE_ID,
    serviceName: 'Corte de pelo',
    servicePrice: 490,
    serviceDuration: 30,
    date: overrides.date || getFutureDate(30),
    startTime: overrides.startTime || '10:00',
    endTime: '10:30',
    status: overrides.status || 'Confirmado',
    paymentStatus: 'Pendiente',
    paymentMethod: 'local',
    statusHistory: [{ status: overrides.status || 'Confirmado', timestamp: now, actor: 'system' }],
  });
  return { appointmentId: doc._id.toString() };
}

export async function seedTempLock(overrides: {
  barberId: string;
  date?: string;
  startTime?: string;
}): Promise<{ tempLockId: string }> {
  const doc = await TempLockModel.create({
    barberId: new mongoose.Types.ObjectId(overrides.barberId),
    date: overrides.date || getFutureDate(30),
    startTime: overrides.startTime || '10:00',
  });
  return { tempLockId: doc._id.toString() };
}

export async function seedProduct(overrides?: {
  name?: string;
  price?: number;
  stock?: number;
  minStock?: number;
  status?: string;
  category?: string;
}): Promise<{ productId: string }> {
  const doc = await ProductModel.create({
    name: overrides?.name || 'Cera para barba',
    description: 'Fija y da brillo',
    price: overrides?.price ?? 500,
    stock: overrides?.stock ?? 10,
    minStock: overrides?.minStock ?? 5,
    imageUrl: '',
    category: overrides?.category || 'cuidado',
    status: overrides?.status ?? 'active',
  });
  return { productId: doc._id.toString() };
}

export function getFutureDate(daysAhead: number, time?: string): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// El webhook de MP responde 200 antes de terminar de procesar la notificación
// (fire-and-forget), así que los tests deben esperar a que el efecto en la
// base de datos aparezca en vez de asumir que ya ocurrió al recibir la respuesta HTTP.
export async function waitFor(check: () => Promise<boolean>, timeoutMs = 2000, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor: condición no cumplida dentro de ${timeoutMs}ms`);
}

export const SERVICE_ID = new mongoose.Types.ObjectId().toString();
export const SERVICE_ID_2 = new mongoose.Types.ObjectId().toString();
