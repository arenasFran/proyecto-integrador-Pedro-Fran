import { GetAllServicesUseCase } from '../application/use-cases/service/GetAllServicesUseCase';
import { StaticServiceRepository } from '../infrastructure/repositories/static/StaticServiceRepository';
import { ServiceController } from '../interface-adapters/controllers/service/ServiceController';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { createServiceRouter } from '../interface-adapters/routes/service.routes';
import { buildTokenService } from './auth';

export const buildServiceRouter = () => {
  const repo = new StaticServiceRepository();
  const getAll = new GetAllServicesUseCase(repo);
  const controller = new ServiceController(getAll);
  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createServiceRouter({ serviceController: controller, authenticate });
};
