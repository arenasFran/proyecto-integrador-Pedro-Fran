import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../common/response';
import { GetCartUseCase } from '../../../application/use-cases/cart/GetCartUseCase';
import { SyncCartUseCase } from '../../../application/use-cases/cart/SyncCartUseCase';
import { ClearCartUseCase } from '../../../application/use-cases/cart/ClearCartUseCase';

export class CartController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly syncCartUseCase: SyncCartUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  getCart = async (req: Request, res: Response) => {
    try {
      const result = await this.getCartUseCase.execute({ userId: req.user!._id });
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener carrito');
    }
  };

  syncCart = async (req: Request, res: Response) => {
    try {
      const { items } = req.body as { items: { productId: string; quantity: number }[] };
      const result = await this.syncCartUseCase.execute({ userId: req.user!._id, items });
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al sincronizar carrito');
    }
  };

  clearCart = async (req: Request, res: Response) => {
    try {
      await this.clearCartUseCase.execute({ userId: req.user!._id });
      return sendSuccess(res, { message: 'Carrito limpiado.' });
    } catch (error) {
      return sendError(res, error, 'Error al limpiar carrito');
    }
  };
}
