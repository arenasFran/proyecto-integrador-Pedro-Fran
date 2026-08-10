import { CreateOrderUseCase } from '../../../../src/application/use-cases/product/CreateOrderUseCase';
import { Product } from '../../../../src/domain/entities/Product';
import { Order } from '../../../../src/domain/entities/Order';
import { AppError } from '../../../../src/domain/errors/AppError';
import {
  makeMockOrderRepository,
  makeMockProductRepository,
  makeMockMembershipRepository,
  makeMockPaymentRepository,
} from '../../../test-utils/mocks';

const makeProduct = (overrides?: Partial<{ price: number; stock: number; status: 'active' | 'inactive' | 'deleted' }>) =>
  Product.restore({
    id: 'prod-1',
    name: 'Cera',
    description: 'desc',
    price: overrides?.price ?? 100,
    stock: overrides?.stock ?? 10,
    minStock: 2,
    imageUrl: 'img.jpg',
    gallery: [],
    category: 'cuidado',
    status: overrides?.status ?? 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('CreateOrderUseCase', () => {
  let orderRepository: ReturnType<typeof makeMockOrderRepository>;
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let createPaymentUseCase: { execute: jest.Mock };
  let revenueTracker: { trackProductOrder: jest.Mock };
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepository = makeMockOrderRepository();
    productRepository = makeMockProductRepository();
    membershipRepository = makeMockMembershipRepository();
    paymentRepository = makeMockPaymentRepository();
    createPaymentUseCase = { execute: jest.fn() };
    revenueTracker = { trackProductOrder: jest.fn().mockResolvedValue(undefined) };

    membershipRepository.findActiveByUser.mockResolvedValue(null);
    orderRepository.save.mockImplementation(async (o: Order) => Order.restore({ ...o.toPrimitives(), id: 'order-1' }));

    useCase = new CreateOrderUseCase(
      orderRepository as any,
      productRepository as any,
      membershipRepository as any,
      createPaymentUseCase as any,
      paymentRepository as any,
      revenueTracker as any,
    );
  });

  it('debe lanzar error si el carrito está vacío', async () => {
    await expect(useCase.execute({ userId: 'u1', items: [] })).rejects.toThrow(AppError);
  });

  it('debe lanzar error si un producto ya no existe', async () => {
    productRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ userId: 'u1', items: [{ productId: 'prod-1', quantity: 1 }] }),
    ).rejects.toThrow(/ya no están disponibles/);
  });

  it('debe lanzar error si el producto no está activo', async () => {
    productRepository.findById.mockResolvedValue(makeProduct({ status: 'inactive' }));
    await expect(
      useCase.execute({ userId: 'u1', items: [{ productId: 'prod-1', quantity: 1 }] }),
    ).rejects.toThrow(/no está disponible actualmente/);
  });

  it('debe lanzar error si no hay stock suficiente', async () => {
    productRepository.findById.mockResolvedValue(makeProduct({ stock: 1 }));
    await expect(
      useCase.execute({ userId: 'u1', items: [{ productId: 'prod-1', quantity: 5 }] }),
    ).rejects.toThrow(/Stock insuficiente/);
  });

  it('debe aplicar el descuento de membresía activa al precio', async () => {
    productRepository.findById.mockResolvedValue(makeProduct({ price: 100 }));
    membershipRepository.findActiveByUser.mockResolvedValue({ productDiscount: 20 } as any);

    let savedOrder: Order | undefined;
    orderRepository.save.mockImplementation(async (o: Order) => {
      savedOrder = o;
      return Order.restore({ ...o.toPrimitives(), id: 'order-1' });
    });
    createPaymentUseCase.execute.mockResolvedValue({ preferenceId: 'pref-1', initPoint: 'init' });

    await useCase.execute({ userId: 'u1', items: [{ productId: 'prod-1', quantity: 1 }] });

    expect(savedOrder!.items[0].price).toBe(80);
  });

  it('pago local: debe marcar la orden como paga, descontar stock y registrar el revenue', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());

    const result = await useCase.execute({
      userId: 'u1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      paymentMethod: 'local',
    });

    expect(result.orderId).toBe('order-1');
    expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-1', 2);
    expect(paymentRepository.save).toHaveBeenCalled();
    expect(revenueTracker.trackProductOrder).toHaveBeenCalledWith('order-1', 200, expect.any(Date), { userId: 'u1' });
    expect(createPaymentUseCase.execute).not.toHaveBeenCalled();
  });

  it('pago local: no debe romper el flujo si falla la creación del Payment', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());
    paymentRepository.save.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute({
      userId: 'u1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'local',
    });

    expect(result.orderId).toBe('order-1');
  });

  it('pago online (default): debe crear la preferencia de pago y devolver los datos de MP', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());
    createPaymentUseCase.execute.mockResolvedValue({
      preferenceId: 'pref-1',
      initPoint: 'https://mp/init',
      sandboxInitPoint: 'https://mp/sandbox',
    });

    const result = await useCase.execute({ userId: 'u1', items: [{ productId: 'prod-1', quantity: 1 }] });

    expect(result).toEqual({
      preferenceId: 'pref-1',
      initPoint: 'https://mp/init',
      sandboxInitPoint: 'https://mp/sandbox',
      orderId: 'order-1',
    });
    expect(productRepository.atomicDecreaseStock).not.toHaveBeenCalled();
  });

  it('pago online: debe eliminar la orden creada si falla la generación de la preferencia', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());
    createPaymentUseCase.execute.mockRejectedValue(new Error('mp down'));

    await expect(
      useCase.execute({ userId: 'u1', items: [{ productId: 'prod-1', quantity: 1 }] }),
    ).rejects.toThrow('mp down');

    expect(orderRepository.delete).toHaveBeenCalledWith('order-1');
  });
});
