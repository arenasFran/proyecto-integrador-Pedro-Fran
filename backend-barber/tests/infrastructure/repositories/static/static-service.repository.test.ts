import { Service } from '../../../../src/domain/entities/Service';
import { StaticServiceRepository } from '../../../../src/infrastructure/repositories/static/StaticServiceRepository';

describe('StaticServiceRepository', () => {
  let repo: StaticServiceRepository;

  beforeEach(() => {
    repo = new StaticServiceRepository();
  });

  it('debe retornar 4 servicios', async () => {
    const services = await repo.findAll();
    expect(services).toHaveLength(4);
  });

  it('cada servicio debe tener todos los campos requeridos', async () => {
    const services = await repo.findAll();

    services.forEach((service) => {
      expect(service.id).toEqual(expect.any(String));
      expect(service.name).toEqual(expect.any(String));
      expect(service.description).toEqual(expect.any(String));
      expect(service.price).toBeGreaterThan(0);
      expect(service.imageUrl).toEqual(expect.any(String));
    });
  });

  it('debe retornar instancias de Service', async () => {
    const services = await repo.findAll();

    services.forEach((service) => {
      expect(service).toBeInstanceOf(Service);
      expect(typeof service.toPrimitives).toBe('function');
    });
  });
});
