import { CreateTempLockUseCase } from '../application/use-cases/tempLock/CreateTempLockUseCase';
import { ReleaseTempLockUseCase } from '../application/use-cases/tempLock/ReleaseTempLockUseCase';
import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { TempLockController } from '../interface-adapters/controllers/tempLock/TempLockController';
import { createTempLockRouter } from '../interface-adapters/routes/tempLock.routes';

export const buildTempLockRouter = () => {
  const tempLockRepository = new MongoTempLockRepository();

  const createTempLock = new CreateTempLockUseCase(tempLockRepository);
  const releaseTempLock = new ReleaseTempLockUseCase(tempLockRepository);
  const tempLockController = new TempLockController(createTempLock, releaseTempLock);

  return createTempLockRouter({ tempLockController });
};