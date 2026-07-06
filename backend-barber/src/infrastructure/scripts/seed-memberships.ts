import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import { MembershipModel } from '../repositories/mongodb/models/membership.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';
import type { IEmployeeRaw } from '../repositories/mongodb/models/barber.model';

const SEED_SERVICES = [
  { id: 'svc-1', name: 'Corte de pelo', price: 490, duration: 50 },
  { id: 'svc-2', name: 'Corte a máquina', price: 350, duration: 30 },
  { id: 'svc-3', name: 'Barba', price: 250, duration: 25 },
  { id: 'svc-4', name: 'Promo x2', price: 900, duration: 70 },
];

interface ClientSeed {
  email: string;
  name: string;
  lastname: string;
  phone: string;
}

const CLIENTS: ClientSeed[] = [
  { email: 'clienteA@test.com', name: 'Ana', lastname: 'Martínez', phone: '099111001' },
  { email: 'clienteB@test.com', name: 'Bruno', lastname: 'Rodríguez', phone: '099111002' },
  { email: 'clienteC@test.com', name: 'Carmen', lastname: 'López', phone: '099111003' },
];

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

function findSlot(
  barber: IEmployeeRaw,
  dayName: string,
  serviceDuration: number,
  getDate: () => Date,
): { dateStr: string; startTime: string; endTime: string } | null {
  const scheduleDay = (barber.schedule as Record<string, { startTime: string | null; endTime: string | null; breaks: { startTime: string; endTime: string }[] }>)[dayName];
  if (!scheduleDay || !scheduleDay.startTime || !scheduleDay.endTime) return null;

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

async function seed() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barbers = await Employee.find({ kind: 'Empleado' }).lean();
  if (barbers.length === 0) {
    console.error('No hay barberos. Corré primero el seed de barberos.');
    process.exit(1);
  }

  const clientDocs: mongoose.Document[] = [];

  for (const c of CLIENTS) {
    const existing = await RegisteredClient.findOne({ email: c.email });
    if (existing) {
      console.log(`Cliente ${c.email} ya existe — omitido`);
      clientDocs.push(existing);
      continue;
    }

    const hash = await bcrypt.hash('Test1234', 10);
    const doc = await RegisteredClient.create({
      name: c.name,
      lastname: c.lastname,
      phone: c.phone,
      email: c.email,
      password: hash,
      authProvider: 'local',
    });
    console.log(`Cliente ${c.email} creado`);
    clientDocs.push(doc);
  }

  const clientA = clientDocs.find((d) => ((d as any).email ?? '').toLowerCase() === 'clientea@test.com')!;
  const clientB = clientDocs.find((d) => ((d as any).email ?? '').toLowerCase() === 'clienteb@test.com')!;
  const clientC = clientDocs.find((d) => ((d as any).email ?? '').toLowerCase() === 'clientec@test.com')!;

  const membershipsData = [
    { client: clientA, couponsUsed: 0, label: 'Cliente A — 4 cupones disponibles' },
    { client: clientB, couponsUsed: 2, label: 'Cliente B — 2 cupones usados, 2 restantes' },
  ];

  const membershipDocs: Array<{ doc: mongoose.Document; label: string }> = [];

  for (const m of membershipsData) {
    const clientId = m.client._id;
    const existing = await MembershipModel.findOne({
      userId: clientId,
      status: 'active',
      endDate: { $gte: new Date() },
    });
    if (existing) {
      console.log(`Membresía para ${(m.client as any).email} ya existe — omitido`);
      membershipDocs.push({ doc: existing, label: m.label });
      continue;
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    const doc = await MembershipModel.create({
      userId: clientId,
      status: 'active',
      startDate: now,
      endDate,
      couponsTotal: 4,
      couponsUsed: m.couponsUsed,
      productDiscount: 10,
      createdBy: 'admin',
    });
    console.log(`Membresía creada: ${m.label}`);
    membershipDocs.push({ doc, label: m.label });
  }

  const membershipA = membershipDocs.find((m) => (m.doc as any).userId.toString() === clientA._id.toString())!;
  const membershipB = membershipDocs.find((m) => (m.doc as any).userId.toString() === clientB._id.toString())!;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  function getFutureDate(dayName: string): Date {
    const dayIndex = dayNames.indexOf(dayName);
    return getNextWeekday(now, dayIndex);
  }

  function getPastDate(dayName: string): Date {
    const dayIndex = dayNames.indexOf(dayName);
    const prev = getPreviousWeekday(now, dayIndex);
    if (now.getDay() > dayIndex) prev.setDate(prev.getDate() - 7);
    return prev;
  }

  const appointmentSeeds: Array<{
    client: mongoose.Document;
    barberIndex: number;
    dayName: string;
    serviceIndex: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    isPast: boolean;
    membership?: { doc: mongoose.Document; label: string };
    cancelReason?: string;
  }> = [
    {
      client: clientA,
      barberIndex: 0,
      dayName: 'monday',
      serviceIndex: 0,
      status: 'Confirmado',
      paymentMethod: 'memberPass',
      paymentStatus: 'Pagado',
      isPast: false,
      membership: membershipA,
    },
    {
      client: clientA,
      barberIndex: 1,
      dayName: 'tuesday',
      serviceIndex: 1,
      status: 'Confirmado',
      paymentMethod: 'local',
      paymentStatus: 'Pendiente',
      isPast: false,
    },
    {
      client: clientB,
      barberIndex: 0,
      dayName: 'wednesday',
      serviceIndex: 0,
      status: 'Confirmado',
      paymentMethod: 'memberPass',
      paymentStatus: 'Pagado',
      isPast: false,
      membership: membershipB,
    },
    {
      client: clientC,
      barberIndex: 1,
      dayName: 'thursday',
      serviceIndex: 2,
      status: 'Confirmado',
      paymentMethod: 'local',
      paymentStatus: 'Pendiente',
      isPast: false,
    },
    {
      client: clientC,
      barberIndex: 0,
      dayName: 'friday',
      serviceIndex: 0,
      status: 'Completado',
      paymentMethod: 'local',
      paymentStatus: 'Pagado',
      isPast: true,
    },
    {
      client: clientA,
      barberIndex: 1,
      dayName: 'wednesday',
      serviceIndex: 0,
      status: 'Completado',
      paymentMethod: 'memberPass',
      paymentStatus: 'Pagado',
      isPast: true,
      membership: membershipA,
    },
    {
      client: clientB,
      barberIndex: 0,
      dayName: 'tuesday',
      serviceIndex: 1,
      status: 'Cancelado',
      paymentMethod: 'memberPass',
      paymentStatus: 'Pendiente',
      isPast: true,
      membership: membershipB,
      cancelReason: 'Imprevisto personal',
    },
    {
      client: clientC,
      barberIndex: 1,
      dayName: 'friday',
      serviceIndex: 2,
      status: 'Cancelado',
      paymentMethod: 'local',
      paymentStatus: 'Pendiente',
      isPast: true,
      cancelReason: 'Canceló por mensaje de texto',
    },
    {
      client: clientC,
      barberIndex: 0,
      dayName: 'saturday',
      serviceIndex: 1,
      status: 'Confirmado',
      paymentMethod: 'local',
      paymentStatus: 'Pendiente',
      isPast: false,
    },
  ];

  for (const seed of appointmentSeeds) {
    const barber = barbers[seed.barberIndex];
    const svc = SEED_SERVICES[seed.serviceIndex];
    const getDate = seed.isPast ? () => getPastDate(seed.dayName) : () => getFutureDate(seed.dayName);
    const slot = findSlot(barber as unknown as IEmployeeRaw, seed.dayName, svc.duration, getDate);
    if (!slot) {
      console.log(`  No hay slot para ${(seed.client as any).email} con ${barber.name} el ${seed.dayName} — saltando`);
      continue;
    }

    const existingAppt = await AppointmentModel.findOne({
      barberId: barber._id,
      date: slot.dateStr,
      startTime: slot.startTime,
    });
    if (existingAppt) {
      console.log(`  Turno el ${slot.dateStr} a las ${slot.startTime} ya existe — saltando`);
      continue;
    }

    const commonFields = {
      barberId: barber._id,
      clientId: seed.client._id,
      clientName: (seed.client as any).name,
      clientLastname: (seed.client as any).lastname,
      clientPhone: (seed.client as any).phone,
      clientEmail: (seed.client as any).email,
      serviceId: svc.id,
      serviceName: svc.name,
      servicePrice: svc.price,
      serviceDuration: svc.duration,
      date: slot.dateStr,
      startTime: slot.startTime,
      endTime: slot.endTime,
      paymentStatus: seed.paymentStatus,
      paymentMethod: seed.paymentMethod,
      createdBy: { type: 'registered', userId: seed.client._id.toString() },
    };

    if (seed.status === 'Cancelado') {
      await AppointmentModel.create({
        ...commonFields,
        status: 'Cancelado',
        cancelReason: seed.cancelReason,
        cancelledAt: new Date(),
        cancelledBy: (seed.client as any).email,
        statusHistory: [{ status: 'Cancelado', timestamp: new Date(), actor: 'system' }],
      });
    } else {
      await AppointmentModel.create({
        ...commonFields,
        status: seed.status,
        statusHistory: [{ status: seed.status, timestamp: new Date(), actor: 'system' }],
      });
    }

    const incCoupon = seed.membership && seed.status !== 'Cancelado';
    if (incCoupon) {
      const mem = seed.membership!.doc as any;
      await MembershipModel.findByIdAndUpdate(mem._id, {
        $inc: { couponsUsed: 1 },
      });
    }

    const pagoLabel = seed.paymentMethod === 'memberPass' ? 'memberPass' : 'local';
    const estadoLabel = seed.status;
    console.log(`  Turno ${pagoLabel} ${estadoLabel} para ${(seed.client as any).email} con ${barber.name} el ${slot.dateStr} a las ${slot.startTime}${incCoupon ? ' (cupón +1)' : ''}`);
  }

  console.log('\nResumen:');
  for (const c of clientDocs) {
    const email = (c as any).email;
    const mem = await MembershipModel.findOne({ userId: c._id, status: 'active' });
    const appts = await AppointmentModel.countDocuments({ clientId: c._id });
    if (mem) {
      console.log(`  ${email} — membresía activa, cupones: ${mem.couponsUsed}/${mem.couponsTotal} usados, turnos: ${appts}`);
    } else {
      console.log(`  ${email} — sin membresía, turnos: ${appts}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nSeed completado.');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
