import { CreateTempLockUseCase } from '../application/use-cases/tempLock/CreateTempLockUseCase';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { TempLockController } from '../interface-adapters/controllers/tempLock/TempLockController';
import { createTempLockRouter } from '../interface-adapters/routes/tempLock.routes';

export const buildTempLockRouter = () => {
  const tempLockRepository = new MongoTempLockRepository();

  const createTempLock = new CreateTempLockUseCase(tempLockRepository);
  const tempLockController = new TempLockController(createTempLock);

  return createTempLockRouter({ tempLockController });
};