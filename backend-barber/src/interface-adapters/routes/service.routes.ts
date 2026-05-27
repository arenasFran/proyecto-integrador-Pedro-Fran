import express from 'express';
import { ServiceController } from '../controllers/service/ServiceController';

export const createServiceRouter = (deps: {
  serviceController: ServiceController;
}) => {
  const router = express.Router();

  router.get('/', deps.serviceController.getAll);

  return router;
};
