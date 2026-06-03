import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin } from '../repositories/mongodb/models/barber.model';

const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });

const createWorkDay = (start: string, end: string, breakStart?: string, breakEnd?: string) => ({
  startTime: start,
  endTime: end,
  breaks: breakStart && breakEnd ? [{ startTime: breakStart, endTime: breakEnd }] : [],
});

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

if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGO_URI as string);
    await seedAdmin();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
