import { CreateManualOrderUseCase } from '../../../../src/application/use-cases/product/CreateManualOrderUseCase';
import { Product } from '../../../../src/domain/entities/Product';
import { Order } from '../../../../src/domain/entities/Order';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockOrderRepository, makeMockProductRepository, makeMockPaymentRepository } from '../../../test-utils/mocks';

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

describe('CreateManualOrderUseCase', () => {
  let orderRepository: ReturnType<typeof makeMockOrderRepository>;
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let revenueTracker: { trackProductOrder: jest.Mock };
  let useCase: CreateManualOrderUseCase;

  beforeEach(() => {
    orderRepository = makeMockOrderRepository();
    productRepository = makeMockProductRepository();
    paymentRepository = makeMockPaymentRepository();
    revenueTracker = { trackProductOrder: jest.fn().mockResolvedValue(undefined) };
    orderRepository.save.mockImplementation(async (o: Order) => Order.restore({ ...o.toPrimitives(), id: 'order-1' }));

    useCase = new CreateManualOrderUseCase(
      orderRepository as any,
      productRepository as any,
      paymentRepository as any,
      revenueTracker as any,
    );
  });

  it('debe lanzar error si no hay items', async () => {
    await expect(useCase.execute({ items: [], clientName: 'Juan' })).rejects.toThrow(AppError);
  });

  it('debe lanzar error si no hay userId ni clientName', async () => {
    await expect(
      useCase.execute({ items: [{ productId: 'prod-1', quantity: 1 }] }),
    ).rejects.toThrow(/cliente registrado/);
  });

  it('debe lanzar error si el producto no existe', async () => {
    productRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ items: [{ productId: 'prod-1', quantity: 1 }], clientName: 'Juan' }),
    ).rejects.toThrow(/no encontrado/);
  });

  it('debe lanzar error si el producto no está activo', async () => {
    productRepository.findById.mockResolvedValue(makeProduct({ status: 'inactive' }));
    await expect(
      useCase.execute({ items: [{ productId: 'prod-1', quantity: 1 }], clientName: 'Juan' }),
    ).rejects.toThrow(/no esta disponible/);
  });

  it('debe lanzar error si no hay stock suficiente', async () => {
    productRepository.findById.mockResolvedValue(makeProduct({ stock: 1 }));
    await expect(
      useCase.execute({ items: [{ productId: 'prod-1', quantity: 5 }], clientName: 'Juan' }),
    ).rejects.toThrow(/Stock insuficiente/);
  });

  it('debe generar un userId sintético cuando no se provee uno', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());
    let savedOrder: Order | undefined;
    orderRepository.save.mockImplementation(async (o: Order) => {
      savedOrder = o;
      return Order.restore({ ...o.toPrimitives(), id: 'order-1' });
    });

    await useCase.execute({ items: [{ productId: 'prod-1', quantity: 1 }], clientName: 'Juan' });

    expect(savedOrder!.userId).toMatch(/^manual_/);
  });

  it('status por defecto (pending): no debe descontar stock ni trackear revenue', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());

    const result = await useCase.execute({ items: [{ productId: 'prod-1', quantity: 1 }], userId: 'user-1' });

    expect(result.status).toBe('pending');
    expect(productRepository.atomicDecreaseStock).not.toHaveBeenCalled();
    expect(revenueTracker.trackProductOrder).not.toHaveBeenCalled();
    expect(paymentRepository.save).toHaveBeenCalled();
  });

  it('status paid: debe pagar la orden, descontar stock, aprobar el pago y trackear revenue', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());

    const result = await useCase.execute({
      items: [{ productId: 'prod-1', quantity: 2 }],
      userId: 'user-1',
      status: 'paid',
    });

    expect(result.status).toBe('paid');
    expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-1', 2);
    expect(revenueTracker.trackProductOrder).toHaveBeenCalledWith('order-1', 200, expect.any(Date), expect.objectContaining({ userId: 'user-1' }));
    const savedPayment = paymentRepository.save.mock.calls[0][0];
    expect(savedPayment.status).toBe('approved');
  });

  it('status delivered: debe pagar y entregar la orden', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());

    const result = await useCase.execute({
      items: [{ productId: 'prod-1', quantity: 1 }],
      clientName: 'Juan',
      status: 'delivered',
    });

    expect(result.status).toBe('delivered');
  });

  it('no debe romper el flujo si falla la creación del Payment', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());
    paymentRepository.save.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute({
      items: [{ productId: 'prod-1', quantity: 1 }],
      userId: 'user-1',
      status: 'paid',
    });

    expect(result.status).toBe('paid');
  });

  it('walk-in sin userId registrado: no debe intentar crear un Payment (no hay un userId válido para asociarlo)', async () => {
    productRepository.findById.mockResolvedValue(makeProduct());

    const result = await useCase.execute({
      items: [{ productId: 'prod-1', quantity: 1 }],
      clientName: 'Cliente Mostrador',
      status: 'paid',
    });

    expect(result.status).toBe('paid');
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });
});
