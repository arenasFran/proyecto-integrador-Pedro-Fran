import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, Employee } from '../repositories/mongodb/models/barber.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';

const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });

const createWorkDay = (start: string, end: string, breakStart?: string, breakEnd?: string) => ({
  startTime: start,
  endTime: end,
  breaks: breakStart && breakEnd ? [{ startTime: breakStart, endTime: breakEnd }] : [],
});

const barbersSeedData = [
  {
    email: 'carlos@elitecut.com',
    password: 'barber123',
    name: 'Carlos',
    lastname: 'Gutiérrez',
    phone: '099111111',
    services: ['Corte clásico', 'Barba', 'Arreglo de puntas'],
    age: 32,
    slotDuration: 30,
    schedule: {
      monday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      tuesday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      wednesday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      thursday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      friday: createWorkDay('09:00', '18:00', '13:00', '14:00'),
      saturday: createWorkDay('09:00', '14:00'),
      sunday: createEmptyDay(),
    },
  },
  {
    email: 'martin@elitecut.com',
    password: 'barber123',
    name: 'Martín',
    lastname: 'López',
    phone: '099222222',
    services: ['Degradados', 'Corte moderno', 'Barba'],
    age: 28,
    slotDuration: 30,
    schedule: {
      monday: createEmptyDay(),
      tuesday: createWorkDay('10:00', '19:00', '14:00', '15:00'),
      wednesday: createWorkDay('10:00', '19:00', '14:00', '15:00'),
      thursday: createWorkDay('10:00', '19:00', '14:00', '15:00'),
      friday: createWorkDay('10:00', '19:00', '14:00', '15:00'),
      saturday: createWorkDay('10:00', '16:00'),
      sunday: createEmptyDay(),
    },
  },
  {
    email: 'lucia@elitecut.com',
    password: 'barber123',
    name: 'Lucía',
    lastname: 'Fernández',
    phone: '099333333',
    services: ['Corte femenino', 'Colorimetría', 'Peinado'],
    age: 26,
    slotDuration: 45,
    schedule: {
      monday: createWorkDay('08:00', '17:00', '12:00', '13:00'),
      tuesday: createWorkDay('08:00', '17:00', '12:00', '13:00'),
      wednesday: createWorkDay('08:00', '17:00', '12:00', '13:00'),
      thursday: createWorkDay('08:00', '17:00', '12:00', '13:00'),
      friday: createWorkDay('08:00', '17:00', '12:00', '13:00'),
      saturday: createEmptyDay(),
      sunday: createEmptyDay(),
    },
  },
];

