import { OrderStockService } from '../../../../src/application/services/OrderStockService';
import { Order } from '../../../../src/domain/entities/Order';
import { Product } from '../../../../src/domain/entities/Product';
import { makeMockProductRepository } from '../../../test-utils/mocks';

const makeOrder = () =>
  Order.restore({
    id: 'order-1',
    userId: 'user-1',
    items: [
      { productId: 'prod-1', name: 'Cera', price: 100, quantity: 2 },
      { productId: 'prod-2', name: 'Gel', price: 50, quantity: 3 },
    ],
    total: 350,
    status: 'pending',
    statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makeProduct = (id: string, stock: number) =>
  Product.restore({
    id,
    name: id,
    description: 'desc',
    price: 100,
    stock,
    minStock: 2,
    imageUrl: '',
    gallery: [],
    category: 'cuidado',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('OrderStockService', () => {
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let service: OrderStockService;

  beforeEach(() => {
    productRepository = makeMockProductRepository();
    service = new OrderStockService(productRepository as any);
  });

  describe('restoreStock', () => {
    it('debe restaurar el stock de cada item de la orden', async () => {
      const order = makeOrder();
      productRepository.findById.mockImplementation(async (id: string) => makeProduct(id, 5));

      await service.restoreStock(order);

      expect(productRepository.save).toHaveBeenCalledTimes(2);
    });

    it('debe ignorar items cuyo producto ya no existe', async () => {
      const order = makeOrder();
      productRepository.findById.mockResolvedValue(null);

      await service.restoreStock(order);

      expect(productRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('decreaseStock', () => {
    it('debe descontar el stock de todos los items y devolver true', async () => {
      const order = makeOrder();
      productRepository.atomicDecreaseStock.mockResolvedValue(true);

      const ok = await service.decreaseStock(order);

      expect(ok).toBe(true);
      expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-1', 2);
      expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-2', 3);
      expect(productRepository.atomicIncreaseStock).not.toHaveBeenCalled();
    });

    it('debe revertir los items ya descontados si alguno falla por falta de stock', async () => {
      const order = makeOrder();
      productRepository.atomicDecreaseStock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const ok = await service.decreaseStock(order);

      expect(ok).toBe(false);
      expect(productRepository.atomicIncreaseStock).toHaveBeenCalledWith('prod-1', 2);
      expect(productRepository.atomicIncreaseStock).toHaveBeenCalledTimes(1);
    });

    it('no debe revertir nada si el primer item ya falla', async () => {
      const order = makeOrder();
      productRepository.atomicDecreaseStock.mockResolvedValue(false);

      const ok = await service.decreaseStock(order);

      expect(ok).toBe(false);
      expect(productRepository.atomicIncreaseStock).not.toHaveBeenCalled();
    });
  });
});
