import { UpdateAppointmentStatusUseCase } from '../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { MongoAppointmentRepository } from '../../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoMembershipRepository } from '../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoClientRepository } from '../../src/infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoBarberRepository } from '../../src/infrastructure/repositories/mongodb/MongoBarberRepository';
import { FakeEmailService } from '../../src/infrastructure/services/FakeEmailService';
import { seedBarber, seedAdmin, seedRegisteredClient, seedAppointment } from '../test-utils/factories';
import { AppError } from '../../src/domain/errors/AppError';

const appointmentRepo = new MongoAppointmentRepository();
const membershipRepo = new MongoMembershipRepository();
const clientRepo = new MongoClientRepository();
const barberRepo = new MongoBarberRepository();
const emailService = new FakeEmailService();

function createUC() {
  return new UpdateAppointmentStatusUseCase(
    appointmentRepo, membershipRepo, emailService, clientRepo, 1, barberRepo,
  );
}

describe('RBAC: permisos de actualización de turno', () => {
  it('Empleado que no está asignado al turno recibe 403', async () => {
    const { barberId: assignedBarberId } = await seedBarber({ email: 'asignado@test.com', phone: '098111111' });
    const { barberId: otherBarberId } = await seedBarber({ email: 'otro@test.com', phone: '098222222' });
    const { clientId } = await seedRegisteredClient({ email: 'rbac-client@test.com', phone: '099333333' });
    const { appointmentId } = await seedAppointment({ barberId: assignedBarberId, clientId, clientEmail: 'rbac-client@test.com', clientPhone: '099333333' });

    const uc = createUC();
    await expect(
      uc.execute(appointmentId, { status: 'Completado' }, otherBarberId, 'Empleado'),
    ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
  });

  it('Admin puede completar el turno exitosamente', async () => {
    const { barberId } = await seedBarber({ email: 'barber-admin@test.com', phone: '098444444' });
    const { adminId } = await seedAdmin({ email: 'admin-rbac@test.com', phone: '099555555' });
    const { clientId } = await seedRegisteredClient({ email: 'rbac-client2@test.com', phone: '099666666' });
    const { appointmentId } = await seedAppointment({ barberId, clientId, clientEmail: 'rbac-client2@test.com', clientPhone: '099666666' });

    const uc = createUC();
    const result = await uc.execute(appointmentId, { status: 'Completado' }, adminId, 'Admin');
    expect(result.message).toBe('Estado actualizado a Completado');

    const apt = await appointmentRepo.findById(appointmentId);
    expect(apt?.status).toBe('Completado');
  });
});
