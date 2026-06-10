import { CreateAppointmentUseCase } from '../application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../application/use-cases/appointment/GetAppointmentsUseCase';
import { GetAppointmentByIdUseCase } from '../application/use-cases/appointment/GetAppointmentByIdUseCase';
import { CancelAppointmentUseCase } from '../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { RescheduleAppointmentUseCase } from '../application/use-cases/appointment/RescheduleAppointmentUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoClientRepository } from '../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { StaticServiceRepository } from '../infrastructure/repositories/static/StaticServiceRepository';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { createAuthenticate, createOptionalAuth } from '../interface-adapters/middlewares/auth.middleware';
import { AppointmentController } from '../interface-adapters/controllers/appointment/AppointmentController';
import { createAppointmentRouter } from '../interface-adapters/routes/appointment.routes';
import { buildTokenService } from './auth';

export const buildAppointmentRouter = () => {
  const appointmentRepository = new MongoAppointmentRepository();
  const barberRepository = new MongoBarberRepository();
  const serviceRepository = new StaticServiceRepository();
  const clientRepository = new MongoClientRepository();
  const tempLockRepository = new MongoTempLockRepository();
  const tokenService = buildTokenService();
  const emailService = new NodemailerEmailService();

  const createAppointment = new CreateAppointmentUseCase(
    appointmentRepository,
    barberRepository,
    serviceRepository,
    clientRepository,
    emailService,
    tempLockRepository
  );
  const getAppointments = new GetAppointmentsUseCase(appointmentRepository);
  const getAppointmentById = new GetAppointmentByIdUseCase(appointmentRepository);
  const cancelAppointment = new CancelAppointmentUseCase(appointmentRepository, emailService);
  const updateAppointmentStatus = new UpdateAppointmentStatusUseCase(appointmentRepository);
  const rescheduleAppointment = new RescheduleAppointmentUseCase(
    appointmentRepository,
    barberRepository,
    serviceRepository,
    emailService
  );

  const appointmentController = new AppointmentController(
    createAppointment,
    getAppointments,
    getAppointmentById,
    cancelAppointment,
    updateAppointmentStatus,
    rescheduleAppointment
  );

  const authenticate = createAuthenticate(tokenService);
  const optionalAuth = createOptionalAuth(tokenService);

  return createAppointmentRouter({ appointmentController, authenticate, optionalAuth });
};

export const buildAppointmentRepository = () => new MongoAppointmentRepository();
