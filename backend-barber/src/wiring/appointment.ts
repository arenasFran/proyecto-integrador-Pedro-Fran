import { CreateAppointmentUseCase } from '../application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../application/use-cases/appointment/GetAppointmentsUseCase';
import { GetAppointmentByIdUseCase } from '../application/use-cases/appointment/GetAppointmentByIdUseCase';
import { CancelAppointmentUseCase } from '../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { StaticServiceRepository } from '../infrastructure/repositories/static/StaticServiceRepository';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { AppointmentController } from '../interface-adapters/controllers/appointment/AppointmentController';
import { createAppointmentRouter } from '../interface-adapters/routes/appointment.routes';

export const buildAppointmentRouter = () => {
  const appointmentRepository = new MongoAppointmentRepository();
  const barberRepository = new MongoBarberRepository();
  const serviceRepository = new StaticServiceRepository();
  const tokenService = new JwtTokenService();

  const createAppointment = new CreateAppointmentUseCase(
    appointmentRepository,
    barberRepository,
    serviceRepository
  );
  const getAppointments = new GetAppointmentsUseCase(appointmentRepository);
  const getAppointmentById = new GetAppointmentByIdUseCase(appointmentRepository);
  const cancelAppointment = new CancelAppointmentUseCase(appointmentRepository);
  const updateAppointmentStatus = new UpdateAppointmentStatusUseCase(appointmentRepository);

  const appointmentController = new AppointmentController(
    createAppointment,
    getAppointments,
    getAppointmentById,
    cancelAppointment,
    updateAppointmentStatus
  );

  const authenticate = createAuthenticate(tokenService);

  return createAppointmentRouter({ appointmentController, authenticate });
};

export const buildAppointmentRepository = () => new MongoAppointmentRepository();
