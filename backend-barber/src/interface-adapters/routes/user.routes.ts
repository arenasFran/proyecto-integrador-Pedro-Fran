import express from 'express';
import rateLimit from 'express-rate-limit';
import { UserController } from '../controllers/user/UserController';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { changePasswordSchema, updateUserSchema } from '../validators/user.validator';

export const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de cambio de contraseña, esperá 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!._id,
});

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
    changePasswordLimiter,
    validate({ body: updateUserSchema }),
    deps.userController.updateMe
  );

  router.get(
    '/clients',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    deps.userController.getClients
  );

  router.patch(
    '/me/password',
    deps.authenticate,
    changePasswordLimiter,
    validate({ body: changePasswordSchema }),
    deps.userController.changePassword
  );

  return router;
};
