import { SlotService } from '../domain/services/SlotService';
import { GetAvailableSlotsUseCase } from '../application/use-cases/barber/GetAvailableSlotsUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { BarberController } from '../interface-adapters/controllers/barber/BarberController';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { createBarberRouter } from '../interface-adapters/routes/barber.routes';
import { buildTokenService } from './auth';

export const buildBarberRouter = () => {
  const barberRepository = new MongoBarberRepository();
  const userRepository = new MongoUserRepository();
  const appointmentRepository = new MongoAppointmentRepository();
  const tempLockRepository = new MongoTempLockRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = buildTokenService();
  const emailService = new NodemailerEmailService();

  const slotService = new SlotService();
  const getAvailableSlots = new GetAvailableSlotsUseCase(barberRepository, slotService, appointmentRepository, tempLockRepository);

  const barberController = new BarberController(
    barberRepository,
    userRepository,
    appointmentRepository,
    tempLockRepository,
    passwordHasher,
    emailService,
    getAvailableSlots
  );

  const authenticate = createAuthenticate(tokenService);

  return createBarberRouter({ barberController, authenticate });
};
