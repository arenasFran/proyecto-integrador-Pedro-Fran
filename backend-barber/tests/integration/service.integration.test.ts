import { MongoServiceRepository } from '../../src/infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoAppointmentRepository } from '../../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../src/infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoClientRepository } from '../../src/infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoTempLockRepository } from '../../src/infrastructure/repositories/mongodb/MongoTempLockRepository';
import { MongoBarberBlockRepository } from '../../src/infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { MongoMembershipRepository } from '../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { FakeEmailService } from '../../src/infrastructure/services/FakeEmailService';
import { CreateServiceUseCase } from '../../src/application/use-cases/service/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../../src/application/use-cases/service/UpdateServiceUseCase';
import { CreateAppointmentUseCase } from '../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { seedBarber, seedRegisteredClient, getFutureDate } from '../test-utils/factories';
import { AppError } from '../../src/domain/errors/AppError';

const serviceRepo = new MongoServiceRepository();
const appointmentRepo = new MongoAppointmentRepository();
const barberRepo = new MongoBarberRepository();
const clientRepo = new MongoClientRepository();
const tempLockRepo = new MongoTempLockRepository();
const blockRepo = new MongoBarberBlockRepository();
const membershipRepo = new MongoMembershipRepository();

const DATE = getFutureDate(7);

describe('Soft delete de servicio', () => {
  it('excluido del catálogo (findAll), flag inactive persiste (findByIdIncludingInactive), y booking rechazado con 404', async () => {
    const createUC = new CreateServiceUseCase(serviceRepo);
    const service = await createUC.execute({
      name: 'Servicio SoftDelete',
      description: 'Test de soft delete',
      price: 300,
    });
    expect(service.status).toBe('active');

    const updateUC = new UpdateServiceUseCase(serviceRepo);
    const updated = await updateUC.execute({ id: service.id, status: 'inactive' });
    expect(updated.status).toBe('inactive');

    const catalog = await serviceRepo.findAll();
    expect(catalog.find((s) => s.id === service.id)).toBeUndefined();

    const foundInactive = await serviceRepo.findByIdIncludingInactive(service.id);
    expect(foundInactive).not.toBeNull();
    expect(foundInactive!.status).toBe('inactive');

    const foundActive = await serviceRepo.findById(service.id);
    expect(foundActive).toBeNull();

    const { barberId } = await seedBarber({ email: 'svc-barber@test.com' });
    const { clientId } = await seedRegisteredClient({ email: 'svc-client@test.com' });
    const { id: tempLockId } = await tempLockRepo.create({ barberId, date: DATE, startTime: '10:00' });

    const appointmentUC = new CreateAppointmentUseCase(
      appointmentRepo, barberRepo, serviceRepo, clientRepo,
      new FakeEmailService(), tempLockRepo, blockRepo, membershipRepo,
    );

    await expect(
      appointmentUC.execute({
        barberId, serviceId: service.id, date: DATE, startTime: '10:00',
        clientId, clientName: 'Test', clientLastname: 'User',
        clientPhone: '099888888', clientEmail: 'svc-client@test.com',
        tempLockId,
      }),
    ).rejects.toThrow(expect.objectContaining({ statusCode: 404 }));
  });
});
