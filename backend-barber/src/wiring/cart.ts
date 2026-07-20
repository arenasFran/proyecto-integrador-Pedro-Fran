import { CartController } from '../interface-adapters/controllers/cart/CartController';
import { createCartRouter } from '../interface-adapters/routes/cart.routes';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { buildTokenService } from './auth';

export const buildCartRouter = () => {
  const cartController = new CartController();
  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);
  return createCartRouter({ cartController, authenticate });
};