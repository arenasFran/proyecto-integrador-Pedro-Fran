import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, Employee } from '../repositories/mongodb/models/barber.model';

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
    specialties: ['Corte clásico', 'Barba', 'Arreglo de puntas'],
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
    specialties: ['Degradados', 'Corte moderno', 'Barba'],
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
    specialties: ['Corte femenino', 'Colorimetría', 'Peinado'],
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

if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGO_URI as string);
    await seedAdmin();
    await seedBarbers();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
