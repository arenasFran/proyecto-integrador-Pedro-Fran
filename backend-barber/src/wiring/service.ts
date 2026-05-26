import { GetAllServicesUseCase } from '../application/use-cases/service/GetAllServicesUseCase';
import { StaticServiceRepository } from '../infrastructure/repositories/StaticServiceRepository';
import { ServiceController } from '../interface-adapters/controllers/service/ServiceController';
import { createServiceRouter } from '../interface-adapters/routes/service.routes';
import { buildTokenService } from './auth';

export const buildServiceRouter = () => {
  const repo = new StaticServiceRepository();
  const getAll = new GetAllServicesUseCase(repo);
  const controller = new ServiceController(getAll);
  const tokenService = buildTokenService();

  return createServiceRouter({ serviceController: controller, tokenService });
};
