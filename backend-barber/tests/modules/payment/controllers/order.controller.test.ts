import { OrderController } from '../../../../src/interface-adapters/controllers/product/OrderController';
import { Order } from '../../../../src/domain/entities/Order';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockOrderRepository, makeMockProductRepository, makeMockEmailService, makeMockUserRepository } from '../../../test-utils/mocks';

const makeOrder = (overrides?: Partial<{ status: 'pending' | 'paid' | 'delivered'; userId: string; clientName: string }>) =>
  Order.restore({
    id: 'order-1',
    userId: overrides?.userId ?? 'user-1',
    clientName: overrides?.clientName,
    items: [{ productId: 'prod-1', name: 'Cera', price: 100, quantity: 1 }],
    total: 100,
    status: overrides?.status ?? 'pending',
    statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('OrderController', () => {
  let createOrderUseCase: { execute: jest.Mock };
  let getOrderUseCase: { execute: jest.Mock };
  let updateOrderStatusUseCase: { execute: jest.Mock };
  let createManualOrderUseCase: { execute: jest.Mock };
  let deleteOrderUseCase: { execute: jest.Mock };
  let orderRepository: ReturnType<typeof makeMockOrderRepository>;
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let emailService: ReturnType<typeof makeMockEmailService>;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let controller: OrderController;

  beforeEach(() => {
    createOrderUseCase = { execute: jest.fn() };
    getOrderUseCase = { execute: jest.fn() };
    updateOrderStatusUseCase = { execute: jest.fn() };
    createManualOrderUseCase = { execute: jest.fn() };
    deleteOrderUseCase = { execute: jest.fn() };
    orderRepository = makeMockOrderRepository();
    productRepository = makeMockProductRepository();
    emailService = makeMockEmailService();
    userRepository = makeMockUserRepository();
    userRepository.findByIds.mockResolvedValue(new Map());

    controller = new OrderController(
      createOrderUseCase as any,
      getOrderUseCase as any,
      updateOrderStatusUseCase as any,
      createManualOrderUseCase as any,
      deleteOrderUseCase as any,
      orderRepository as any,
      productRepository as any,
      emailService as any,
      userRepository as any,
    );
  });

  describe('create', () => {
    it('debe responder 201 con la orden creada', async () => {
      createOrderUseCase.execute.mockResolvedValue({ orderId: 'order-1' });
      const req = createMockReqFull({ body: { items: [{ productId: 'prod-1', quantity: 1 }] } });
      (req as any).user = { _id: 'user-1', email: 'user@test.com' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1' }));
      expect(createOrderUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', payerEmail: 'user@test.com' }),
      );
    });

    it('debe responder según el statusCode del AppError', async () => {
      createOrderUseCase.execute.mockRejectedValue(new AppError('Stock insuficiente', 400));
      const req = createMockReqFull({ body: { items: [] } });
      (req as any).user = { _id: 'user-1', email: 'user@test.com' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Stock insuficiente' }));
    });
  });

  describe('getMyOrders', () => {
    it('debe devolver las órdenes del usuario', async () => {
      orderRepository.findByUser.mockResolvedValue([makeOrder()]);
      const req = createMockReqFull({});
      (req as any).user = { _id: 'user-1' };
      const res = createMockRes();

      await controller.getMyOrders(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ orders: [expect.objectContaining({ id: 'order-1' })] }),
      );
    });

    it('debe enriquecer con clientName como userName cuando la orden es manual', async () => {
      orderRepository.findByUser.mockResolvedValue([makeOrder({ userId: 'manual_123', clientName: 'Juan' })]);
      const req = createMockReqFull({});
      (req as any).user = { _id: 'user-1' };
      const res = createMockRes();

      await controller.getMyOrders(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ orders: [expect.objectContaining({ userName: 'Juan' })] }),
      );
    });

    it('debe responder 500 si el repositorio falla', async () => {
      orderRepository.findByUser.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({});
      (req as any).user = { _id: 'user-1' };
      const res = createMockRes();

      await controller.getMyOrders(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAll', () => {
    it('debe listar órdenes paginadas', async () => {
      orderRepository.findAll.mockResolvedValue({ data: [makeOrder()], total: 1, page: 1, totalPages: 1, limit: 10 });
      const req = createMockReqFull({ query: { page: '1', limit: '10' } });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(orderRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('debe completar userName/userEmail consultando al userRepository', async () => {
      orderRepository.findAll.mockResolvedValue({ data: [makeOrder()], total: 1, page: 1, totalPages: 1, limit: 10 });
      userRepository.findByIds.mockResolvedValue(new Map([['user-1', { name: 'Ana', lastname: 'Gomez', email: 'ana@test.com' } as any]]));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ orders: [expect.objectContaining({ userName: 'Ana Gomez', userEmail: 'ana@test.com' })] }),
      );
    });

    it('debe completar imageUrl de items sin imagen usando el productRepository', async () => {
      const order = Order.restore({
        id: 'order-1',
        userId: 'user-1',
        items: [{ productId: 'prod-1', name: 'Cera', price: 100, quantity: 1 }],
        total: 100,
        status: 'pending',
        statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      orderRepository.findAll.mockResolvedValue({ data: [order], total: 1, page: 1, totalPages: 1, limit: 10 });
      productRepository.findById.mockResolvedValue({ id: 'prod-1', imageUrl: 'https://img/prod-1.jpg' } as any);
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: [expect.objectContaining({ items: [expect.objectContaining({ imageUrl: 'https://img/prod-1.jpg' })] })],
        }),
      );
    });
  });

  describe('getById', () => {
    it('debe devolver la orden solicitada', async () => {
      getOrderUseCase.execute.mockResolvedValue(makeOrder().toPrimitives());
      const req = createMockReqFull({ params: { id: 'order-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.objectContaining({ id: 'order-1' }) }));
    });

    it('debe responder 404 si la orden no existe', async () => {
      getOrderUseCase.execute.mockRejectedValue(new AppError('Orden no encontrada.', 404));
      const req = createMockReqFull({ params: { id: 'nope' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe responder 403 si el usuario no es dueño de la orden', async () => {
      getOrderUseCase.execute.mockRejectedValue(new AppError('No tenés permiso para acceder a esta orden.', 403));
      const req = createMockReqFull({ params: { id: 'order-1' } });
      (req as any).user = { _id: 'otro-user', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar el estado y responder 200', async () => {
      const order = makeOrder({ status: 'paid' });
      updateOrderStatusUseCase.execute.mockResolvedValue({ order, previousStatus: 'pending' });
      const req = createMockReqFull({ params: { id: 'order-1' }, body: { status: 'paid' } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.objectContaining({ status: 'paid' }) }));
    });

    it('debe enviar email cuando pasa a delivered y no lo estaba antes', async () => {
      const order = makeOrder({ status: 'delivered' });
      updateOrderStatusUseCase.execute.mockResolvedValue({ order, previousStatus: 'paid' });
      userRepository.findEmailById.mockResolvedValue('cliente@test.com');
      const req = createMockReqFull({ params: { id: 'order-1' }, body: { status: 'delivered' } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'cliente@test.com', subject: expect.stringContaining('entregada') }),
      );
    });

    it('no debe enviar email si ya estaba delivered antes', async () => {
      const order = makeOrder({ status: 'delivered' });
      updateOrderStatusUseCase.execute.mockResolvedValue({ order, previousStatus: 'delivered' });
      const req = createMockReqFull({ params: { id: 'order-1' }, body: { status: 'delivered' } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('debe responder 400 si el estado es inválido', async () => {
      updateOrderStatusUseCase.execute.mockRejectedValue(new AppError('Estado inválido.', 400));
      const req = createMockReqFull({ params: { id: 'order-1' }, body: { status: 'bogus' } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('delete', () => {
    it('debe eliminar la orden y responder 200', async () => {
      deleteOrderUseCase.execute.mockResolvedValue(undefined);
      const req = createMockReqFull({ params: { id: 'order-1' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(deleteOrderUseCase.execute).toHaveBeenCalledWith({ orderId: 'order-1' });
    });

    it('debe responder 404 si la orden no existe', async () => {
      deleteOrderUseCase.execute.mockRejectedValue(new AppError('Orden no encontrada.', 404));
      const req = createMockReqFull({ params: { id: 'nope' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createManual', () => {
    it('debe crear la orden manual y responder 201', async () => {
      createManualOrderUseCase.execute.mockResolvedValue(makeOrder({ clientName: 'Juan' }).toPrimitives());
      const req = createMockReqFull({
        body: { items: [{ productId: 'prod-1', quantity: 1 }], clientName: 'Juan' },
      });
      const res = createMockRes();

      await controller.createManual(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ order: expect.objectContaining({ userName: 'Juan' }) }),
      );
    });

    it('debe responder 400 si falla la validación de negocio', async () => {
      createManualOrderUseCase.execute.mockRejectedValue(new AppError('Debe incluir al menos un producto.', 400));
      const req = createMockReqFull({ body: { items: [] } });
      const res = createMockRes();

      await controller.createManual(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
