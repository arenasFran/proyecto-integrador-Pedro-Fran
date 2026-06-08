import { ServiceController } from '../../../../src/interface-adapters/controllers/service/ServiceController';
import { GetAllServicesUseCase } from '../../../../src/application/use-cases/service/GetAllServicesUseCase';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('ServiceController', () => {
  let getAllServices: jest.Mocked<GetAllServicesUseCase>;
  let controller: ServiceController;

  beforeEach(() => {
    getAllServices = { execute: jest.fn() } as unknown as jest.Mocked<GetAllServicesUseCase>;
    controller = new ServiceController(getAllServices);
  });

  it('debe responder 200 con la lista de servicios', async () => {
    getAllServices.execute.mockResolvedValue([
      {
        id: 'svc-1',
        name: 'Corte de pelo',
        description: 'Incluye barba/cejas/lavado/bebida a eleccion',
        price: 490,
        imageUrl: 'https://example.com/corte.jpg',
      },
    ]);

    const req = createMockReq();
    const res = createMockRes();

    await controller.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      services: [
        {
          id: 'svc-1',
          name: 'Corte de pelo',
          description: 'Incluye barba/cejas/lavado/bebida a eleccion',
          price: 490,
          imageUrl: 'https://example.com/corte.jpg',
        },
      ],
    });
  });

  it('debe manejar error y responder 500', async () => {
    getAllServices.execute.mockRejectedValue(new Error('boom'));

    const req = createMockReq();
    const res = createMockRes();

    await controller.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener servicios' });
  });
});
