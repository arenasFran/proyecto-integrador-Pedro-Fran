import { ClearCartUseCase } from '../../../src/application/use-cases/cart/ClearCartUseCase';
import { GetCartUseCase } from '../../../src/application/use-cases/cart/GetCartUseCase';
import { SyncCartUseCase } from '../../../src/application/use-cases/cart/SyncCartUseCase';
import { AppError } from '../../../src/domain/errors/AppError';
import { CartModel } from '../../../src/infrastructure/repositories/mongodb/models/cart.model';

// Mongoose devuelve los items como subdocumentos (no objetos planos); toEqual con Jest
// falla al introspeccionarlos ("caller/callee/arguments"), así que se comparan planos.
const plain = (items: { productId: string; quantity: number }[]) =>
  items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Cart use-cases', () => {
  afterEach(async () => {
    await CartModel.deleteMany({});
  });

  describe('GetCartUseCase', () => {
    const useCase = new GetCartUseCase();

    it('debe devolver items vacío si el usuario no tiene carrito', async () => {
      const result = await useCase.execute({ userId: 'user-1' });
      expect(result.items).toEqual([]);
    });

    it('debe devolver los items guardados del carrito', async () => {
      await CartModel.create({ userId: 'user-1', items: [{ productId: 'p1', quantity: 2 }] });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(plain(result.items)).toEqual([{ productId: 'p1', quantity: 2 }]);
    });

    it('no debe devolver el carrito de otro usuario', async () => {
      await CartModel.create({ userId: 'user-2', items: [{ productId: 'p1', quantity: 2 }] });

      const result = await useCase.execute({ userId: 'user-1' });

      expect(result.items).toEqual([]);
    });
  });

  describe('SyncCartUseCase', () => {
    const useCase = new SyncCartUseCase();

    it('debe rechazar si items no es un array', async () => {
      await expect(
        useCase.execute({ userId: 'user-1', items: 'no-array' as any }),
      ).rejects.toThrow(AppError);
    });

    it('debe crear el carrito si no existe (upsert)', async () => {
      const result = await useCase.execute({ userId: 'user-1', items: [{ productId: 'p1', quantity: 3 }] });

      expect(plain(result.items)).toEqual([{ productId: 'p1', quantity: 3 }]);
      const inDb = await CartModel.findOne({ userId: 'user-1' });
      expect(inDb).not.toBeNull();
    });

    it('debe reemplazar por completo los items de un carrito existente', async () => {
      await CartModel.create({ userId: 'user-1', items: [{ productId: 'p1', quantity: 1 }] });

      const result = await useCase.execute({ userId: 'user-1', items: [{ productId: 'p2', quantity: 5 }] });

      expect(plain(result.items)).toEqual([{ productId: 'p2', quantity: 5 }]);
    });

    it('debe permitir vaciar el carrito sincronizando un array vacío', async () => {
      await CartModel.create({ userId: 'user-1', items: [{ productId: 'p1', quantity: 1 }] });

      const result = await useCase.execute({ userId: 'user-1', items: [] });

      expect(result.items).toEqual([]);
    });
  });

  describe('ClearCartUseCase', () => {
    const useCase = new ClearCartUseCase();

    it('debe vaciar los items del carrito existente', async () => {
      await CartModel.create({ userId: 'user-1', items: [{ productId: 'p1', quantity: 2 }] });

      await useCase.execute({ userId: 'user-1' });

      const inDb = await CartModel.findOne({ userId: 'user-1' });
      expect(inDb!.items).toEqual([]);
    });

    it('no debe lanzar si el usuario no tiene carrito', async () => {
      await expect(useCase.execute({ userId: 'sin-carrito' })).resolves.toBeUndefined();
    });
  });
});
