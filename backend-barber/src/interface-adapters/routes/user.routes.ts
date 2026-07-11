import express from 'express';
import { UserController } from '../controllers/user/UserController';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { updateUserSchema } from '../validators/user.validator';

export const createUserRouter = (deps: {
  authenticate: express.RequestHandler;
  userController: UserController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.get('/me', deps.authenticate, deps.userController.getMe);

  router.put(
    '/me',
    deps.authenticate,
    authorize('Registrado'),
    validate({ body: updateUserSchema }),
    deps.userController.updateMe
  );

  router.get(
    '/clients',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    deps.userController.getClients
  );

  return router;
};
