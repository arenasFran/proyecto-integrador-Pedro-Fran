import 'dotenv/config';
import mongoose from 'mongoose';
import { Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';

const TEST_PREFIX = 'TEST_';
const TEST_BARBER_EMAIL = 'analytics-test@elitecut.com';
const TEST_DIST_BARBER1_EMAIL = 'analytics-test-dist1@elitecut.com';
const TEST_DIST_BARBER2_EMAIL = 'analytics-test-dist2@elitecut.com';
const TEST_CLIENT_EMAIL = 'analytics-reg@test.com';

type SeedAppointment = {
  clientName: string;
  clientLastname?: string;
  status: string;
  servicePrice: number;
  serviceDuration: number;
  date: string;
  startTime: string;
  endTime: string;
  clientId?: mongoose.Types.ObjectId;
  clientPhone?: string;
};

const buildAppointments = (barberId: mongoose.Types.ObjectId, registeredClientId?: mongoose.Types.ObjectId): SeedAppointment[] => [
  {
    clientName: `${TEST_PREFIX}Completado`,
    clientLastname: 'Test',
    status: 'Completado',
    servicePrice: 600,
    serviceDuration: 30,
    date: '2026-06-15',
    startTime: '09:00',
    endTime: '09:30',
  },
  {
    clientName: `${TEST_PREFIX}Cancelado`,
    clientLastname: 'Test',
    status: 'Cancelado',
    servicePrice: 600,
    serviceDuration: 30,
    date: '2026-06-15',
    startTime: '09:30',
    endTime: '10:00',
  },
  {
    clientName: `${TEST_PREFIX}Confirmado`,
    clientLastname: 'Test',
    status: 'Confirmado',
    servicePrice: 500,
    serviceDuration: 45,
    date: '2026-06-15',
    startTime: '10:00',
    endTime: '10:45',
  },
  {
    clientName: `${TEST_PREFIX}NoShow`,
    clientLastname: 'Test',
    status: 'NoShow',
    servicePrice: 500,
    serviceDuration: 45,
    date: '2026-06-15',
    startTime: '11:00',
    endTime: '11:45',
  },
  {
    clientName: `${TEST_PREFIX}UnregIn`,
    clientLastname: 'Test',
    status: 'Completado',
    servicePrice: 300,
    serviceDuration: 30,
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '09:30',
    clientPhone: '099999995',
  },
  {
    clientName: `${TEST_PREFIX}UnregOut`,
    clientLastname: 'Test',
    status: 'Completado',
    servicePrice: 400,
    serviceDuration: 30,
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '09:30',
    clientPhone: '099999995',
  },
  ...(registeredClientId
    ? [
        {
          clientName: `${TEST_PREFIX}Reg`,
          clientLastname: 'Test',
          status: 'Completado' as const,
          servicePrice: 500,
          serviceDuration: 40,
          date: '2026-06-20',
          startTime: '09:00',
          endTime: '09:40',
          clientId: registeredClientId,
        },
      ]
    : []),
];

async function getOrCreateTestBarber(): Promise<mongoose.Types.ObjectId> {
  let barber = await Employee.findOne({ email: TEST_BARBER_EMAIL });
  if (!barber) {
    const emptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
    const workDay = (start: string, end: string) => ({
      startTime: start,
      endTime: end,
      breaks: [],
    });

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('test123', 10);

    barber = await Employee.create({
      email: TEST_BARBER_EMAIL,
      password: hash,
      name: 'Analytics',
      lastname: 'Test',
      phone: '099999990',
      services: ['Corte de pelo'],
      age: 30,
      slotDuration: 30,
      schedule: {
        monday: workDay('09:00', '18:00'),
        tuesday: workDay('09:00', '18:00'),
        wednesday: workDay('09:00', '18:00'),
        thursday: workDay('09:00', '18:00'),
        friday: workDay('09:00', '18:00'),
        saturday: workDay('09:00', '14:00'),
        sunday: emptyDay(),
      },
      isActive: true,
      photoUrl: null,
    });
    console.log('Barbero de prueba creado');
  }
  return barber._id as mongoose.Types.ObjectId;
}

async function getOrCreateTestRegisteredClient(): Promise<mongoose.Types.ObjectId> {
  let client = await RegisteredClient.findOne({ email: TEST_CLIENT_EMAIL });
  if (!client) {
    client = await RegisteredClient.create({
      email: TEST_CLIENT_EMAIL,
      name: 'Test',
      lastname: 'Registered',
      phone: '099999996',
      password: 'not-used',
      authProvider: 'local',
    });
    console.log('Cliente registrado de prueba creado');
  }
  return client._id as mongoose.Types.ObjectId;
}

async function seedAnalytics() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barberId = await getOrCreateTestBarber();
  const registeredClientId = await getOrCreateTestRegisteredClient();
  const appointments = buildAppointments(barberId, registeredClientId);

  for (const a of appointments) {
    await AppointmentModel.create({
      barberId,
      clientId: a.clientId,
      clientName: a.clientName,
      clientLastname: a.clientLastname ?? '',
      clientPhone: a.clientPhone,
      serviceId: 'svc-test',
      serviceName: 'Servicio de prueba',
      servicePrice: a.servicePrice,
      serviceDuration: a.serviceDuration,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      paymentStatus: a.status === 'Completado' ? 'Pagado' : 'Pendiente',
      paymentMethod: 'local',
      cancelReason: a.status === 'Cancelado' ? 'Prueba' : undefined,
      cancelledAt: a.status === 'Cancelado' ? new Date() : undefined,
      cancelledBy: a.status === 'Cancelado' ? 'system' : undefined,
      statusHistory: [{ status: a.status, timestamp: new Date(), actor: 'system' }],
    });
    console.log(`  Creado: ${a.clientName} (${a.status}, $${a.servicePrice}, ${a.serviceDuration}min, ${a.date})`);
  }

  console.log(`\nSeed completado: ${appointments.length} turnos insertados`);
}

