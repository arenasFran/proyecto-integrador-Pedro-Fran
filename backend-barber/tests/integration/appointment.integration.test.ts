import { MongoAppointmentRepository } from '../../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../src/infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoServiceRepository } from '../../src/infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoClientRepository } from '../../src/infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoTempLockRepository } from '../../src/infrastructure/repositories/mongodb/MongoTempLockRepository';
import { MongoBarberBlockRepository } from '../../src/infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { MongoMembershipRepository } from '../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { FakeEmailService } from '../../src/infrastructure/services/FakeEmailService';
import { CreateAppointmentUseCase } from '../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { UpdatePaymentStatusUseCase } from '../../src/application/use-cases/appointment/UpdatePaymentStatusUseCase';
import { seedBarber, seedService, seedRegisteredClient, seedAppointment, getFutureDate } from '../test-utils/factories';
import { AppError } from '../../src/domain/errors/AppError';
import AppointmentModel from '../../src/infrastructure/repositories/mongodb/models/appointment.model';

const appointmentRepo = new MongoAppointmentRepository();
const barberRepo = new MongoBarberRepository();
const serviceRepo = new MongoServiceRepository();
const clientRepo = new MongoClientRepository();
const tempLockRepo = new MongoTempLockRepository();
const blockRepo = new MongoBarberBlockRepository();
const membershipRepo = new MongoMembershipRepository();

function createUseCase() {
  return new CreateAppointmentUseCase(
    appointmentRepo, barberRepo, serviceRepo, clientRepo,
    new FakeEmailService(), tempLockRepo, blockRepo, membershipRepo,
  );
}

function createUpdateStatusUC() {
  return new UpdateAppointmentStatusUseCase(
    appointmentRepo, membershipRepo, new FakeEmailService(), clientRepo, 1, barberRepo,
  );
}

function createUpdatePaymentUC() {
  return new UpdatePaymentStatusUseCase(appointmentRepo);
}

const DATE = getFutureDate(7);

describe('CreateAppointmentUseCase (TempLock)', () => {
  it('crea un turno y consume el TempLock', async () => {
    const { barberId } = await seedBarber();
    const { serviceId } = await seedService();
    const { clientId } = await seedRegisteredClient({ email: 'apt1@test.com' });
    const { id: tempLockId } = await tempLockRepo.create({ barberId, date: DATE, startTime: '10:00' });

    const result = await createUseCase().execute({
      barberId, serviceId, date: DATE, startTime: '10:00',
      clientId, clientName: 'Juan', clientLastname: 'Perez',
      clientPhone: '099111111', clientEmail: 'apt1@test.com',
      tempLockId,
    });

    expect(result.appointment.status).toBe('Confirmado');
    expect(result.appointment.paymentStatus).toBe('Pendiente');

    const consumed = await tempLockRepo.findById(tempLockId);
    expect(consumed).toBeNull();
  });

  it('rechaza el segundo intento en el mismo horario con 409', async () => {
    const { barberId } = await seedBarber();
    const { serviceId } = await seedService();
    const { clientId } = await seedRegisteredClient({ email: 'apt2@test.com' });

    const lock1 = await tempLockRepo.create({ barberId, date: DATE, startTime: '10:00' });
    await createUseCase().execute({
      barberId, serviceId, date: DATE, startTime: '10:00',
      clientId, clientName: 'Juan', clientLastname: 'Perez',
      clientPhone: '099222222', clientEmail: 'apt2@test.com',
      tempLockId: lock1.id,
    });

    const lock2 = await tempLockRepo.create({ barberId, date: DATE, startTime: '10:00' });
    await expect(
      createUseCase().execute({
        barberId, serviceId, date: DATE, startTime: '10:00',
        clientId, clientName: 'Juan', clientLastname: 'Perez',
        clientPhone: '099222222', clientEmail: 'apt2@test.com',
        tempLockId: lock2.id,
      }),
    ).rejects.toThrow(expect.objectContaining({ statusCode: 409 }));
  });
});

describe('Máquina de estados de turnos', () => {
  it('Pendiente→Pagado→Completado', async () => {
    const { barberId } = await seedBarber();
    const { clientId } = await seedRegisteredClient({ email: 'sm@test.com' });
    const { appointmentId } = await seedAppointment({ barberId, clientId, clientEmail: 'sm@test.com' });

    const updatePaymentUC = createUpdatePaymentUC();
    const result1 = await updatePaymentUC.execute(appointmentId, clientId, 'Admin');
    expect(result1.message).toBe('Pago registrado con éxito');

    const aptAfterPay = await appointmentRepo.findById(appointmentId);
    expect(aptAfterPay?.paymentStatus).toBe('Pagado');

    const updateStatusUC = createUpdateStatusUC();
    const result2 = await updateStatusUC.execute(appointmentId, { status: 'Completado' }, clientId, 'Admin');
    expect(result2.message).toBe('Estado actualizado a Completado');

    const aptFinal = await appointmentRepo.findById(appointmentId);
    expect(aptFinal?.status).toBe('Completado');
  });

  it('rechaza transición inválida Completado→Cancelado con 400', async () => {
    const { barberId } = await seedBarber();
    const { clientId } = await seedRegisteredClient({ email: 'sm2@test.com' });
    const { appointmentId } = await seedAppointment({ barberId, clientId, clientEmail: 'sm2@test.com', status: 'Completado' });

    const updateStatusUC = createUpdateStatusUC();
    await expect(
      updateStatusUC.execute(appointmentId, { status: 'Cancelado' }, clientId, 'Admin'),
    ).rejects.toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});
