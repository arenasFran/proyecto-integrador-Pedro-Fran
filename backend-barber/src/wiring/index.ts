import { SlotService } from '../domain/services/SlotService';
import { GetAvailableSlotsUseCase } from '../application/use-cases/barber/GetAvailableSlotsUseCase';
import { DeleteBarberUseCase } from '../application/use-cases/barber/DeleteBarberUseCase';
import { CreateBarberUseCase } from '../application/use-cases/barber/CreateBarberUseCase';
import { UpdateBarberUseCase } from '../application/use-cases/barber/UpdateBarberUseCase';
import { UpdateBarberMeUseCase } from '../application/use-cases/barber/UpdateBarberMeUseCase';
import { GetBarberOccupancyUseCase } from '../application/use-cases/barber/GetBarberOccupancyUseCase';
import { CreateBarberBlockUseCase } from '../application/use-cases/barber/CreateBarberBlockUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoBarberBlockRepository } from '../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoRefreshTokenRepository } from '../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { BarberController } from '../interface-adapters/controllers/barber/BarberController';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { createBarberRouter } from '../interface-adapters/routes/barber.routes';
import { CloudinaryService } from '../infrastructure/services/CloudinaryService';
import { UploadController } from '../interface-adapters/controllers/upload/UploadController';
import { createUploadRouter } from '../interface-adapters/routes/upload.routes';
import { MongoServiceRepository } from '../infrastructure/repositories/mongodb/MongoServiceRepository';
import { CreateServiceUseCase } from '../application/use-cases/service/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../application/use-cases/service/UpdateServiceUseCase';
import { ServiceController } from '../interface-adapters/controllers/service/ServiceController';
import { createServiceRouter } from '../interface-adapters/routes/service.routes';
import { UserController } from '../interface-adapters/controllers/user/UserController';
import { createUserRouter } from '../interface-adapters/routes/user.routes';
import { TempLockController } from '../interface-adapters/controllers/tempLock/TempLockController';
import { createTempLockRouter } from '../interface-adapters/routes/tempLock.routes';
import { buildTokenService } from './auth';
import { getConfig } from '../infrastructure/config/env';
import { UpdateUserProfileUseCase } from '../application/use-cases/user/UpdateUserProfileUseCase';
import { ChangePasswordUseCase } from '../application/use-cases/user/ChangePasswordUseCase';
import { EmailChangeVerifier } from '../application/services/EmailChangeVerifier';
import { ManageClientSanctionUseCase } from '../application/use-cases/client/ManageClientSanctionUseCase';
import { MongoClientRepository } from '../infrastructure/repositories/mongodb/MongoClientRepository';
import { ClientController } from '../interface-adapters/controllers/client/ClientController';
import { createClientRouter } from '../interface-adapters/routes/client.routes';

export const buildBarberRouter = () => {
  const barberRepository = new MongoBarberRepository();
  const userRepository = new MongoUserRepository();
  const appointmentRepository = new MongoAppointmentRepository();
  const tempLockRepository = new MongoTempLockRepository();
  const blockRepository = new MongoBarberBlockRepository();
  const membershipRepository = new MongoMembershipRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = buildTokenService();
  const emailService = new NodemailerEmailService();

  const slotService = new SlotService();
  const getAvailableSlots = new GetAvailableSlotsUseCase(barberRepository, slotService, appointmentRepository, tempLockRepository, blockRepository);
  const deleteBarber = new DeleteBarberUseCase(barberRepository, appointmentRepository, tempLockRepository, blockRepository, emailService, membershipRepository);
  const createBarber = new CreateBarberUseCase(barberRepository, userRepository, passwordHasher);
  const updateBarber = new UpdateBarberUseCase(barberRepository, userRepository, passwordHasher);
  const emailChangeVerifier = new EmailChangeVerifier();
  const updateBarberMe = new UpdateBarberMeUseCase(barberRepository, userRepository, passwordHasher, emailChangeVerifier);
  const getBarberOccupancy = new GetBarberOccupancyUseCase(barberRepository, appointmentRepository, blockRepository);
  const createBarberBlock = new CreateBarberBlockUseCase(appointmentRepository, blockRepository);

  const barberController = new BarberController(
    barberRepository,
    getAvailableSlots,
    deleteBarber,
    blockRepository,
    emailService,
    createBarber,
    updateBarber,
    updateBarberMe,
    getBarberOccupancy,
    createBarberBlock
  );

  const authenticate = createAuthenticate(tokenService);

  return createBarberRouter({ barberController, authenticate });
};

export const buildServiceRouter = (deps?: { authenticate?: ReturnType<typeof createAuthenticate> }) => {
  const repo = new MongoServiceRepository();
  const createServiceUseCase = new CreateServiceUseCase(repo);
  const updateServiceUseCase = new UpdateServiceUseCase(repo);
  const controller = new ServiceController(
    repo,
    createServiceUseCase,
    updateServiceUseCase,
  );

  return createServiceRouter({ serviceController: controller, authenticate: deps?.authenticate });
};

export const buildUserRouter = () => {
  const config = getConfig();
  const userRepository = new MongoUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const refreshTokenRepository = new MongoRefreshTokenRepository();
  const tokenService = new JwtTokenService({
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
    partialSecret: config.jwtPartialSecret,
    accessTokenExpiresIn: config.jwtExpiresIn,
    refreshTokenExpiresIn: config.jwtRefreshExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });

  const emailService = new NodemailerEmailService();
  const emailChangeVerifier = new EmailChangeVerifier();
  const updateUserProfile = new UpdateUserProfileUseCase(userRepository, passwordHasher, emailChangeVerifier);
  const changePassword = new ChangePasswordUseCase(userRepository, passwordHasher, refreshTokenRepository);
  const userController = new UserController(userRepository, emailService, updateUserProfile, changePassword);
  const authenticate = createAuthenticate(tokenService);

  return createUserRouter({ authenticate, userController });
};

export const buildUploadRouter = () => {
  const cloudinaryService = new CloudinaryService();
  const userRepository = new MongoUserRepository();
  const uploadController = new UploadController(cloudinaryService, userRepository);
  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createUploadRouter({ authenticate, uploadController });
};

export { buildMembershipRouter } from './membership';
export { buildPaymentRepository, buildMercadoPagoService, buildPaymentDependencies, buildPaymentRouter, buildCreatePaymentUseCase } from './payment';
export { buildProductRouter } from './product';
export { buildOrderRouter } from './order';

export const buildTempLockRouter = () => {
  const tempLockRepository = new MongoTempLockRepository();
  const tempLockController = new TempLockController(tempLockRepository);

  return createTempLockRouter({ tempLockController });
};

export const buildClientRouter = () => {
  const clientRepository = new MongoClientRepository();
  const manageSanction = new ManageClientSanctionUseCase(clientRepository);
  const clientController = new ClientController(manageSanction);
  const authenticate = createAuthenticate(buildTokenService());

  return createClientRouter({ authenticate, clientController });
};
