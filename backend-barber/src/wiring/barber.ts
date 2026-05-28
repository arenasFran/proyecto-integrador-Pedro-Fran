import { CreateEmployeeBarberUseCase } from '../application/use-cases/barber/CreateEmployeeBarberUseCase';
import { DeactivateBarberUseCase } from '../application/use-cases/barber/DeactivateBarberUseCase';
import { GetAllEmployeesUseCase } from '../application/use-cases/barber/GetAllEmployeesUseCase';
import { GetAvailableSlotsUseCase } from '../application/use-cases/barber/GetAvailableSlotsUseCase';
import { GetBarberByIdUseCase } from '../application/use-cases/barber/GetBarberByIdUseCase';
import { GetBarberScheduleUseCase } from '../application/use-cases/barber/GetBarberScheduleUseCase';
import { UpdateBarberScheduleUseCase } from '../application/use-cases/barber/UpdateBarberScheduleUseCase';
import { UpdateBarberUseCase } from '../application/use-cases/barber/UpdateBarberUseCase';
import { MongoBarberRepository } from '../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { BarberController } from '../interface-adapters/controllers/barber/BarberController';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { createBarberRouter } from '../interface-adapters/routes/barber.routes';
import { buildTokenService } from './auth';

export const buildBarberRouter = () => {
  const barberRepository = new MongoBarberRepository();
  const userRepository = new MongoUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = buildTokenService();

  const createBarber = new CreateEmployeeBarberUseCase(
    userRepository,
    barberRepository,
    passwordHasher
  );
  const getAllBarbers = new GetAllEmployeesUseCase(barberRepository);
  const getBarberById = new GetBarberByIdUseCase(barberRepository);
  const updateBarber = new UpdateBarberUseCase(
    userRepository,
    barberRepository,
    passwordHasher
  );
  const deactivateBarber = new DeactivateBarberUseCase(barberRepository);
  const getBarberSchedule = new GetBarberScheduleUseCase(barberRepository);
  const updateBarberSchedule = new UpdateBarberScheduleUseCase(barberRepository);
  const getAvailableSlots = new GetAvailableSlotsUseCase(barberRepository);

  const barberController = new BarberController(
    createBarber,
    getAllBarbers,
    getBarberById,
    updateBarber,
    deactivateBarber,
    getBarberSchedule,
    updateBarberSchedule,
    getAvailableSlots
  );

  const authenticate = createAuthenticate(tokenService);

  return createBarberRouter({ barberController, authenticate });
};