const HEATMAP_TARGETS: Array<{ date: string; count: number }> = [
  { date: '2026-01-10', count: 2 },
  { date: '2026-01-15', count: 1 },
  { date: '2026-02-20', count: 3 },
];

const HEATMAP_STATUSES = ['Completado', 'Confirmado', 'NoShow'];

async function seedHeatmap() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barberId = await getOrCreateTestBarber();

  let idx = 0;
  for (const target of HEATMAP_TARGETS) {
    for (let i = 0; i < target.count; i++) {
      const status = HEATMAP_STATUSES[idx % HEATMAP_STATUSES.length];
      const startH = String(9 + i).padStart(2, '0');
      const endH = String(9 + i + 1).padStart(2, '0');

      await AppointmentModel.create({
        barberId,
        clientName: `${TEST_PREFIX}Heatmap_${target.date}_${i}`,
        clientLastname: 'Test',
        serviceId: 'svc-test',
        serviceName: 'Servicio de prueba',
        servicePrice: 500,
        serviceDuration: 30,
        date: target.date,
        startTime: `${startH}:00`,
        endTime: `${endH}:00`,
        status,
        paymentStatus: status === 'Completado' ? 'Pagado' : 'Pendiente',
        paymentMethod: 'local',
        statusHistory: [{ status, timestamp: new Date(), actor: 'system' }],
      });
      console.log(`  Creado: ${TEST_PREFIX}Heatmap_${target.date}_${i} (${status}, ${target.date})`);
      idx++;
    }
  }

  console.log(`\nSeed heatmap completado: ${HEATMAP_TARGETS.reduce((s, t) => s + t.count, 0)} turnos insertados`);
}

type DistribucionAppointment = {
  barberEmail: string;
  barberName: string;
  barberLastname: string;
  status: string;
  price: number;
};

const DISTRIBUCION_SEED: DistribucionAppointment[] = [
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', status: 'Completado', price: 600 },
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', status: 'Completado', price: 500 },
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', status: 'Cancelado', price: 400 },
  { barberEmail: TEST_DIST_BARBER2_EMAIL, barberName: 'Maria', barberLastname: 'TestTwo', status: 'Completado', price: 700 },
  { barberEmail: TEST_DIST_BARBER2_EMAIL, barberName: 'Maria', barberLastname: 'TestTwo', status: 'Completado', price: 300 },
];

async function createBarber(email: string, name: string, lastname: string): Promise<mongoose.Types.ObjectId> {
  const existing = await Employee.findOne({ email });
  if (existing) return existing._id as mongoose.Types.ObjectId;

  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash('test123', 10);
  const emptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
  const workDay = (start: string, end: string) => ({ startTime: start, endTime: end, breaks: [] });

  const barber = await Employee.create({
    email,
    password: hash,
    name,
    lastname,
    phone: `099${Math.floor(100000 + Math.random() * 900000)}`,
    services: ['Corte de pelo'],
    age: 30,
    slotDuration: 30,
    schedule: {
      monday: workDay('09:00', '18:00'),
      tuesday: workDay('09:00', '18:00'),
      wednesday: workDay('09:00', '18:00'),
      thursday: workDay('09:00', '18:00'),
      friday: workDay('09:00', '18:00'),
      saturday: workDay('09:00', '14:00'),
      sunday: emptyDay(),
    },
    isActive: true,
    photoUrl: null,
  });
  return barber._id as mongoose.Types.ObjectId;
}

