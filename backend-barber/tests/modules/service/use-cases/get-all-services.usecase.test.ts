import { AppError } from '../../../../src/application/errors/AppError';
import { GetAllServicesUseCase } from '../../../../src/application/use-cases/service/GetAllServicesUseCase';
import { Service, ServicePrimitives } from '../../../../src/domain/entities/Service';
import { IServiceRepository } from '../../../../src/domain/repositories/IServiceRepository';

describe('GetAllServicesUseCase', () => {
  const makeService = (overrides?: Partial<ServicePrimitives>) => {
    const service = Service.create({
      id: 'svc-1',
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a eleccion',
      price: 490,
      durationMinutes: 50,
      imageUrl: 'https://example.com/corte.jpg',
    });

    return overrides ? Service.create({ ...service.toPrimitives(), ...overrides }) : service;
  };

  let serviceRepository: jest.Mocked<IServiceRepository>;
  let useCase: GetAllServicesUseCase;

  beforeEach(() => {
    serviceRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    useCase = new GetAllServicesUseCase(serviceRepository);
  });

  it('debe devolver servicios en formato plano', async () => {
    const services = [
      makeService(),
      makeService({ id: 'svc-2', name: 'Barba', price: 250 }),
    ];
    serviceRepository.findAll.mockResolvedValue(services);

    const result = await useCase.execute();

    expect(serviceRepository.findAll).toHaveBeenCalled();
    expect(result).toEqual(services.map((service) => service.toPrimitives()));
  });

  it('debe lanzar AppError si no hay servicios', async () => {
    serviceRepository.findAll.mockResolvedValue([]);

    await expect(useCase.execute()).rejects.toBeInstanceOf(AppError);
  });
});
