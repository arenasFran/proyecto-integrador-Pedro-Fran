import express from 'express';
import { ServiceController } from '../controllers/service/ServiceController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { ITokenService } from '../../application/ports/ITokenService';

export const createServiceRouter = (deps: {
  serviceController: ServiceController;
  tokenService: ITokenService;
}) => {
  const router = express.Router();

  const auth = createAuthenticate(deps.tokenService);

  router.get('/', auth, deps.serviceController.getAll);

  return router;
};