async function seedDistribucion() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barberIds = new Map<string, mongoose.Types.ObjectId>();

  for (const a of DISTRIBUCION_SEED) {
    if (!barberIds.has(a.barberEmail)) {
      const id = await createBarber(a.barberEmail, a.barberName, a.barberLastname);
      barberIds.set(a.barberEmail, id);
      console.log(`Barbero ${a.barberName} ${a.barberLastname} listo`);
    }
  }

  let idx = 0;
  for (const a of DISTRIBUCION_SEED) {
    const barberId = barberIds.get(a.barberEmail)!;
    const date = '2026-06-15';
    const startH = String(9 + idx).padStart(2, '0');

    await AppointmentModel.create({
      barberId,
      clientName: `${TEST_PREFIX}Dist_${idx}`,
      clientLastname: 'Test',
      serviceId: 'svc-test',
      serviceName: 'Servicio de prueba',
      servicePrice: a.price,
      serviceDuration: 30,
      date,
      startTime: `${startH}:00`,
      endTime: `${String(10 + idx).padStart(2, '0')}:00`,
      status: a.status,
      paymentStatus: a.status === 'Completado' ? 'Pagado' : 'Pendiente',
      paymentMethod: 'local',
      cancelReason: a.status === 'Cancelado' ? 'Prueba' : undefined,
      cancelledAt: a.status === 'Cancelado' ? new Date() : undefined,
      cancelledBy: a.status === 'Cancelado' ? 'system' : undefined,
      statusHistory: [{ status: a.status, timestamp: new Date(), actor: 'system' }],
    });
    console.log(`  Creado: ${TEST_PREFIX}Dist_${idx} (${a.barberName}, ${a.status}, $${a.price})`);
    idx++;
  }

  console.log(`\nSeed distribución completado: ${DISTRIBUCION_SEED.length} turnos insertados`);
}

const RESERVAS_SEED: Array<{
  barberEmail: string;
  barberName: string;
  barberLastname: string;
  date: string;
  status: string;
  price: number;
}> = [
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', date: '2026-06-10', status: 'Completado', price: 600 },
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', date: '2026-06-10', status: 'Completado', price: 500 },
  { barberEmail: TEST_DIST_BARBER2_EMAIL, barberName: 'Maria', barberLastname: 'TestTwo', date: '2026-06-10', status: 'Cancelado', price: 400 },
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', date: '2026-06-15', status: 'Completado', price: 700 },
  { barberEmail: TEST_DIST_BARBER2_EMAIL, barberName: 'Maria', barberLastname: 'TestTwo', date: '2026-06-15', status: 'Cancelado', price: 300 },
  { barberEmail: TEST_DIST_BARBER1_EMAIL, barberName: 'Pepe', barberLastname: 'TestOne', date: '2026-07-20', status: 'Completado', price: 800 },
];

async function seedReservasGanancias() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barberIds = new Map<string, mongoose.Types.ObjectId>();
  for (const a of RESERVAS_SEED) {
    if (!barberIds.has(a.barberEmail)) {
      const id = await createBarber(a.barberEmail, a.barberName, a.barberLastname);
      barberIds.set(a.barberEmail, id);
      console.log(`Barbero ${a.barberName} ${a.barberLastname} listo`);
    }
  }

  let idx = 0;
  for (const a of RESERVAS_SEED) {
    const barberId = barberIds.get(a.barberEmail)!;
    const startH = String(9 + idx).padStart(2, '0');

    await AppointmentModel.create({
      barberId,
      clientName: `${TEST_PREFIX}RG_${idx}`,
      clientLastname: 'Test',
      serviceId: 'svc-test',
      serviceName: 'Servicio de prueba',
      servicePrice: a.price,
      serviceDuration: 30,
      date: a.date,
      startTime: `${startH}:00`,
      endTime: `${String(10 + idx).padStart(2, '0')}:00`,
      status: a.status,
      paymentStatus: a.status === 'Completado' ? 'Pagado' : 'Pendiente',
      paymentMethod: 'local',
      cancelReason: a.status === 'Cancelado' ? 'Prueba' : undefined,
      cancelledAt: a.status === 'Cancelado' ? new Date() : undefined,
      cancelledBy: a.status === 'Cancelado' ? 'system' : undefined,
      statusHistory: [{ status: a.status, timestamp: new Date(), actor: 'system' }],
    });
    console.log(`  Creado: TEST_RG_${idx} (${a.barberName}, ${a.date}, ${a.status}, $${a.price})`);
    idx++;
  }

  console.log(`\nSeed reservas-ganancias completado: ${RESERVAS_SEED.length} turnos insertados`);
}

async function cleanupTestData() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const result = await AppointmentModel.deleteMany({ clientName: { $regex: `^${TEST_PREFIX}` } });
  await RegisteredClient.deleteOne({ email: TEST_CLIENT_EMAIL });
  await Employee.deleteMany({ email: { $in: [TEST_BARBER_EMAIL, TEST_DIST_BARBER1_EMAIL, TEST_DIST_BARBER2_EMAIL] } });
  console.log(`Limpieza completada: ${result.deletedCount} turnos eliminados`);
}

const COMMAND = process.argv[2];

if (require.main === module) {
  (async () => {
    switch (COMMAND) {
      case 'cleanup':
        await cleanupTestData();
        break;
      case 'heatmap':
        await seedHeatmap();
        break;
      case 'distribucion':
        await seedDistribucion();
        break;
      case 'reservasganancias':
        await seedReservasGanancias();
        break;
      default:
        await seedAnalytics();
    }
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
