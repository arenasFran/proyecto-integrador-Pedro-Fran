import { CreateAppointmentUseCase } from '../application/use-cases/appointment/CreateAppointmentUseCase';
import { CancelAppointmentUseCase } from '../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { RescheduleAppointmentUseCase } from '../application/use-cases/appointment/RescheduleAppointmentUseCase';
import { UpdatePaymentStatusUseCase } from '../application/use-cases/appointment/UpdatePaymentStatusUseCase';
import { SendReminderUseCase } from '../application/use-cases/appointment/SendReminderUseCase';
import { ChangeBarberUseCase } from '../application/use-cases/appointment/ChangeBarberUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoClientRepository } from '../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { MongoBarberBlockRepository } from '../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { MongoServiceRepository } from '../infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoRevenueEntryRepository } from '../infrastructure/repositories/mongodb/MongoRevenueEntryRepository';
import { RevenueTracker } from '../application/services/RevenueTracker';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { createAuthenticate, createOptionalAuth } from '../interface-adapters/middlewares/auth.middleware';
import { AppointmentController } from '../interface-adapters/controllers/appointment/AppointmentController';
import { createAppointmentRouter } from '../interface-adapters/routes/appointment.routes';
import { buildTokenService } from './auth';
import { buildCreatePaymentUseCase } from './payment';

export const buildAppointmentRouter = () => {
  const appointmentRepository = new MongoAppointmentRepository();
  const barberRepository = new MongoBarberRepository();
  const serviceRepository = new MongoServiceRepository();
  const clientRepository = new MongoClientRepository();
  const tempLockRepository = new MongoTempLockRepository();
  const blockRepository = new MongoBarberBlockRepository();
  const tokenService = buildTokenService();
  const emailService = new NodemailerEmailService();

  const membershipRepository = new MongoMembershipRepository();
  const createPaymentUseCase = buildCreatePaymentUseCase();
  const revenueEntryRepository = new MongoRevenueEntryRepository();
  const revenueTracker = new RevenueTracker(revenueEntryRepository);

  const createAppointment = new CreateAppointmentUseCase(
    appointmentRepository,
    barberRepository,
    serviceRepository,
    clientRepository,
    emailService,
    tempLockRepository,
    blockRepository,
    membershipRepository,
    createPaymentUseCase
  );
  const cancelMinHoursBefore = Number(process.env.CANCEL_MIN_HOURS_BEFORE) || 2;

  const cancelAppointment = new CancelAppointmentUseCase(
    appointmentRepository, membershipRepository, emailService, cancelMinHoursBefore, barberRepository
  );
  const updateAppointmentStatus = new UpdateAppointmentStatusUseCase(
    appointmentRepository, membershipRepository, emailService, clientRepository, cancelMinHoursBefore, barberRepository, revenueTracker
  );
  const rescheduleAppointment = new RescheduleAppointmentUseCase(
    appointmentRepository,
    barberRepository,
    serviceRepository,
    emailService,
    blockRepository
  );
  const updatePaymentStatus = new UpdatePaymentStatusUseCase(
    appointmentRepository, revenueTracker
  );
  const sendReminder = new SendReminderUseCase(
    appointmentRepository,
    barberRepository,
    emailService
  );
  const changeBarber = new ChangeBarberUseCase(
    appointmentRepository,
    barberRepository
  );

  const appointmentController = new AppointmentController(
    appointmentRepository,
    barberRepository,
    clientRepository,
    createAppointment,
    cancelAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    updatePaymentStatus,
    sendReminder,
    changeBarber
  );

  const authenticate = createAuthenticate(tokenService);
  const optionalAuth = createOptionalAuth(tokenService);

  return createAppointmentRouter({ appointmentController, authenticate, optionalAuth });
};

export const buildAppointmentRepository = () => new MongoAppointmentRepository();
