import { MongoTempLockRepository } from '../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { TempLockController } from '../interface-adapters/controllers/tempLock/TempLockController';
import { createTempLockRouter } from '../interface-adapters/routes/tempLock.routes';

export const buildTempLockRouter = () => {
  const tempLockRepository = new MongoTempLockRepository();
  const tempLockController = new TempLockController(tempLockRepository);

  return createTempLockRouter({ tempLockController });
};