import { CreateAppointmentUseCase } from '../application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../application/use-cases/appointment/GetAppointmentsUseCase';
import { CancelAppointmentUseCase } from '../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { AppointmentController } from '../interface-adapters/controllers/appointment/AppointmentController';
import { createAppointmentRouter } from '../interface-adapters/routes/appointment.routes';

export const buildAppointmentRouter = () => {
  const appointmentRepository = new MongoAppointmentRepository();
  const barberRepository = new MongoBarberRepository();
  const tokenService = new JwtTokenService();

  const createAppointment = new CreateAppointmentUseCase(
    appointmentRepository,
    barberRepository
  );
  const getAppointments = new GetAppointmentsUseCase(appointmentRepository);
  const cancelAppointment = new CancelAppointmentUseCase(appointmentRepository);
  const updateAppointmentStatus = new UpdateAppointmentStatusUseCase(appointmentRepository);

  const appointmentController = new AppointmentController(
    createAppointment,
    getAppointments,
    cancelAppointment,
    updateAppointmentStatus
  );

  const authenticate = createAuthenticate(tokenService);

  return createAppointmentRouter({ appointmentController, authenticate });
};

export const buildAppointmentRepository = () => new MongoAppointmentRepository();
