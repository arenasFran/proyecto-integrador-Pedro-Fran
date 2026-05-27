import express, { RequestHandler } from 'express';
import { ServiceController } from '../controllers/service/ServiceController';

export const createServiceRouter = (deps: {
  serviceController: ServiceController;
  authenticate: RequestHandler;
}) => {
  const router = express.Router();

  router.get('/', deps.authenticate, deps.serviceController.getAll);

  return router;
};
