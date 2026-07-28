import { CartController } from '../interface-adapters/controllers/cart/CartController';
import { GetCartUseCase } from '../application/use-cases/cart/GetCartUseCase';
import { SyncCartUseCase } from '../application/use-cases/cart/SyncCartUseCase';
import { ClearCartUseCase } from '../application/use-cases/cart/ClearCartUseCase';
import { createCartRouter } from '../interface-adapters/routes/cart.routes';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { buildTokenService } from './auth';

export const buildCartRouter = () => {
  const getCartUseCase = new GetCartUseCase();
  const syncCartUseCase = new SyncCartUseCase();
  const clearCartUseCase = new ClearCartUseCase();

  const cartController = new CartController(getCartUseCase, syncCartUseCase, clearCartUseCase);
  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);
  return createCartRouter({ cartController, authenticate });
};
