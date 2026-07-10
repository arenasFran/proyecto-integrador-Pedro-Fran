import { Router } from 'express';
import { CartController } from '../controllers/cart/CartController';
import { createAuthenticate } from '../middlewares/auth.middleware';

export const createCartRouter = (deps: {
  cartController: CartController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.get('/', deps.authenticate, deps.cartController.getCart);

  router.post('/sync', deps.authenticate, deps.cartController.syncCart);

  router.delete('/', deps.authenticate, deps.cartController.clearCart);

  return router;
};