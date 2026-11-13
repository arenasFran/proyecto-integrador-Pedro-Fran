import mongoose from 'mongoose';
import {
  MongoAppointmentRepository,
  CreateAppointmentData,
} from '../../../../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import AppointmentModel from '../../../../src/infrastructure/repositories/mongodb/models/appointment.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoAppointmentRepository.findAllByDateRange', () => {
  let repository: MongoAppointmentRepository;
  const barberId = new mongoose.Types.ObjectId().toString();
  const otherBarberId = new mongoose.Types.ObjectId().toString();

  const makeData = (overrides: Partial<CreateAppointmentData> = {}): CreateAppointmentData => ({
    barberId,
    clientName: 'Juan',
    clientLastname: 'Perez',
    clientEmail: 'juan@test.com',
    clientPhone: '099111222',
    serviceId: 'svc-1',
    serviceName: 'Corte de pelo',
    servicePrice: 500,
    serviceDuration: 30,
    date: '2026-01-15',
    startTime: '10:00',
    endTime: '10:30',
    status: 'Confirmado',
    paymentStatus: 'Pendiente',
    paymentMethod: 'local',
    statusHistory: [{ status: 'Confirmado', timestamp: new Date(), actor: 'client' }],
    version: 0,
    ...overrides,
  });

  beforeEach(() => {
    repository = new MongoAppointmentRepository();
  });

  afterEach(async () => {
    await AppointmentModel.deleteMany({});
  });

  it('devuelve todos los turnos del rango sin truncar aunque sean más de 100', async () => {
    const total = 101;
    for (let i = 0; i < total; i += 1) {
      const startTime = `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`;
      await repository.create(makeData({ date: '2026-01-10', startTime, endTime: '23:59' }));
    }
    await repository.create(makeData({ date: '2026-02-10' }));

    const result = await repository.findAllByDateRange({
      dateFrom: '2026-01-10',
      dateTo: '2026-01-10',
    });

    expect(result).toHaveLength(total);
  });

  it('ordena por fecha ascendente y luego por hora ascendente', async () => {
    await repository.create(makeData({ date: '2026-01-12', startTime: '09:00', endTime: '09:30' }));
    await repository.create(makeData({ date: '2026-01-10', startTime: '15:00', endTime: '15:30' }));
    await repository.create(makeData({ date: '2026-01-10', startTime: '08:00', endTime: '08:30' }));

    const result = await repository.findAllByDateRange({
      dateFrom: '2026-01-10',
      dateTo: '2026-01-12',
    });

    expect(result.map((a) => `${a.date} ${a.startTime}`)).toEqual([
      '2026-01-10 08:00',
      '2026-01-10 15:00',
      '2026-01-12 09:00',
    ]);
  });

  it('respeta el filtro opcional por barberId', async () => {
    await repository.create(makeData({ barberId }));
    await repository.create(makeData({ barberId: otherBarberId, startTime: '11:00', endTime: '11:30' }));

    const result = await repository.findAllByDateRange({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      barberId: otherBarberId,
    });

    expect(result).toHaveLength(1);
    expect(result[0].barberId).toBe(otherBarberId);
  });

  it('excluye turnos fuera del rango', async () => {
    await repository.create(makeData({ date: '2026-01-09' }));
    await repository.create(makeData({ date: '2026-01-15', startTime: '11:00', endTime: '11:30' }));
    await repository.create(makeData({ date: '2026-02-01', startTime: '12:00', endTime: '12:30' }));

    const result = await repository.findAllByDateRange({
      dateFrom: '2026-01-10',
      dateTo: '2026-01-31',
    });

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-01-15');
  });
});