export const seedAdmin = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'Santiago';
  const adminLastname = process.env.SEED_ADMIN_LASTNAME || 'Abbona';
  const adminPhone = process.env.SEED_ADMIN_PHONE || '000000000';

  if (!adminEmail || !adminPassword) {
    console.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no configurados — saltando seed de admin');
    return;
  }

  const existing = await Admin.findOne({ email: adminEmail });
  if (existing) {
    console.log('Admin ya existe — seed omitido');
    return;
  }

  const hash = await bcrypt.hash(adminPassword, 10);

  await Admin.create({
    email: adminEmail,
    password: hash,
    name: adminName,
    lastname: adminLastname,
    phone: adminPhone,
    slotDuration: 30,
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

  console.log('Admin creado con éxito');
};

export const seedBarbers = async () => {
  for (const barberData of barbersSeedData) {
    const existing = await Employee.findOne({ email: barberData.email });
    if (existing) {
      console.log(`Barbero ${barberData.name} ${barberData.lastname} ya existe — omitido`);
      continue;
    }

    const hash = await bcrypt.hash(barberData.password, 10);

    await Employee.create({
      ...barberData,
      password: hash,
      isActive: true,
      photoUrl: null,
    });

    console.log(`Barbero ${barberData.name} ${barberData.lastname} creado con éxito`);
  }
};

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

const SEED_SERVICES = [
  { id: 'svc-1', name: 'Corte de pelo', price: 490, duration: 50 },
  { id: 'svc-2', name: 'Corte a máquina', price: 350, duration: 30 },
  { id: 'svc-3', name: 'Barba', price: 250, duration: 25 },
  { id: 'svc-4', name: 'Promo x2', price: 450, duration: 70 },
];

async function seedAppointments(): Promise<void> {
  const barbers = await Employee.find({ kind: 'Empleado' });
  if (barbers.length === 0) {
    console.log('No hay barberos — saltando seed de turnos');
    return;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const seeds: Array<{
    targetDay: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    getDate: () => Date;
    serviceIndex: number;
    cancelReason?: string;
  }> = [
    {
      targetDay: 1,
      status: 'Confirmado',
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      getDate: () => getNextWeekday(now, 1),
      serviceIndex: 0,
    },
    {
      targetDay: 2,
      status: 'Confirmado',
      paymentStatus: 'Pagado',
      paymentMethod: 'local',
      getDate: () => getNextWeekday(now, 2),
      serviceIndex: 1,
    },
    {
      targetDay: 3,
      status: 'Completado',
      paymentStatus: 'Pagado',
      paymentMethod: 'local',
      getDate: () => {
        const prev = getPreviousWeekday(now, 3);
        if (now.getDay() > 3) prev.setDate(prev.getDate() - 7);
        return prev;
      },
      serviceIndex: 2,
    },
    {
      targetDay: 4,
      status: 'Cancelado',
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      getDate: () => getNextWeekday(now, 4),
      serviceIndex: 3,
      cancelReason: 'Ya no podía asistir',
    },
  ];

  for (const barber of barbers) {
    const existingCount = await AppointmentModel.countDocuments({ barberId: barber._id });
    if (existingCount > 0) {
      console.log(`Barbero ${barber.name} ${barber.lastname} ya tiene turnos — omitido`);
      continue;
    }

    for (const seed of seeds) {
      const dayName = dayNames[seed.targetDay];
      const scheduleDay = (barber.schedule as Record<string, any>)[dayName];
      if (!scheduleDay || !scheduleDay.startTime || !scheduleDay.endTime) continue;

      const date = seed.getDate();
      const dateStr = formatDate(date);

      const startTime = scheduleDay.startTime;
      const [startH, startM] = startTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;

      const svc = SEED_SERVICES[seed.serviceIndex];
      const endMinutes = startMinutes + svc.duration;
      const [closeH, closeM] = scheduleDay.endTime.split(':').map(Number);
      const closeMinutes = closeH * 60 + closeM;
      if (endMinutes > closeMinutes) continue;

      let inBreak = false;
      for (const br of scheduleDay.breaks || []) {
        const [brSH, brSM] = br.startTime.split(':').map(Number);
        const [brEH, brEM] = br.endTime.split(':').map(Number);
        const brStart = brSH * 60 + brSM;
        const brEnd = brEH * 60 + brEM;
        if (startMinutes < brEnd && endMinutes > brStart) {
          inBreak = true;
          break;
        }
      }
      if (inBreak) continue;

      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      await AppointmentModel.create({
        barberId: barber._id,
        clientName: 'Cliente',
        clientLastname: 'Prueba',
        clientPhone: '+59899123456',
        clientEmail: 'cliente@prueba.com',
        serviceId: svc.id,
        serviceName: svc.name,
        servicePrice: svc.price,
        serviceDuration: svc.duration,
        date: dateStr,
        startTime,
        endTime,
        status: seed.status,
        paymentStatus: seed.paymentStatus,
        paymentMethod: seed.paymentMethod,
        cancelReason: seed.cancelReason,
        cancelledAt: seed.status === 'Cancelado' ? new Date() : undefined,
        cancelledBy: seed.status === 'Cancelado' ? 'system' : undefined,
        statusHistory: [
          {
            status: seed.status,
            timestamp: new Date(),
            actor: 'system',
          },
        ],
      });

      console.log(`  Turno ${seed.status} creado para ${barber.name} el ${dateStr} a las ${startTime}`);
    }
  }
}

if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGO_URI as string);
    await seedAdmin();
    await seedBarbers();
    await seedAppointments();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
