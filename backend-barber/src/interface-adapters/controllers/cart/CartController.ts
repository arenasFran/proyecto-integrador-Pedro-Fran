import { Request, Response } from 'express';
import { CartModel } from '../../../infrastructure/repositories/mongodb/models/cart.model';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class CartController {
  getCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const cart = await CartModel.findOne({ userId });
      return sendSuccess(res, { items: cart?.items ?? [] });
    } catch (error) {
      return sendError(res, error, 'Error al obtener carrito');
    }
  };

  syncCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { items } = req.body as { items: { productId: string; quantity: number }[] };

      if (!Array.isArray(items)) {
        throw new AppError('Items debe ser un array.', 400);
      }

      const cart = await CartModel.findOneAndUpdate(
        { userId },
        { $set: { items, updatedAt: new Date() } },
        { upsert: true, new: true },
      );

      return sendSuccess(res, { items: cart.items });
    } catch (error) {
      return sendError(res, error, 'Error al sincronizar carrito');
    }
  };

  clearCart = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      await CartModel.findOneAndUpdate(
        { userId },
        { $set: { items: [], updatedAt: new Date() } },
      );
      return sendSuccess(res, { message: 'Carrito limpiado.' });
    } catch (error) {
      return sendError(res, error, 'Error al limpiar carrito');
    }
  };
}