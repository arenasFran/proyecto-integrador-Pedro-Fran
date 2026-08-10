import { Product } from '../../../src/domain/entities/Product';

describe('Product entity', () => {
  const makeData = (overrides?: Partial<{
    name: string;
    description: string;
    price: number;
    stock: number;
    minStock: number;
    imageUrl: string;
    gallery: string[];
    category: string;
  }>) => ({
    name: 'Cera para barba',
    description: 'Fija y da brillo',
    price: 500,
    stock: 10,
    imageUrl: 'https://example.com/img.jpg',
    category: 'cuidado',
    ...overrides,
  });

  describe('create', () => {
    it('debe crear el producto con status active', () => {
      const product = Product.create(makeData());
      expect(product.status).toBe('active');
    });

    it('debe usar minStock 5 por defecto', () => {
      const product = Product.create(makeData());
      expect(product.minStock).toBe(5);
    });

    it('debe permitir un minStock personalizado', () => {
      const product = Product.create(makeData({ minStock: 2 }));
      expect(product.minStock).toBe(2);
    });

    it('debe usar un gallery vacío por defecto', () => {
      const product = Product.create(makeData());
      expect(product.gallery).toEqual([]);
    });

    it('el getter gallery debe devolver una copia (no la referencia interna)', () => {
      const product = Product.create(makeData({ gallery: ['a.jpg'] }));
      const gallery = product.gallery;
      gallery.push('b.jpg');
      expect(product.gallery).toEqual(['a.jpg']);
    });

    it('no debe mantener la referencia al array gallery original pasado por el caller', () => {
      const gallery = ['a.jpg'];
      const product = Product.create(makeData({ gallery }));
      gallery.push('b.jpg');
      expect(product.gallery).toEqual(['a.jpg']);
    });
  });

  describe('isLowStock', () => {
    it('debe ser true cuando el stock es igual al minStock', () => {
      const product = Product.create(makeData({ stock: 5, minStock: 5 }));
      expect(product.isLowStock).toBe(true);
    });

    it('debe ser true cuando el stock es menor al minStock', () => {
      const product = Product.create(makeData({ stock: 2, minStock: 5 }));
      expect(product.isLowStock).toBe(true);
    });

    it('debe ser false cuando el stock es mayor al minStock', () => {
      const product = Product.create(makeData({ stock: 10, minStock: 5 }));
      expect(product.isLowStock).toBe(false);
    });
  });

  describe('update', () => {
    it('debe actualizar solo los campos provistos', () => {
      const product = Product.create(makeData());
      product.update({ price: 600 });
      expect(product.price).toBe(600);
      expect(product.name).toBe('Cera para barba');
    });

    it('debe actualizar todos los campos cuando se proveen', () => {
      const product = Product.create(makeData());
      product.update({
        name: 'Nuevo nombre',
        description: 'Nueva desc',
        price: 700,
        stock: 20,
        minStock: 3,
        imageUrl: 'https://example.com/new.jpg',
        gallery: ['x.jpg'],
        category: 'nueva',
        status: 'inactive',
      });
      expect(product.name).toBe('Nuevo nombre');
      expect(product.description).toBe('Nueva desc');
      expect(product.price).toBe(700);
      expect(product.stock).toBe(20);
      expect(product.minStock).toBe(3);
      expect(product.imageUrl).toBe('https://example.com/new.jpg');
      expect(product.gallery).toEqual(['x.jpg']);
      expect(product.category).toBe('nueva');
      expect(product.status).toBe('inactive');
    });

    it('no debe modificar un campo si se pasa undefined', () => {
      const product = Product.create(makeData({ price: 500 }));
      product.update({ price: undefined });
      expect(product.price).toBe(500);
    });
  });

  describe('activate / deactivate / delete', () => {
    it('debe activar el producto', () => {
      const product = Product.create(makeData());
      product.deactivate();
      product.activate();
      expect(product.status).toBe('active');
    });

    it('debe desactivar el producto', () => {
      const product = Product.create(makeData());
      product.deactivate();
      expect(product.status).toBe('inactive');
    });

    it('debe marcar el producto como eliminado', () => {
      const product = Product.create(makeData());
      product.delete();
      expect(product.status).toBe('deleted');
    });
  });

  describe('decreaseStock', () => {
    it('debe restar la cantidad indicada del stock', () => {
      const product = Product.create(makeData({ stock: 10 }));
      product.decreaseStock(4);
      expect(product.stock).toBe(6);
    });

    it('debe lanzar error si no hay stock suficiente', () => {
      const product = Product.create(makeData({ stock: 3 }));
      expect(() => product.decreaseStock(5)).toThrow(/Stock insuficiente/);
    });

    it('debe permitir dejar el stock en 0', () => {
      const product = Product.create(makeData({ stock: 5 }));
      product.decreaseStock(5);
      expect(product.stock).toBe(0);
    });
  });

  describe('restoreStock', () => {
    it('debe sumar la cantidad indicada al stock', () => {
      const product = Product.create(makeData({ stock: 10 }));
      product.restoreStock(3);
      expect(product.stock).toBe(13);
    });
  });

  describe('restore', () => {
    it('debe reconstruir un producto a partir de props persistidas', () => {
      const now = new Date();
      const product = Product.restore({
        id: 'prod-1',
        name: 'X',
        description: 'Y',
        price: 100,
        stock: 5,
        minStock: 1,
        imageUrl: 'img.jpg',
        gallery: [],
        category: 'cat',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      expect(product.id).toBe('prod-1');
      expect(product.status).toBe('active');
    });
  });

  describe('toPrimitives', () => {
    it('debe devolver un objeto plano con las propiedades del producto', () => {
      const product = Product.create(makeData());
      const primitives = product.toPrimitives();
      expect(primitives).toMatchObject({ name: 'Cera para barba', price: 500, stock: 10 });
    });
  });
});
