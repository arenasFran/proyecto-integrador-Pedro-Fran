import { ProductController } from '../../../../src/interface-adapters/controllers/product/ProductController';
import { Product } from '../../../../src/domain/entities/Product';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockProductRepository } from '../../../test-utils/mocks';

const makeProduct = () =>
  Product.restore({
    id: 'prod-1',
    name: 'Cera',
    description: 'desc',
    price: 100,
    stock: 10,
    minStock: 2,
    imageUrl: 'img.jpg',
    gallery: [],
    category: 'cuidado',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('ProductController', () => {
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let createProductUseCase: { execute: jest.Mock };
  let updateProductUseCase: { execute: jest.Mock };
  let deleteProductUseCase: { execute: jest.Mock };
  let controller: ProductController;

  beforeEach(() => {
    productRepository = makeMockProductRepository();
    createProductUseCase = { execute: jest.fn() };
    updateProductUseCase = { execute: jest.fn() };
    deleteProductUseCase = { execute: jest.fn() };
    controller = new ProductController(
      productRepository as any,
      createProductUseCase as any,
      updateProductUseCase as any,
      deleteProductUseCase as any,
    );
  });

  describe('getAll', () => {
    it('debe listar productos paginados', async () => {
      productRepository.findAll.mockResolvedValue({ data: [makeProduct()], total: 1, page: 1, totalPages: 1, limit: 20 });
      const req = createMockReqFull({ query: { page: '1', limit: '20' } });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(productRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    });

    it('debe responder 500 si el repositorio falla', async () => {
      productRepository.findAll.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPublicCatalog', () => {
    it('debe listar el catálogo sin filtrar productos inactivos', async () => {
      productRepository.findPublicCatalog.mockResolvedValue({
        data: [makeProduct()],
        total: 1,
        page: 1,
        totalPages: 1,
        limit: 100,
      });
      const req = createMockReqFull({ query: { limit: '100' } });
      const res = createMockRes();

      await controller.getPublicCatalog(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(productRepository.findPublicCatalog).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ products: expect.any(Array) }));
    });
  });

  describe('getById', () => {
    it('debe devolver el producto', async () => {
      productRepository.findById.mockResolvedValue(makeProduct());
      const req = createMockReqFull({ params: { id: 'prod-1' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ product: expect.objectContaining({ id: 'prod-1' }) }));
    });

    it('debe responder 404 si no existe', async () => {
      productRepository.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { id: 'prod-x' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('create', () => {
    it('debe crear el producto y responder 201', async () => {
      createProductUseCase.execute.mockResolvedValue(makeProduct().toPrimitives());
      const req = createMockReqFull({ body: { name: 'Cera', description: 'desc', price: 100, stock: 10 } });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(createProductUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: '', category: '' }));
    });

    it('debe responder 400 si falla la validación', async () => {
      createProductUseCase.execute.mockRejectedValue(new AppError('El precio debe ser positivo.', 400));
      const req = createMockReqFull({ body: { name: 'Cera', price: -1 } });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('update', () => {
    it('debe actualizar el producto', async () => {
      updateProductUseCase.execute.mockResolvedValue(makeProduct().toPrimitives());
      const req = createMockReqFull({ params: { id: 'prod-1' }, body: { price: 150 } });
      const res = createMockRes();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(updateProductUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ productId: 'prod-1', price: 150 }));
    });

    it('debe responder 404 si el producto no existe', async () => {
      updateProductUseCase.execute.mockRejectedValue(new AppError('Producto no encontrado.', 404));
      const req = createMockReqFull({ params: { id: 'prod-x' }, body: {} });
      const res = createMockRes();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('delete', () => {
    it('debe eliminar el producto', async () => {
      deleteProductUseCase.execute.mockResolvedValue(undefined);
      const req = createMockReqFull({ params: { id: 'prod-1' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 404 si no existe', async () => {
      deleteProductUseCase.execute.mockRejectedValue(new AppError('Producto no encontrado.', 404));
      const req = createMockReqFull({ params: { id: 'prod-x' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getCategories', () => {
    it('debe devolver las categorías', async () => {
      productRepository.getCategories.mockResolvedValue(['cuidado', 'accesorios']);
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.getCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ categories: ['cuidado', 'accesorios'] }));
    });

    it('debe responder 500 si falla', async () => {
      productRepository.getCategories.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.getCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
