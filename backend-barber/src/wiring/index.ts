import { SlotService } from '../domain/services/SlotService';
import { GetAvailableSlotsUseCase } from '../application/use-cases/barber/GetAvailableSlotsUseCase';
import { DeleteBarberUseCase } from '../application/use-cases/barber/DeleteBarberUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { BarberController } from '../interface-adapters/controllers/barber/BarberController';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { createBarberRouter } from '../interface-adapters/routes/barber.routes';
import { StaticServiceRepository } from '../infrastructure/repositories/static/StaticServiceRepository';
import { ServiceController } from '../interface-adapters/controllers/service/ServiceController';
import { createServiceRouter } from '../interface-adapters/routes/service.routes';
import { UserController } from '../interface-adapters/controllers/user/UserController';
import { createUserRouter } from '../interface-adapters/routes/user.routes';
import { TempLockController } from '../interface-adapters/controllers/tempLock/TempLockController';
import { createTempLockRouter } from '../interface-adapters/routes/tempLock.routes';
import { buildTokenService } from './auth';
import { getConfig } from '../infrastructure/config/env';

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
  const deleteBarber = new DeleteBarberUseCase(barberRepository, appointmentRepository, tempLockRepository, emailService);

  const barberController = new BarberController(
    barberRepository,
    userRepository,
    passwordHasher,
    getAvailableSlots,
    deleteBarber
  );

  const authenticate = createAuthenticate(tokenService);

  return createBarberRouter({ barberController, authenticate });
};

export const buildServiceRouter = () => {
  const repo = new StaticServiceRepository();
  const controller = new ServiceController(repo);

  return createServiceRouter({ serviceController: controller });
};

export const buildUserRouter = () => {
  const config = getConfig();
  const userRepository = new MongoUserRepository();
  const tokenService = new JwtTokenService({
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
    partialSecret: config.jwtPartialSecret,
    accessTokenExpiresIn: config.jwtExpiresIn,
    refreshTokenExpiresIn: config.jwtRefreshExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });

  const userController = new UserController(userRepository);
  const authenticate = createAuthenticate(tokenService);

  return createUserRouter({ authenticate, userController });
};

export const buildTempLockRouter = () => {
  const tempLockRepository = new MongoTempLockRepository();
  const tempLockController = new TempLockController(tempLockRepository);

  return createTempLockRouter({ tempLockController });
};
