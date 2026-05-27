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
      expect(service.id).toBeTruthy();
      expect(service.name).toBeTruthy();
      expect(service.description).toBeTruthy();
      expect(service.price).toBeGreaterThan(0);
      expect(service.durationMinutes).toBeGreaterThan(0);
      expect(service.imageUrl).toBeTruthy();
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
