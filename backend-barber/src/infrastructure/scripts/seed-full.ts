import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Admin, Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import ServiceModel from '../repositories/mongodb/models/service.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';
import { MembershipModel } from '../repositories/mongodb/models/membership.model';
import { MembershipTransactionModel } from '../repositories/mongodb/models/membership-transaction.model';
import { PaymentModel } from '../repositories/mongodb/models/payment.model';
import { ProductModel } from '../repositories/mongodb/models/product.model';
import { OrderModel } from '../repositories/mongodb/models/order.model';
import { getConfig } from '../config/env';

// ── Helpers ────────────────────────────────────────────────

const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
const createWorkDay = (start: string, end: string, breakStart?: string, breakEnd?: string) => ({
  startTime: start,
  endTime: end,
  breaks: breakStart && breakEnd ? [{ startTime: breakStart, endTime: breakEnd }] : [],
});

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextWeekday(from: Date, targetDay: number): Date {
  const result = new Date(from);
  const daysUntil = (targetDay + 7 - from.getDay() - 1) % 7 + 1;
  result.setDate(from.getDate() + daysUntil);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getPreviousWeekday(from: Date, targetDay: number): Date {
  const result = new Date(from);
  const daysSince = (from.getDay() + 7 - targetDay) % 7;
  result.setDate(from.getDate() - (daysSince || 7));
  result.setHours(0, 0, 0, 0);
  return result;
}

function getFutureDate(now: Date, dayName: string): Date {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(dayName);
  return getNextWeekday(now, dayIndex);
}

function getPastDate(now: Date, dayName: string): Date {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(dayName);
  const prev = getPreviousWeekday(now, dayIndex);
  if (now.getDay() > dayIndex) prev.setDate(prev.getDate() - 7);
  return prev;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const SEED_SERVICES = [
  { id: 'svc-1', name: 'Corte de pelo', price: 490, duration: 50 },
  { id: 'svc-2', name: 'Corte a máquina', price: 350, duration: 30 },
  { id: 'svc-3', name: 'Barba', price: 250, duration: 25 },
  { id: 'svc-4', name: 'Promo x2', price: 900, duration: 70 },
];

const SERVICE_CYCLE = [0, 0, 1, 2, 0, 1, 3, 0, 2, 1, 0, 0, 1, 2, 3, 0, 1, 0, 2, 1];

// ── 1. Admin ───────────────────────────────────────────────

async function seedAdminTable(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'Santiago';
  const adminLastname = process.env.SEED_ADMIN_LASTNAME || 'Abbona';
  const adminPhone = process.env.SEED_ADMIN_PHONE || '000000000';

  if (!adminEmail || !adminPassword) {
    console.warn('[Seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no configurados — saltando admin');
    return;
  }

  const existing = await Admin.findOne({ email: adminEmail });
  if (existing) { console.log('[Seed] Admin ya existe — omitido'); return; }

  const hash = await bcrypt.hash(adminPassword, 10);
  await Admin.create({
    email: adminEmail, password: hash, name: adminName, lastname: adminLastname,
    phone: adminPhone, slotDuration: 30,
    schedule: {
      monday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      tuesday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      wednesday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      thursday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      friday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      saturday: createWorkDay('09:00', '13:00'),
      sunday: createEmptyDay(),
    },
  });
  console.log('[Seed] Admin creado');
}

// ── 2. Barbers ─────────────────────────────────────────────

const barbersSeedData = [
  { email: 'carlos@elitecut.com', password: 'Barber123', name: 'Carlos', lastname: 'Gutiérrez', phone: '099111111', age: 32, slotDuration: 30,
    schedule: { monday: createWorkDay('09:00', '18:00', '13:00', '14:00'), tuesday: createWorkDay('09:00', '18:00', '13:00', '14:00'), wednesday: createWorkDay('09:00', '18:00', '13:00', '14:00'), thursday: createWorkDay('09:00', '18:00', '13:00', '14:00'), friday: createWorkDay('09:00', '18:00', '13:00', '14:00'), saturday: createWorkDay('09:00', '14:00'), sunday: createEmptyDay() } },
  { email: 'martin@elitecut.com', password: 'Barber123', name: 'Martín', lastname: 'López', phone: '099222222', age: 28, slotDuration: 30,
    schedule: { monday: createEmptyDay(), tuesday: createWorkDay('10:00', '19:00', '14:00', '15:00'), wednesday: createWorkDay('10:00', '19:00', '14:00', '15:00'), thursday: createWorkDay('10:00', '19:00', '14:00', '15:00'), friday: createWorkDay('10:00', '19:00', '14:00', '15:00'), saturday: createWorkDay('10:00', '16:00'), sunday: createEmptyDay() } },
  { email: 'lucia@elitecut.com', password: 'Barber123', name: 'Lucía', lastname: 'Fernández', phone: '099333333', age: 26, slotDuration: 45,
    schedule: { monday: createWorkDay('08:00', '17:00', '12:00', '13:00'), tuesday: createWorkDay('08:00', '17:00', '12:00', '13:00'), wednesday: createWorkDay('08:00', '17:00', '12:00', '13:00'), thursday: createWorkDay('08:00', '17:00', '12:00', '13:00'), friday: createWorkDay('08:00', '17:00', '12:00', '13:00'), saturday: createEmptyDay(), sunday: createEmptyDay() } },
];

async function seedBarbersTable(): Promise<void> {
  for (const data of barbersSeedData) {
    const existing = await Employee.findOne({ email: data.email });
    if (existing) { console.log(`[Seed] Barbero ${data.name} ya existe — omitido`); continue; }
    const hash = await bcrypt.hash(data.password, 10);
    await Employee.create({ ...data, password: hash, isActive: true, photoUrl: null });
    console.log(`[Seed] Barbero ${data.name} ${data.lastname} creado`);
  }
}

// ── 3. Services ────────────────────────────────────────────

const SERVICES_SEED = [
  { name: 'Corte de pelo', description: 'Incluye barba/cejas/lavado/bebida a elección', price: 490, imageUrl: 'https://placehold.co/400x300?text=Corte+de+pelo', status: 'active' },
  { name: 'Corte a máquina', description: 'Un solo número en toda la cabeza, incluye bebida a elección', price: 350, imageUrl: 'https://placehold.co/400x300?text=Corte+a+m%C3%A1quina', status: 'active' },
  { name: 'Barba', description: 'Incluye bebida a elección', price: 250, imageUrl: 'https://placehold.co/400x300?text=Barba', status: 'active' },
  { name: 'Promo x2', description: 'Promo x2 — $450 por persona', price: 900, imageUrl: 'https://placehold.co/400x300?text=Promo+x2', status: 'active' },
];

async function seedServicesTable(): Promise<void> {
  for (const svc of SERVICES_SEED) {
    await ServiceModel.findOneAndUpdate(
      { name: svc.name },
      { $setOnInsert: svc },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log('[Seed] Servicios creados');
}

// ── 4. Clients + Memberships + MemberPass Appointments ─────

const CLIENTS = [
  { email: 'clienteA@test.com', name: 'Ana', lastname: 'Martínez', phone: '099111001' },
  { email: 'clienteB@test.com', name: 'Bruno', lastname: 'Rodríguez', phone: '099111002' },
  { email: 'clienteC@test.com', name: 'Carmen', lastname: 'López', phone: '099111003' },
  { email: 'clienteD@test.com', name: 'Diego', lastname: 'Fernández', phone: '099111004' },
  { email: 'clienteE@test.com', name: 'Elena', lastname: 'García', phone: '099111005' },
  { email: 'clienteF@test.com', name: 'Facundo', lastname: 'Pérez', phone: '099111006' },
  { email: 'clienteG@test.com', name: 'Gabriela', lastname: 'Silva', phone: '099111007' },
];

function findSlot(barber: any, dayName: string, serviceDuration: number, getDate: () => Date): { dateStr: string; startTime: string; endTime: string } | null {
  const scheduleDay = barber.schedule?.[dayName];
  if (!scheduleDay?.startTime || !scheduleDay?.endTime) return null;
  const date = getDate();
  const dateStr = formatDate(date);
  const startTime = scheduleDay.startTime;
  const [startH, startM] = startTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = startMinutes + serviceDuration;
  const [closeH, closeM] = scheduleDay.endTime.split(':').map(Number);
  const closeMinutes = closeH * 60 + closeM;
  if (endMinutes > closeMinutes) return null;
  for (const br of scheduleDay.breaks || []) {
    const [brSH, brSM] = br.startTime.split(':').map(Number);
    const [brEH, brEM] = br.endTime.split(':').map(Number);
    const brStart = brSH * 60 + brSM;
    const brEnd = brEH * 60 + brEM;
    if (startMinutes < brEnd && endMinutes > brStart) return null;
  }
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  return { dateStr, startTime, endTime };
}

async function seedClientsMembershipsAndAppointments(barbers: any[]): Promise<{ clientDocs: any[]; barbers: any[] }> {
  const cfg = getConfig();
  cloudinary.config({
    cloud_name: cfg.cloudinaryCloudName,
    api_key: cfg.cloudinaryApiKey,
    api_secret: cfg.cloudinaryApiSecret,
  });

  const clientDocs: any[] = [];

  for (const c of CLIENTS) {
    const existing = await RegisteredClient.findOne({ email: c.email });
    if (existing) { clientDocs.push(existing); continue; }

    const hash = await bcrypt.hash('Test1234', 10);
    const doc = await RegisteredClient.create({
      name: c.name, lastname: c.lastname, phone: c.phone,
      email: c.email, password: hash, authProvider: 'local',
    });

    try {
      const publicId = `avatar_${c.email.replace(/[@.]/g, '_')}`;
      const result = await cloudinary.uploader.upload(
        `https://i.pravatar.cc/150?u=${c.email}`,
        { folder: 'avatars', public_id: publicId, overwrite: true },
      );
      await RegisteredClient.findByIdAndUpdate(doc._id, { photoUrl: result.secure_url });
    } catch {
      // Cloudinary upload optional
    }

    clientDocs.push(doc);
    console.log(`[Seed] Cliente ${c.email} creado con avatar`);
  }

  const getClient = (email: string) => clientDocs.find((d: any) => d.email.toLowerCase() === email.toLowerCase());

  // Memberships
  const membershipsData = [
    { client: getClient('clienteA@test.com'), couponsUsed: 0, label: 'Cliente A — activa 4 cupones' },
    { client: getClient('clienteB@test.com'), couponsUsed: 2, label: 'Cliente B — 2 usados' },
    { client: getClient('clienteD@test.com'), couponsUsed: 0, label: 'Cliente D — expirada', expired: true },
    { client: getClient('clienteE@test.com'), couponsUsed: 4, label: 'Cliente E — cupones agotados' },
    { client: getClient('clienteG@test.com'), couponsUsed: 0, label: 'Cliente G — activa' },
  ];

  const membershipDocs: any[] = [];

  for (const m of membershipsData) {
    const clientId = m.client._id;
    const existing = await MembershipModel.findOne({ userId: clientId, status: 'active', endDate: { $gte: new Date() } });
    if (existing) { membershipDocs.push(existing); continue; }

    const now = new Date();
    const endDate = new Date(now);
    if (m.expired) {
      endDate.setDate(endDate.getDate() - 30);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    const doc = await MembershipModel.create({
      userId: clientId, status: m.expired ? 'expired' : 'active',
      startDate: now, endDate, couponsTotal: 4, couponsUsed: m.couponsUsed,
      productDiscount: 10, durationDays: 30, createdBy: 'admin',
      paymentMethod: 'local', price: 399,
    });
    membershipDocs.push(doc);
    console.log(`[Seed] Membresía: ${m.label}`);
  }

  // Membership transaction history for rich payment history view
  const memTxSeeds: Array<{ clientEmail: string; amount: number; paymentMethod: 'mercadopago' | 'local'; daysAgo?: number; admin?: boolean }> = [
    { clientEmail: 'clienteA@test.com', amount: 399, paymentMethod: 'local', daysAgo: 0, admin: true },
    { clientEmail: 'clienteA@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 30 },
    { clientEmail: 'clienteA@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 60 },
    { clientEmail: 'clienteA@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 90 },
    { clientEmail: 'clienteB@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 0 },
    { clientEmail: 'clienteB@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 30 },
    { clientEmail: 'clienteB@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 60 },
    { clientEmail: 'clienteD@test.com', amount: 399, paymentMethod: 'local', daysAgo: 90, admin: true },
    { clientEmail: 'clienteD@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 60 },
    { clientEmail: 'clienteE@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 30 },
    { clientEmail: 'clienteE@test.com', amount: 399, paymentMethod: 'local', daysAgo: 60, admin: true },
    { clientEmail: 'clienteE@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 90 },
    { clientEmail: 'clienteG@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 0 },
    { clientEmail: 'clienteG@test.com', amount: 399, paymentMethod: 'mercadopago', daysAgo: 30 },
    { clientEmail: 'clienteG@test.com', amount: 399, paymentMethod: 'local', daysAgo: 60, admin: true },
  ];

  let txCount = 0;
  for (const tx of memTxSeeds) {
    const client = getClient(tx.clientEmail);
    if (!client) continue;
    const mem = membershipDocs.find((m: any) => m.userId.toString() === client._id.toString());
    if (!mem) continue;

    const txDate = new Date(Date.now() - (tx.daysAgo ?? 0) * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(txDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(txDate); endOfDay.setHours(23, 59, 59, 999);

    const existingTx = await MembershipTransactionModel.findOne({
      membershipId: mem._id,
      amount: tx.amount,
      paymentMethod: tx.paymentMethod,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    if (existingTx) continue;
    await (MembershipTransactionModel as any).create({
      userId: client._id,
      membershipId: mem._id,
      amount: tx.amount,
      paymentMethod: tx.paymentMethod,
      createdBy: tx.admin ? 'admin' : 'client',
      createdAt: txDate,
      updatedAt: txDate,
    });
    txCount++;
  }
  console.log(`[Seed] ${txCount} transacciones de membresía creadas`);

  let mpCount = 0;
  for (const tx of memTxSeeds) {
    if (tx.paymentMethod !== 'mercadopago') continue;
    const client = getClient(tx.clientEmail);
    if (!client) continue;
    const mem = membershipDocs.find((m: any) => m.userId.toString() === client._id.toString());
    if (!mem) continue;

    const txDate = new Date(Date.now() - (tx.daysAgo ?? 0) * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(txDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(txDate); endOfDay.setHours(23, 59, 59, 999);

    const existing = await PaymentModel.findOne({
      type: 'membership',
      referenceId: mem._id.toString(),
      amount: tx.amount,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    if (existing) continue;

    const mpPaymentId = `${200000000000 + mpCount}`;
    const fee = Math.round(tx.amount * 0.0609 * 100) / 100;
    await PaymentModel.create({
      type: 'membership',
      referenceId: mem._id.toString(),
      status: 'approved',
      mpPaymentId,
      amount: tx.amount,
      currency: 'UYU',
      userId: client._id,
      mpStatusDetail: 'accredited',
      mpPaymentMethodId: 'master',
      mpPaymentTypeId: 'credit_card',
      mpInstallments: 1,
      mpTotalPaidAmount: tx.amount,
      mpNetReceivedAmount: Math.round((tx.amount - fee) * 100) / 100,
      mpFeeAmount: fee,
      mpDateApproved: txDate,
      mpOperationType: 'regular_payment',
      createdAt: txDate, updatedAt: txDate,
    });
    mpCount++;
  }
  console.log(`[Seed] ${mpCount} pagos de membresía (PaymentModel) creados`);

  // Appointments with membership
  const now = new Date(); now.setHours(0, 0, 0, 0);

  const appointmentSeeds: Array<{
    client: any; barberIndex: number; dayName: string; serviceIndex: number;
    status: string; paymentMethod: string; paymentStatus: string; isPast: boolean;
    membershipLabel?: string; cancelReason?: string;
  }> = [
    { client: getClient('clienteA@test.com'), barberIndex: 0, dayName: 'monday', serviceIndex: 0, status: 'Confirmado', paymentMethod: 'memberPass', paymentStatus: 'Pagado', isPast: false },
    { client: getClient('clienteA@test.com'), barberIndex: 1, dayName: 'tuesday', serviceIndex: 1, status: 'Confirmado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: false },
    { client: getClient('clienteB@test.com'), barberIndex: 0, dayName: 'wednesday', serviceIndex: 0, status: 'Confirmado', paymentMethod: 'memberPass', paymentStatus: 'Pagado', isPast: false },
    { client: getClient('clienteC@test.com'), barberIndex: 1, dayName: 'thursday', serviceIndex: 2, status: 'Confirmado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: false },
    { client: getClient('clienteC@test.com'), barberIndex: 0, dayName: 'friday', serviceIndex: 0, status: 'Completado', paymentMethod: 'local', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteA@test.com'), barberIndex: 1, dayName: 'wednesday', serviceIndex: 0, status: 'Completado', paymentMethod: 'memberPass', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteB@test.com'), barberIndex: 0, dayName: 'tuesday', serviceIndex: 1, status: 'Cancelado', paymentMethod: 'memberPass', paymentStatus: 'Pendiente', isPast: true, cancelReason: 'Imprevisto personal' },
    { client: getClient('clienteC@test.com'), barberIndex: 1, dayName: 'friday', serviceIndex: 2, status: 'Cancelado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: true, cancelReason: 'Canceló por mensaje' },
    { client: getClient('clienteC@test.com'), barberIndex: 0, dayName: 'saturday', serviceIndex: 1, status: 'Confirmado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: false },
    { client: getClient('clienteD@test.com'), barberIndex: 0, dayName: 'tuesday', serviceIndex: 2, status: 'Completado', paymentMethod: 'online', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteE@test.com'), barberIndex: 1, dayName: 'friday', serviceIndex: 0, status: 'Completado', paymentMethod: 'online', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteF@test.com'), barberIndex: 0, dayName: 'tuesday', serviceIndex: 2, status: 'Confirmado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: false },
    { client: getClient('clienteE@test.com'), barberIndex: 0, dayName: 'thursday', serviceIndex: 3, status: 'Confirmado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: false },
    { client: getClient('clienteF@test.com'), barberIndex: 1, dayName: 'monday', serviceIndex: 1, status: 'Confirmado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: false },
    { client: getClient('clienteG@test.com'), barberIndex: 1, dayName: 'wednesday', serviceIndex: 0, status: 'Confirmado', paymentMethod: 'memberPass', paymentStatus: 'Pagado', isPast: false },
    { client: getClient('clienteA@test.com'), barberIndex: 0, dayName: 'thursday', serviceIndex: 0, status: 'Completado', paymentMethod: 'memberPass', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteB@test.com'), barberIndex: 1, dayName: 'monday', serviceIndex: 2, status: 'Completado', paymentMethod: 'local', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteD@test.com'), barberIndex: 1, dayName: 'tuesday', serviceIndex: 1, status: 'Completado', paymentMethod: 'local', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteE@test.com'), barberIndex: 0, dayName: 'wednesday', serviceIndex: 0, status: 'Completado', paymentMethod: 'local', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteF@test.com'), barberIndex: 0, dayName: 'monday', serviceIndex: 0, status: 'Completado', paymentMethod: 'local', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteF@test.com'), barberIndex: 1, dayName: 'thursday', serviceIndex: 2, status: 'Completado', paymentMethod: 'local', paymentStatus: 'Pagado', isPast: true },
    { client: getClient('clienteF@test.com'), barberIndex: 0, dayName: 'saturday', serviceIndex: 3, status: 'Cancelado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: true, cancelReason: 'Demora del barbero' },
    { client: getClient('clienteD@test.com'), barberIndex: 1, dayName: 'saturday', serviceIndex: 1, status: 'Cancelado', paymentMethod: 'local', paymentStatus: 'Pendiente', isPast: true, cancelReason: 'No pudo asistir' },
  ];

  let appointmentCount = 0;
  for (const seed of appointmentSeeds) {
    const barber = barbers[seed.barberIndex];
    if (!barber) continue;
    const svc = SEED_SERVICES[seed.serviceIndex];
    const getDateFn = seed.isPast
      ? () => getPastDate(now, seed.dayName)
      : () => getFutureDate(now, seed.dayName);
    const slot = findSlot(barber, seed.dayName, svc.duration, getDateFn);
    if (!slot) continue;

    const existing = await AppointmentModel.findOne({ barberId: barber._id, date: slot.dateStr, startTime: slot.startTime });
    if (existing) continue;

    const baseFields: any = {
      barberId: barber._id, clientId: seed.client._id,
      clientName: seed.client.name, clientLastname: seed.client.lastname,
      clientPhone: seed.client.phone, clientEmail: seed.client.email,
      serviceId: svc.id, serviceName: svc.name, servicePrice: svc.price,
      serviceDuration: svc.duration, date: slot.dateStr,
      startTime: slot.startTime, endTime: slot.endTime,
      paymentStatus: seed.paymentStatus, paymentMethod: seed.paymentMethod,
      createdBy: { type: 'registered', userId: seed.client._id.toString() },
      statusHistory: [{ status: seed.status, timestamp: new Date(), actor: 'system' }],
    };

    if (seed.status === 'Cancelado') {
      baseFields.status = 'Cancelado';
      baseFields.cancelReason = seed.cancelReason;
      baseFields.cancelledAt = new Date();
      baseFields.cancelledBy = seed.client.email;
    } else {
      baseFields.status = seed.status;
    }

    const createdApt = await AppointmentModel.create(baseFields);

    if (seed.paymentMethod === 'online' && seed.paymentStatus === 'Pagado') {
      const servicePrice = svc.price;
      const feeRate = 0.0609;
      const fee = Math.round(servicePrice * feeRate * 100) / 100;
      const net = Math.round((servicePrice - fee) * 100) / 100;
      await PaymentModel.create({
        type: 'appointment',
        referenceId: createdApt._id.toString(),
        status: 'approved',
        mpPaymentId: `${200000000000 + appointmentCount}`,
        amount: servicePrice,
        currency: 'UYU',
        userId: seed.client._id,
        mpStatusDetail: 'accredited',
        mpPaymentMethodId: appointmentCount % 2 === 0 ? 'visa' : 'master',
        mpPaymentTypeId: 'credit_card',
        mpInstallments: 1,
        mpTotalPaidAmount: servicePrice,
        mpNetReceivedAmount: net,
        mpFeeAmount: fee,
        mpCardLastFourDigits: appointmentCount % 2 === 0 ? '3704' : '0604',
        mpCardIssuerId: appointmentCount % 2 === 0 ? '1081' : '1082',
        mpDateApproved: new Date(),
        mpOperationType: 'regular_payment',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const incCoupon = seed.paymentMethod === 'memberPass' && seed.status !== 'Cancelado';
    if (incCoupon) {
      const mem = await MembershipModel.findOne({ userId: seed.client._id, status: 'active' });
      if (mem) {
        await MembershipModel.findByIdAndUpdate(mem._id, { $inc: { couponsUsed: 1 } });
      }
    }

    appointmentCount++;
  }

  console.log(`[Seed] ${appointmentCount} turnos con membresía creados`);

  // Crear turnos online fijos con pagos MP para testeo del panel admin
  const barberCarlos = barbers[0];
  const barberMartin = barbers[1];
  if (barberCarlos && barberMartin) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const pastTue = new Date(today); pastTue.setDate(today.getDate() - ((today.getDay() + 5) % 7));
    const pastFri = new Date(today); pastFri.setDate(today.getDate() - ((today.getDay() + 2) % 7));
    const dateStr = (d: Date) => d.toISOString().split('T')[0];

    const onlineSeeds = [
      { barber: barberCarlos, client: getClient('clienteD@test.com'), date: dateStr(pastTue), startTime: '15:00', endTime: '15:30', service: SEED_SERVICES[2], price: 250 },
      { barber: barberMartin, client: getClient('clienteE@test.com'), date: dateStr(pastFri), startTime: '11:00', endTime: '11:30', service: SEED_SERVICES[0], price: 490 },
    ];

    let onlineAptCount = 0;
    for (const s of onlineSeeds) {
      if (!s.client) continue;
      const existing = await AppointmentModel.findOne({ barberId: s.barber._id, date: s.date, startTime: s.startTime });
      if (existing) continue;
      const apt = await AppointmentModel.create({
        barberId: s.barber._id, clientId: s.client._id,
        clientName: s.client.name, clientLastname: s.client.lastname,
        clientPhone: s.client.phone, clientEmail: s.client.email,
        serviceId: s.service.id, serviceName: s.service.name, servicePrice: s.price,
        serviceDuration: 30, date: s.date,
        startTime: s.startTime, endTime: s.endTime,
        status: 'Completado', paymentStatus: 'Pagado', paymentMethod: 'online',
        createdBy: { type: 'registered', userId: s.client._id.toString() },
        statusHistory: [{ status: 'Completado', timestamp: new Date(), actor: 'system' }],
      });

      const feeRate = 0.0609;
      const fee = Math.round(s.price * feeRate * 100) / 100;
      const net = Math.round((s.price - fee) * 100) / 100;
      await PaymentModel.create({
        type: 'appointment', referenceId: apt._id.toString(), status: 'approved',
        mpPaymentId: `${200000000000 + onlineAptCount}`, amount: s.price, currency: 'UYU',
        userId: s.client._id, mpStatusDetail: 'accredited',
        mpPaymentMethodId: onlineAptCount % 2 === 0 ? 'visa' : 'master',
        mpPaymentTypeId: 'credit_card', mpInstallments: 1,
        mpTotalPaidAmount: s.price, mpNetReceivedAmount: net, mpFeeAmount: fee,
        mpCardLastFourDigits: onlineAptCount % 2 === 0 ? '3704' : '0604',
        mpCardIssuerId: onlineAptCount % 2 === 0 ? '1081' : '1082',
        mpDateApproved: new Date(), mpOperationType: 'regular_payment',
        createdAt: new Date(), updatedAt: new Date(),
      });
      onlineAptCount++;
    }
    if (onlineAptCount > 0) console.log(`[Seed] ${onlineAptCount} turnos online con pago MP creados`);
  }

  return { clientDocs, barbers };
}

// ── 5. Historical Analytics Appointments ────────────────────

const ANALYTICS_BARBERS = [
  { email: 'seed-carlos@elitecut.com', name: 'Carlos', lastname: 'Mendoza' },
  { email: 'seed-pedro@elitecut.com', name: 'Pedro', lastname: 'Giménez' },
  { email: 'seed-martin@elitecut.com', name: 'Martín', lastname: 'Ortiz' },
];

const ANALYTICS_CLIENTS = [
  { name: 'Sofía', lastname: 'García', email: 'sofia.garcia@email.com', phone: '099100001' },
  { name: 'Mateo', lastname: 'Rodríguez', email: 'mateo.rodriguez@email.com', phone: '099100002' },
  { name: 'Isabella', lastname: 'López', email: 'isabella.lopez@email.com', phone: '099100003' },
  { name: 'Benjamín', lastname: 'Martínez', email: 'benjamin.martinez@email.com', phone: '099100004' },
  { name: 'Valentina', lastname: 'González', email: 'valentina.gonzalez@email.com', phone: '099100005' },
  { name: 'Santiago', lastname: 'Pérez', email: 'santiago.perez@email.com', phone: '099100006' },
];

const ANONYMOUS_PROFILES = [
  { name: 'Juan', lastname: 'García', phone: '099300001' }, { name: 'Carlos', lastname: 'Rodríguez', phone: '099300002' },
  { name: 'Miguel', lastname: 'Martínez', phone: '099300003' }, { name: 'Diego', lastname: 'López', phone: '099300004' },
  { name: 'Alejandro', lastname: 'González', phone: '099300005' }, { name: 'Facundo', lastname: 'Pérez', phone: '099300006' },
  { name: 'Lautaro', lastname: 'Silva', phone: '099300007' }, { name: 'Emilia', lastname: 'Díaz', phone: '099300008' },
  { name: 'Valentina', lastname: 'Torres', phone: '099300009' }, { name: 'Camila', lastname: 'Romero', phone: '099300010' },
  { name: 'Lucía', lastname: 'Álvarez', phone: '099300011' }, { name: 'Martina', lastname: 'Moreno', phone: '099300012' },
  { name: 'Florencia', lastname: 'Muñoz', phone: '099300013' }, { name: 'Agustina', lastname: 'Rojas', phone: '099300014' },
  { name: 'Julieta', lastname: 'Castillo', phone: '099300015' }, { name: 'Tomás', lastname: 'Morales', phone: '099300016' },
  { name: 'Nicolás', lastname: 'Ortiz', phone: '099300017' }, { name: 'Gabriel', lastname: 'Núñez', phone: '099300018' },
  { name: 'Fernando', lastname: 'Sosa', phone: '099300019' }, { name: 'Ignacio', lastname: 'Reyes', phone: '099300020' },
  { name: 'Renata', lastname: 'Castro', phone: '099300021' }, { name: 'Antonella', lastname: 'Pereira', phone: '099300022' },
  { name: 'Malena', lastname: 'Vázquez', phone: '099300023' }, { name: 'Selena', lastname: 'Acosta', phone: '099300024' },
  { name: 'Bruno', lastname: 'Medina', phone: '099300025' }, { name: 'Lucas', lastname: 'Suárez', phone: '099300026' },
  { name: 'Gonzalo', lastname: 'Herrera', phone: '099300027' }, { name: 'Mateo', lastname: 'Guerrero', phone: '099300028' },
  { name: 'Andrés', lastname: 'Benítez', phone: '099300029' }, { name: 'Sergio', lastname: 'Vega', phone: '099300030' },
  { name: 'Pablo', lastname: 'Molina', phone: '099300031' }, { name: 'Martín', lastname: 'Cabrera', phone: '099300032' },
  { name: 'Hugo', lastname: 'Rivera', phone: '099300033' }, { name: 'Federico', lastname: 'Campos', phone: '099300034' },
  { name: 'Leandro', lastname: 'Ferreira', phone: '099300035' }, { name: 'Ramiro', lastname: 'Delgado', phone: '099300036' },
  { name: 'Brian', lastname: 'Pena', phone: '099300037' }, { name: 'Franco', lastname: 'Miranda', phone: '099300038' },
  { name: 'Alan', lastname: 'Sandoval', phone: '099300039' }, { name: 'Joaquín', lastname: 'Cruz', phone: '099300040' },
  { name: 'Matías', lastname: 'Godoy', phone: '099300041' }, { name: 'Thiago', lastname: 'Olivera', phone: '099300042' },
  { name: 'Luciana', lastname: 'Méndez', phone: '099300043' }, { name: 'Candela', lastname: 'Caceres', phone: '099300044' },
  { name: 'Julián', lastname: 'Santos', phone: '099300045' },
];

type RawTurno = { barberIdx: number; date: string; startTime: string; endTime: string; status: string; registeredClientIdx?: number };

const TURNOS_HISTORICOS: RawTurno[] = [
  { barberIdx: 0, date: '2026-01-05', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-05', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-07', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 1, date: '2026-01-07', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-09', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-01-19', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 1 },
  { barberIdx: 2, date: '2026-01-19', startTime: '10:00', endTime: '10:45', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '10:00', endTime: '10:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-29', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-02-02', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-02', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 1, date: '2026-02-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-04', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-09', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 3 },
  { barberIdx: 0, date: '2026-02-09', startTime: '10:00', endTime: '10:50', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-13', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-02-13', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-16', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-16', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '10:00', endTime: '10:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '11:00', endTime: '11:40', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-20', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-02-23', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-23', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 4 },
  { barberIdx: 0, date: '2026-02-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-25', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-02', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 5 },
  { barberIdx: 0, date: '2026-03-02', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-02', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-04', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-06', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-09', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-09', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 0, date: '2026-03-09', startTime: '11:00', endTime: '11:45', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-18', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-18', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 1 },
  { barberIdx: 1, date: '2026-03-18', startTime: '11:00', endTime: '11:30', status: 'NoShow' },
  { barberIdx: 1, date: '2026-03-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-20', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-20', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-23', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-23', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 1, date: '2026-03-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-27', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 2, date: '2026-03-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-30', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-30', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-01', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-06', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 3 },
  { barberIdx: 2, date: '2026-04-06', startTime: '11:00', endTime: '11:30', status: 'Confirmado' },
  { barberIdx: 0, date: '2026-04-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-10', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-10', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 4 },
  { barberIdx: 0, date: '2026-04-13', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-17', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-17', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-20', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-04-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-24', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-27', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 3 },
  { barberIdx: 0, date: '2026-04-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-27', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-29', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 5 },
  { barberIdx: 0, date: '2026-05-04', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-08', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-05-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-11', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-11', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-13', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 2, date: '2026-05-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-15', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 0, date: '2026-05-18', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 1 },
  { barberIdx: 0, date: '2026-05-18', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '16:00', endTime: '16:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-05-20', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-22', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 2, date: '2026-05-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-25', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 1, date: '2026-05-27', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '11:00', endTime: '11:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-03', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '11:00', endTime: '11:30', status: 'Completado', registeredClientIdx: 5 },
  { barberIdx: 0, date: '2026-06-08', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '16:00', endTime: '16:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-10', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-10', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-06-10', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-06-12', startTime: '10:00', endTime: '10:35', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-12', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '09:30', endTime: '10:00', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '10:00', endTime: '10:45', status: 'Confirmado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '11:00', endTime: '11:45', status: 'NoShow' },
  { barberIdx: 0, date: '2026-06-15', startTime: '12:00', endTime: '12:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '14:00', endTime: '14:20', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-17', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-17', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 0, date: '2026-06-20', startTime: '09:00', endTime: '10:00', status: 'Completado', registeredClientIdx: 4 },
  { barberIdx: 0, date: '2026-06-20', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 1, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 2, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 3 },
  { barberIdx: 0, date: '2026-06-24', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '15:00', endTime: '15:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '16:00', endTime: '16:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-29', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-29', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-29', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 5 },
  { barberIdx: 1, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-15', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 4 },
  { barberIdx: 1, date: '2026-07-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
];

// ── 6. Products ────────────────────────────────────────────

const PRODUCTS_SEED = [
  { name: 'Cera Modeladora', description: 'Fijación media, acabado natural. Ideal para peinados casuales.', price: 450, stock: 30, category: 'Ceras y Pomadas', imageUrl: 'https://placehold.co/400x400?text=Cera' },
  { name: 'Pomada Capilar', description: 'Fijación fuerte con brillo. Mantiene el peinado todo el día.', price: 520, stock: 25, category: 'Ceras y Pomadas', imageUrl: 'https://placehold.co/400x400?text=Pomada' },
  { name: 'Shampoo Profesional', description: 'Limpieza profunda sin resecar. pH balanceado para uso diario.', price: 380, stock: 40, category: 'Cuidado Capilar', imageUrl: 'https://placehold.co/400x400?text=Shampoo' },
  { name: 'Acondicionador', description: 'Hidratación intensa. Desenreda y deja el cabello suave.', price: 380, stock: 35, category: 'Cuidado Capilar', imageUrl: 'https://placehold.co/400x400?text=Acondicionador' },
  { name: 'Aceite para Barba', description: 'Acondiciona y suaviza la barba. Aroma a sándalo y cítricos.', price: 320, stock: 20, category: 'Barba', imageUrl: 'https://placehold.co/400x400?text=Aceite+Barba' },
  { name: 'Bálsamo para Barba', description: 'Hidrata y da forma a la barba. Controla el encrespamiento.', price: 350, stock: 18, category: 'Barba', imageUrl: 'https://placehold.co/400x400?text=Balsamo+Barba' },
  { name: 'Peine de Madera', description: 'Peine de madera de haya. Antiestático, ideal para barba y cabello.', price: 250, stock: 50, category: 'Accesorios', imageUrl: 'https://placehold.co/400x400?text=Peine' },
  { name: 'Cepillo Paddle', description: 'Cepillo profesional con cerdas mixtas. Para desenredar y dar brillo.', price: 420, stock: 15, category: 'Accesorios', imageUrl: 'https://placehold.co/400x400?text=Cepillo' },
  { name: 'Gel Fijador', description: 'Fijación extra fuerte. Mantiene el peinado incluso con humedad.', price: 300, stock: 30, category: 'Ceras y Pomadas', imageUrl: 'https://placehold.co/400x400?text=Gel' },
  { name: 'Espray Texturizador', description: 'Agrega volumen y textura. Ideal para cabello fino.', price: 480, stock: 12, category: 'Cuidado Capilar', imageUrl: 'https://placehold.co/400x400?text=Espray' },
  { name: 'Kit de Afeitado', description: 'Incluye brocha, jabón y bálsamo post-afeitado. Para una afeitada clásica.', price: 890, stock: 8, category: 'Barba', imageUrl: 'https://placehold.co/400x400?text=Kit+Afeitado' },
  { name: 'Toalla de Barbero', description: 'Toalla de algodón 100% de alta absorción. Profesional.', price: 290, stock: 25, category: 'Accesorios', imageUrl: 'https://placehold.co/400x400?text=Toalla' },
];

async function seedProducts(): Promise<mongoose.Types.ObjectId[]> {
  const productIds: mongoose.Types.ObjectId[] = [];
  for (const p of PRODUCTS_SEED) {
    const existing = await ProductModel.findOne({ name: p.name });
    if (existing) { productIds.push(existing._id as mongoose.Types.ObjectId); continue; }
    const doc = await ProductModel.create(p);
    productIds.push(doc._id as mongoose.Types.ObjectId);
  }
  console.log(`[Seed] ${productIds.length} productos creados`);
  return productIds;
}

// ── 7. Orders + Payments ───────────────────────────────────

async function seedOrdersAndPayments(productIds: mongoose.Types.ObjectId[], clientDocs: any[]): Promise<void> {
  const productData = await ProductModel.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map<string, any>();
  for (const p of productData) {
    productMap.set((p as any)._id.toString(), p);
  }

  const getProduct = (index: number) => {
    const id = productIds[index]?.toString();
    return id ? productMap.get(id) : null;
  };

  const orderSeeds: Array<{
    clientEmail: string; productIndices: number[]; quantities: number[]; status: string; daysAgo: number; paymentStatus?: string;
  }> = [
    { clientEmail: 'clienteA@test.com', productIndices: [0, 3], quantities: [2, 1], status: 'paid', daysAgo: 5, paymentStatus: 'approved' },
    { clientEmail: 'clienteB@test.com', productIndices: [4, 6], quantities: [1, 1], status: 'paid', daysAgo: 10, paymentStatus: 'approved' },
    { clientEmail: 'clienteC@test.com', productIndices: [1], quantities: [3], status: 'paid', daysAgo: 3, paymentStatus: 'approved' },
    { clientEmail: 'clienteA@test.com', productIndices: [8, 9], quantities: [1, 1], status: 'delivered', daysAgo: 15, paymentStatus: 'approved' },
    { clientEmail: 'clienteE@test.com', productIndices: [10], quantities: [1], status: 'pending', daysAgo: 0 },
    { clientEmail: 'clienteF@test.com', productIndices: [2, 5], quantities: [2, 1], status: 'cancelled', daysAgo: 7 },
    { clientEmail: 'clienteB@test.com', productIndices: [7, 11], quantities: [1, 2], status: 'delivered', daysAgo: 20, paymentStatus: 'approved' },
    { clientEmail: 'clienteG@test.com', productIndices: [0, 1, 2], quantities: [1, 1, 1], status: 'paid', daysAgo: 2, paymentStatus: 'approved' },
    { clientEmail: 'clienteA@test.com', productIndices: [3, 5], quantities: [2, 1], status: 'refunded', daysAgo: 40, paymentStatus: 'approved' },
    { clientEmail: 'clienteA@test.com', productIndices: [7], quantities: [1], status: 'disputed', daysAgo: 12, paymentStatus: 'approved' },
    { clientEmail: 'clienteB@test.com', productIndices: [0, 4, 9], quantities: [1, 1, 1], status: 'paid', daysAgo: 25, paymentStatus: 'approved' },
    { clientEmail: 'clienteB@test.com', productIndices: [6, 8], quantities: [2, 1], status: 'cancelled', daysAgo: 18 },
    { clientEmail: 'clienteC@test.com', productIndices: [3, 7, 10], quantities: [1, 2, 1], status: 'delivered', daysAgo: 35, paymentStatus: 'approved' },
    { clientEmail: 'clienteC@test.com', productIndices: [0, 2, 4], quantities: [1, 1, 2], status: 'paid', daysAgo: 8, paymentStatus: 'approved' },
    { clientEmail: 'clienteD@test.com', productIndices: [8, 9], quantities: [1, 1], status: 'paid', daysAgo: 22, paymentStatus: 'approved' },
    { clientEmail: 'clienteD@test.com', productIndices: [1, 5], quantities: [2, 1], status: 'refunded', daysAgo: 50, paymentStatus: 'approved' },
    { clientEmail: 'clienteE@test.com', productIndices: [0, 6, 11], quantities: [1, 2, 1], status: 'delivered', daysAgo: 28, paymentStatus: 'approved' },
    { clientEmail: 'clienteE@test.com', productIndices: [2], quantities: [4], status: 'paid', daysAgo: 6, paymentStatus: 'approved' },
    { clientEmail: 'clienteF@test.com', productIndices: [3, 7], quantities: [1, 1], status: 'paid', daysAgo: 14, paymentStatus: 'approved' },
    { clientEmail: 'clienteF@test.com', productIndices: [9, 10], quantities: [1, 2], status: 'cancelled', daysAgo: 45 },
    { clientEmail: 'clienteG@test.com', productIndices: [4, 5, 6], quantities: [1, 1, 1], status: 'delivered', daysAgo: 16, paymentStatus: 'approved' },
    { clientEmail: 'clienteG@test.com', productIndices: [8], quantities: [3], status: 'pending', daysAgo: 0 },
  ];

  let orderCount = 0;
  for (const seed of orderSeeds) {
    const client = clientDocs.find((c: any) => (c.email || '').toLowerCase() === seed.clientEmail.toLowerCase());
      if (!client) continue;

    const items: { productId: string; name: string; price: number; quantity: number }[] = [];
    for (let i = 0; i < seed.productIndices.length; i++) {
      const prod = getProduct(seed.productIndices[i]);
      if (prod) {
        items.push({ productId: (prod as any)._id.toString(), name: prod.name, price: prod.price, quantity: seed.quantities[i] || 1 });
      }
    }

    if (items.length === 0) continue;
    const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    const createdAt = new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000);
    const order = await OrderModel.create({
      userId: client._id.toString(), items, total, status: seed.status, createdAt, updatedAt: createdAt,
    });

    if (seed.paymentStatus) {
      const paymentMethods = [
        { id: 'master', type: 'credit_card', lastFour: '0604', issuer: '1082' },
        { id: 'visa', type: 'credit_card', lastFour: '3704', issuer: '1081' },
        { id: 'master', type: 'debit_card', lastFour: '3304', issuer: '1082' },
      ];
      const pm = paymentMethods[orderCount % paymentMethods.length];
      const feeRate = 0.0609;
      const fee = Math.round(total * feeRate * 100) / 100;
      const net = Math.round((total - fee) * 100) / 100;

      await PaymentModel.create({
        type: 'product_order',
        referenceId: order._id.toString(),
        status: seed.paymentStatus,
        mpPaymentId: `${100000000000 + orderCount}`,
        amount: total,
        currency: 'UYU',
        userId: client._id,
        mpStatusDetail: seed.paymentStatus === 'approved' ? 'accredited' : 'refunded',
        mpPaymentMethodId: pm.id,
        mpPaymentTypeId: pm.type,
        mpInstallments: orderCount % 3 === 0 ? 3 : 1,
        mpTotalPaidAmount: total,
        mpNetReceivedAmount: net,
        mpFeeAmount: fee,
        mpCardLastFourDigits: pm.lastFour,
        mpCardIssuerId: pm.issuer,
        mpDateApproved: new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000),
        mpOperationType: 'regular_payment',
        createdAt, updatedAt: createdAt,
      });
    }

    orderCount++;
  }
  console.log(`[Seed] ${orderCount} órdenes y pagos creados`);
}

// ── 8. Seed Analytics Historical Data ───────────────────────

async function seedAnalyticsData(): Promise<void> {
  let anonymousCycle = 0;

  async function getOrCreateAnalyticsBarber(email: string, name: string, lastname: string): Promise<mongoose.Types.ObjectId> {
    const existing = await Employee.findOne({ email });
    if (existing) return existing._id as mongoose.Types.ObjectId;
    const hash = await bcrypt.hash('test123', 10);
    const emptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
    const workDay = (start: string, end: string) => ({ startTime: start, endTime: end, breaks: [] });
    const barber = await Employee.create({
      email, password: hash, name, lastname,
      phone: `099${Math.floor(100000 + Math.random() * 900000)}`,
      age: 30, slotDuration: 30,
      schedule: { monday: workDay('09:00', '18:00'), tuesday: workDay('09:00', '18:00'), wednesday: workDay('09:00', '18:00'), thursday: workDay('09:00', '18:00'), friday: workDay('09:00', '18:00'), saturday: workDay('09:00', '14:00'), sunday: emptyDay() },
      isActive: true, photoUrl: null,
    });
    return barber._id as mongoose.Types.ObjectId;
  }

  async function getOrCreateAnalyticsClients(): Promise<mongoose.Types.ObjectId[]> {
    const ids: mongoose.Types.ObjectId[] = [];
    for (const profile of ANALYTICS_CLIENTS) {
      const existing = await RegisteredClient.findOne({ email: profile.email });
      if (existing) { ids.push(existing._id as mongoose.Types.ObjectId); continue; }
      const client = await RegisteredClient.create({
        email: profile.email, name: profile.name, lastname: profile.lastname,
        phone: profile.phone, password: 'not-used', authProvider: 'local',
      });
      ids.push(client._id as mongoose.Types.ObjectId);
    }
    return ids;
  }

  const barberIds = await Promise.all(ANALYTICS_BARBERS.map(b => getOrCreateAnalyticsBarber(b.email, b.name, b.lastname)));
  const registeredClientIds = await getOrCreateAnalyticsClients();

  let count = 0;
  for (const t of TURNOS_HISTORICOS) {
    const serviceIdx = SERVICE_CYCLE[count % SERVICE_CYCLE.length];
    const service = SEED_SERVICES[serviceIdx];

    let clientName: string, clientLastname: string, clientPhone: string | undefined, clientId: mongoose.Types.ObjectId | undefined;

    if (t.registeredClientIdx !== undefined) {
      const profile = ANALYTICS_CLIENTS[t.registeredClientIdx];
      clientName = profile.name; clientLastname = profile.lastname;
      clientPhone = profile.phone; clientId = registeredClientIds[t.registeredClientIdx];
    } else {
      const profile = ANONYMOUS_PROFILES[anonymousCycle++ % ANONYMOUS_PROFILES.length];
      clientName = profile.name; clientLastname = profile.lastname; clientPhone = profile.phone;
    }

    const existing = await AppointmentModel.findOne({
      barberId: barberIds[t.barberIdx], date: t.date, startTime: t.startTime,
    });
    if (existing) continue;

    await AppointmentModel.create({
      barberId: barberIds[t.barberIdx], clientName, clientLastname, clientId, clientPhone,
      serviceId: service.id, serviceName: service.name, servicePrice: service.price,
      serviceDuration: service.duration, date: t.date, startTime: t.startTime, endTime: t.endTime,
      status: t.status, paymentStatus: t.status === 'Completado' ? 'Pagado' : 'Pendiente',
      paymentMethod: 'local', cancelReason: t.status === 'Cancelado' ? 'Cliente no asistió' : undefined,
      cancelledAt: t.status === 'Cancelado' ? new Date() : undefined,
      cancelledBy: t.status === 'Cancelado' ? 'system' : undefined,
      statusHistory: [{ status: t.status, timestamp: new Date(), actor: 'system' }],
    });
    count++;
  }

  console.log(`[Seed] ${count} turnos históricos de analytics creados (Ene-Jul 2026)`);
}

// ── Main ────────────────────────────────────────────────────

export async function runFullSeed(): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  SEED COMPLETO');
  console.log('═══════════════════════════════════════\n');

  await seedAdminTable();
  await seedBarbersTable();
  await seedServicesTable();

  const barbers = await Employee.find({ kind: 'Empleado' }).lean();
  const { clientDocs } = await seedClientsMembershipsAndAppointments(barbers);

  const productIds = await seedProducts();
  await seedOrdersAndPayments(productIds, clientDocs);

  await seedAnalyticsData();

  console.log('\n═══════════════════════════════════════');
  console.log('  SEED COMPLETADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════\n');
  console.log('Datos creados:');
  console.log('  - 1 admin');
  console.log(`  - ${barbers.length} barberos`);
  console.log('  - 4 servicios');
  console.log(`  - ${CLIENTS.length} clientes registrados con avatar`);
  console.log('  - 5 membresías (activas, expirada, cupones agotados)');
  console.log('  - 21 turnos con membresía');
  console.log(`  - ${PRODUCTS_SEED.length} productos`);
  console.log('  - Órdenes de productos con pagos');
  console.log('  - ~287 turnos históricos para analytics (Ene-Jul 2026)');
  console.log('');
}

if (require.main === module) {
  const { connectDB } = require('../config/db');
  (async () => {
    await connectDB();
    await runFullSeed();
    process.exit(0);
  })().catch(err => { console.error(err); process.exit(1); });
}
