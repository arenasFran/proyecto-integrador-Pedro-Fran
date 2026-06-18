import { ServiceController } from '../../../../src/interface-adapters/controllers/service/ServiceController';
import { StaticServiceRepository } from '../../../../src/infrastructure/repositories/static/StaticServiceRepository';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('ServiceController', () => {
  let serviceRepository: StaticServiceRepository;
  let controller: ServiceController;

  beforeEach(() => {
    serviceRepository = new StaticServiceRepository();
    controller = new ServiceController(serviceRepository);
  });

  it('debe responder 200 con la lista de servicios', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        services: expect.arrayContaining([
          expect.objectContaining({ name: 'Corte de pelo' }),
        ]),
      })
    );
  });
});
