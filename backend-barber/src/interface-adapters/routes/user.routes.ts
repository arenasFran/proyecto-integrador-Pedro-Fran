import express from 'express';
import { UserController } from '../controllers/user/UserController';

export const createUserRouter = (deps: {
  authenticate: express.RequestHandler;
  userController: UserController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.get('/me', deps.authenticate, deps.userController.getMe);

  return router;
};
