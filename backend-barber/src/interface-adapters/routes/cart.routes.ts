import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CartController } from '../controllers/cart/CartController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { getConfig } from '../../infrastructure/config/env';
import { syncCartSchema } from '../validators/cart.validator';

const config = getConfig();
const cartMutationLimiter = rateLimit({
  windowMs: config.rateLimit.cart.windowMs,
  max: config.rateLimit.cart.max,
  message: { error: 'Demasiadas solicitudes del carrito. Esperá un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createCartRouter = (deps: {
  cartController: CartController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.get('/', deps.authenticate, deps.cartController.getCart);

  router.post('/sync', cartMutationLimiter, deps.authenticate, validate({ body: syncCartSchema }), deps.cartController.syncCart);

  router.delete('/', cartMutationLimiter, deps.authenticate, deps.cartController.clearCart);

  return router;
};
