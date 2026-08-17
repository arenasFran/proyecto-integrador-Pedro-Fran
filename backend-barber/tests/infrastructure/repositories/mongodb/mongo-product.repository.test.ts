import { MongoProductRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoProductRepository';
import { ProductModel } from '../../../../src/infrastructure/repositories/mongodb/models/product.model';
import { Product } from '../../../../src/domain/entities/Product';
import type { ProductStatus } from '../../../../src/domain/types/product.types';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoProductRepository', () => {
  let repository: MongoProductRepository;

  const createProductDoc = (overrides: Partial<{ name: string; status: ProductStatus; category: string; stock: number }> = {}) =>
    ProductModel.create({
      name: overrides.name ?? 'Cera',
      description: 'Fija el pelo',
      price: 100,
      stock: overrides.stock ?? 10,
      minStock: 5,
      imageUrl: 'img.jpg',
      category: overrides.category ?? 'cuidado',
      status: overrides.status ?? 'active',
    });

  beforeEach(() => {
    repository = new MongoProductRepository();
  });

  afterEach(async () => {
    await ProductModel.deleteMany({});
  });

  describe('findById', () => {
    it('debe devolver el producto reconstruido', async () => {
      const doc = await createProductDoc();
      const found = await repository.findById(doc._id.toString());
      expect(found!.name).toBe('Cera');
    });

    it('debe devolver null si no existe', async () => {
      const found = await repository.findById('507f1f77bcf86cd799439011');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('debe filtrar solo activos por defecto', async () => {
      await createProductDoc({ status: 'active' });
      await createProductDoc({ status: 'inactive', name: 'Gel' });

      const result = await repository.findAll();

      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('active');
    });

    it('debe devolver todos los status cuando status=all', async () => {
      await createProductDoc({ status: 'active' });
      await createProductDoc({ status: 'inactive', name: 'Gel' });

      const result = await repository.findAll({ status: 'all' });

      expect(result.total).toBe(2);
    });

    it('debe filtrar por category', async () => {
      await createProductDoc({ category: 'cuidado' });
      await createProductDoc({ category: 'accesorios', name: 'Peine' });

      const result = await repository.findAll({ status: 'all', category: 'accesorios' });

      expect(result.total).toBe(1);
      expect(result.data[0].category).toBe('accesorios');
    });

    it('debe buscar por texto en nombre o descripción', async () => {
      await createProductDoc({ name: 'Cera especial' });
      await createProductDoc({ name: 'Shampoo' });

      const result = await repository.findAll({ search: 'especial' });

      expect(result.total).toBe(1);
    });

    it('debe tratar caracteres especiales de regex como texto literal (ReDoS safety)', async () => {
      await createProductDoc({ name: 'Cera (especial)' });
      await createProductDoc({ name: 'Shampoo' });

      const start = Date.now();
      const result = await repository.findAll({ search: '(a+)+$' });
      const elapsed = Date.now() - start;

      expect(result.total).toBe(0);
      expect(elapsed).toBeLessThan(2000);
    });

    it('debe paginar los resultados', async () => {
      for (let i = 0; i < 3; i++) await createProductDoc({ name: `Producto ${i}` });

      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('save', () => {
    it('debe crear un producto nuevo', async () => {
      const product = Product.create({
        name: 'Nuevo',
        description: 'desc',
        price: 200,
        stock: 5,
        imageUrl: 'img.jpg',
        category: 'cuidado',
      });

      const saved = await repository.save(product);

      expect(saved.id).toBeTruthy();
      const found = await ProductModel.findById(saved.id);
      expect(found!.name).toBe('Nuevo');
    });

    it('debe actualizar un producto existente', async () => {
      const doc = await createProductDoc();
      const product = await repository.findById(doc._id.toString());
      product!.update({ price: 250 });

      await repository.save(product!);

      const updated = await ProductModel.findById(doc._id);
      expect(updated!.price).toBe(250);
    });
  });

  describe('atomicDecreaseStock', () => {
    it('debe descontar stock si hay suficiente', async () => {
      const doc = await createProductDoc({ stock: 10 });
      const ok = await repository.atomicDecreaseStock(doc._id.toString(), 4);
      expect(ok).toBe(true);
      const updated = await ProductModel.findById(doc._id);
      expect(updated!.stock).toBe(6);
    });

    it('debe devolver false si no hay stock suficiente', async () => {
      const doc = await createProductDoc({ stock: 2 });
      const ok = await repository.atomicDecreaseStock(doc._id.toString(), 5);
      expect(ok).toBe(false);
      const updated = await ProductModel.findById(doc._id);
      expect(updated!.stock).toBe(2);
    });
  });

  describe('atomicIncreaseStock', () => {
    it('debe sumar stock', async () => {
      const doc = await createProductDoc({ stock: 5 });
      await repository.atomicIncreaseStock(doc._id.toString(), 3);
      const updated = await ProductModel.findById(doc._id);
      expect(updated!.stock).toBe(8);
    });
  });

  describe('getCategories', () => {
    it('debe devolver las categorías distintas excluyendo eliminados', async () => {
      await createProductDoc({ category: 'cuidado' });
      await createProductDoc({ category: 'accesorios', name: 'Peine' });
      await createProductDoc({ category: 'descontinuado', name: 'Viejo', status: 'deleted' });

      const categories = await repository.getCategories();

      expect(categories.sort()).toEqual(['accesorios', 'cuidado']);
    });
  });
});
