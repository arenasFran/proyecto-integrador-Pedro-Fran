import mongoose from 'mongoose';
import { MongoAppointmentRepository, CreateAppointmentData } from '../../../../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import AppointmentModel from '../../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import { AppError } from '../../../../src/domain/errors/AppError';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoAppointmentRepository', () => {
  let repository: MongoAppointmentRepository;
  const barberId = new mongoose.Types.ObjectId().toString();

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

  describe('create', () => {
    it('debe crear el turno', async () => {
      const created = await repository.create(makeData());
      expect(created.id).toBeTruthy();
      expect(created.status).toBe('Confirmado');
    });

    it('debe lanzar AppError 409 si el horario ya está ocupado (clave duplicada)', async () => {
      await repository.create(makeData());
      await expect(repository.create(makeData())).rejects.toThrow(AppError);
      await expect(repository.create(makeData())).rejects.toThrow(/ya está ocupado/);
    });
  });

  describe('findById', () => {
    it('debe devolver el turno reconstruido', async () => {
      const created = await repository.create(makeData());
      const found = await repository.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.clientName).toBe('Juan');
    });

    it('debe devolver null si no existe', async () => {
      const found = await repository.findById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('findMany', () => {
    it('debe filtrar por barberId y status', async () => {
      await repository.create(makeData({ status: 'Confirmado' }));
      await repository.create(makeData({ startTime: '11:00', endTime: '11:30', status: 'Cancelado' }));

      const result = await repository.findMany({ barberId, status: 'Confirmado' });

      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('Confirmado');
    });

    it('paymentStatus Pendiente debe excluir Cancelado/NoShow aunque no se pida status', async () => {
      await repository.create(makeData({ paymentStatus: 'Pendiente', status: 'Confirmado' }));
      await repository.create(makeData({ startTime: '11:00', endTime: '11:30', paymentStatus: 'Pendiente', status: 'Cancelado' }));

      const result = await repository.findMany({ paymentStatus: 'Pendiente' });

      expect(result.total).toBe(1);
    });

    it('debe filtrar por rango de fechas dateFrom/dateTo', async () => {
      await repository.create(makeData({ date: '2026-01-01' }));
      await repository.create(makeData({ date: '2026-02-01', startTime: '11:00', endTime: '11:30' }));

      const result = await repository.findMany({ dateFrom: '2026-01-15', dateTo: '2026-02-28' });

      expect(result.total).toBe(1);
      expect(result.data[0].date).toBe('2026-02-01');
    });

    it('debe buscar por searchTerm en nombre/apellido/servicio', async () => {
      await repository.create(makeData({ clientName: 'Roberto', clientLastname: 'Gomez' }));
      await repository.create(makeData({ clientName: 'Ana', clientLastname: 'Diaz', startTime: '11:00', endTime: '11:30' }));

      const result = await repository.findMany({ searchTerm: 'Roberto' });

      expect(result.total).toBe(1);
      expect(result.data[0].clientName).toBe('Roberto');
    });

    it('debe paginar y ordenar los resultados', async () => {
      await repository.create(makeData({ date: '2026-01-10' }));
      await repository.create(makeData({ date: '2026-01-05', startTime: '11:00', endTime: '11:30' }));

      const result = await repository.findMany({ page: 1, limit: 1, sortBy: 'date', sortDir: 'asc' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe('2026-01-05');
      expect(result.totalPages).toBe(2);
    });

    it('debe filtrar por clientEmail o clientPhone', async () => {
      await repository.create(makeData({ clientEmail: 'target@test.com' }));
      await repository.create(makeData({ clientEmail: 'other@test.com', startTime: '11:00', endTime: '11:30' }));

      const result = await repository.findMany({ clientEmail: 'target@test.com' });

      expect(result.total).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('debe agrupar por status', async () => {
      await repository.create(makeData({ status: 'Confirmado' }));
      await repository.create(makeData({ startTime: '11:00', endTime: '11:30', status: 'Cancelado' }));

      const summary = await repository.getSummary({ barberId });

      expect(summary.total).toBe(2);
      expect(summary.byStatus.Confirmado).toBe(1);
      expect(summary.byStatus.Cancelado).toBe(1);
    });
  });

  describe('findByBarberAndDate', () => {
    it('debe devolver los turnos del barbero en esa fecha', async () => {
      await repository.create(makeData({ date: '2026-01-15' }));
      await repository.create(makeData({ date: '2026-01-16', startTime: '11:00', endTime: '11:30' }));

      const found = await repository.findByBarberAndDate(barberId, '2026-01-15');

      expect(found).toHaveLength(1);
    });
  });

  describe('findByClientAndDate', () => {
    it('debe devolver los turnos del cliente en esa fecha', async () => {
      const clientId = new mongoose.Types.ObjectId().toString();
      await repository.create(makeData({ clientId, date: '2026-01-15' }));

      const found = await repository.findByClientAndDate(clientId, '2026-01-15');

      expect(found).toHaveLength(1);
    });
  });

  describe('findByContactAndDate', () => {
    it('debe devolver [] si no se provee email ni teléfono', async () => {
      const found = await repository.findByContactAndDate('2026-01-15');
      expect(found).toEqual([]);
    });

    it('debe encontrar por email o teléfono en la fecha', async () => {
      await repository.create(makeData({ clientEmail: 'contact@test.com', date: '2026-01-15' }));
      const found = await repository.findByContactAndDate('2026-01-15', 'contact@test.com');
      expect(found).toHaveLength(1);
    });
  });

  describe('findByClientId / findByContact', () => {
    it('findByClientId debe devolver los turnos del cliente', async () => {
      const clientId = new mongoose.Types.ObjectId().toString();
      await repository.create(makeData({ clientId }));
      const found = await repository.findByClientId(clientId);
      expect(found).toHaveLength(1);
    });

    it('findByContact debe devolver los turnos que matchean email+phone', async () => {
      await repository.create(makeData({ clientEmail: 'c@test.com', clientPhone: '099000000' }));
      const found = await repository.findByContact('c@test.com', '099000000');
      expect(found).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('debe actualizar los campos provistos', async () => {
      const created = await repository.create(makeData());
      const updated = await repository.update(created.id, { startTime: '12:00', endTime: '12:30' });
      expect(updated!.startTime).toBe('12:00');
    });

    it('debe respetar el control de concurrencia optimista por version', async () => {
      const created = await repository.create(makeData());
      const updated = await repository.update(created.id, { startTime: '12:00', endTime: '12:30', version: 0 });
      expect(updated!.version).toBe(1);
    });

    it('debe devolver null si la version no coincide (conflicto de concurrencia)', async () => {
      const created = await repository.create(makeData());
      const updated = await repository.update(created.id, { startTime: '12:00', endTime: '12:30', version: 5 });
      expect(updated).toBeNull();
    });

    it('debe lanzar AppError 409 si el nuevo horario ya está ocupado', async () => {
      const created = await repository.create(makeData());
      await repository.create(makeData({ startTime: '15:00', endTime: '15:30' }));

      await expect(
        repository.update(created.id, { startTime: '15:00', endTime: '15:30' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateClientId', () => {
    it('debe asociar el clientId al turno', async () => {
      const created = await repository.create(makeData());
      const clientId = new mongoose.Types.ObjectId().toString();

      const updated = await repository.updateClientId(created.id, clientId);

      expect(updated!.clientId).toBe(clientId);
    });

    it('debe devolver null si la version no coincide', async () => {
      const created = await repository.create(makeData());
      const updated = await repository.updateClientId(created.id, new mongoose.Types.ObjectId().toString(), 99);
      expect(updated).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar el status y agregar una entrada al historial', async () => {
      const created = await repository.create(makeData());

      const updated = await repository.updateStatus(created.id, {
        status: 'Cancelado',
        cancelReason: 'No puede asistir',
        cancelledBy: 'client',
        statusHistoryEntry: { status: 'Cancelado', timestamp: new Date(), actor: 'client' },
      });

      expect(updated!.status).toBe('Cancelado');
      expect(updated!.statusHistory).toHaveLength(2);
    });

    it('debe incrementar version cuando se provee', async () => {
      const created = await repository.create(makeData());
      const updated = await repository.updateStatus(created.id, { status: 'Completado', version: 0 });
      expect(updated!.version).toBe(1);
    });

    it('debe devolver null si no encuentra el turno', async () => {
      const updated = await repository.updateStatus(new mongoose.Types.ObjectId().toString(), { status: 'Cancelado' });
      expect(updated).toBeNull();
    });
  });

  describe('cancelPendingPaymentsOlderThan', () => {
    it('debe cancelar turnos online con pago pendiente vencidos', async () => {
      const created = await repository.create(makeData({ paymentMethod: 'online', paymentStatus: 'Pendiente' }));
      await AppointmentModel.collection.updateOne({ _id: new mongoose.Types.ObjectId(created.id) }, { $set: { createdAt: new Date('2020-01-01') } });

      const count = await repository.cancelPendingPaymentsOlderThan(new Date('2025-01-01'));

      expect(count).toBe(1);
      const updated = await repository.findById(created.id);
      expect(updated!.status).toBe('Cancelado');
      expect(updated!.cancelReason).toBe('Pago pendiente expirado');
    });

    it('no debe tocar turnos con pago local', async () => {
      const created = await repository.create(makeData({ paymentMethod: 'local', paymentStatus: 'Pendiente' }));
      await AppointmentModel.collection.updateOne({ _id: new mongoose.Types.ObjectId(created.id) }, { $set: { createdAt: new Date('2020-01-01') } });

      const count = await repository.cancelPendingPaymentsOlderThan(new Date('2025-01-01'));

      expect(count).toBe(0);
    });
  });
});
