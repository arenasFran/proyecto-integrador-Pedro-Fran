import { StaticServiceRepository } from '../infrastructure/repositories/static/StaticServiceRepository';
import { ServiceController } from '../interface-adapters/controllers/service/ServiceController';
import { createServiceRouter } from '../interface-adapters/routes/service.routes';

export const buildServiceRouter = () => {
  const repo = new StaticServiceRepository();
  const controller = new ServiceController(repo);

  return createServiceRouter({ serviceController: controller });
};
