import mongoose from 'mongoose';
import { ServiceController } from '../../../../src/interface-adapters/controllers/service/ServiceController';
import { MongoServiceRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoServiceRepository';
import { createMockReq, createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { Service } from '../../../../src/domain/entities/Service';
import { AppError } from '../../../../src/application/errors/AppError';

describe('ServiceController', () => {
  let serviceRepository: jest.Mocked<MongoServiceRepository>;
  let controller: ServiceController;

  beforeEach(() => {
    serviceRepository = {
      findAll: jest.fn(),
      findAllAdmin: jest.fn(),
      findById: jest.fn(),
      findByIdIncludingInactive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<MongoServiceRepository>;

    controller = new ServiceController(serviceRepository);
  });

  it('debe responder 200 con la lista de servicios', async () => {
    const service = Service.create({
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: '',
      isActive: true,
      isDeleted: false,
    });
    serviceRepository.findAll.mockResolvedValue([service]);

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

  it('debe responder 200 con array vacío si no hay servicios', async () => {
    serviceRepository.findAll.mockResolvedValue([]);

    const req = createMockReq();
    const res = createMockRes();

    await controller.getAll(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ services: [] })
    );
  });

  it('getAllAdmin debe responder 200 con todos los servicios', async () => {
    const service = Service.create({
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: '',
      isActive: true,
      isDeleted: false,
    });
    serviceRepository.findAllAdmin.mockResolvedValue([service]);

    const req = createMockReq();
    const res = createMockRes();

    await controller.getAllAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        services: expect.arrayContaining([
          expect.objectContaining({ name: 'Corte de pelo' }),
        ]),
      })
    );
  });

  it('getAllAdmin debe responder 200 con array vacío si no hay servicios', async () => {
    serviceRepository.findAllAdmin.mockResolvedValue([]);

    const req = createMockReq();
    const res = createMockRes();

    await controller.getAllAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ services: [] })
    );
  });

  it('create debe responder 201 con el servicio creado', async () => {
    const service = Service.create({
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Corte de pelo',
      description: 'Incluye barba',
      price: 490,
      imageUrl: '',
      isActive: true,
      isDeleted: false,
    });
    serviceRepository.create.mockResolvedValue(service);

    const req = createMockReq({ body: { name: 'Corte de pelo', description: 'Incluye barba', price: 490, imageUrl: '' } });
    const res = createMockRes();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        service: expect.objectContaining({ name: 'Corte de pelo' }),
      })
    );
  });

  it('create debe responder 409 si el nombre está duplicado', async () => {
    serviceRepository.create.mockRejectedValue(new AppError('Ya existe un servicio con ese nombre.', 409));

    const req = createMockReq({ body: { name: 'Duplicado', description: 'otro', price: 200, imageUrl: '' } });
    const res = createMockRes();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('update debe responder 200 con el servicio actualizado', async () => {
    const service = Service.create({
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Corte actualizado',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: '',
      isActive: true,
      isDeleted: false,
    });
    serviceRepository.update.mockResolvedValue(service);

    const req = createMockReqFull({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { name: 'Corte actualizado' } });
    const res = createMockRes();

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        service: expect.objectContaining({ name: 'Corte actualizado' }),
      })
    );
  });

  it('update debe responder 404 si el servicio no existe', async () => {
    serviceRepository.update.mockResolvedValue(null);

    const req = createMockReqFull({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { name: 'Corte actualizado' } });
    const res = createMockRes();

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('delete debe responder 200 con el servicio desactivado', async () => {
    const service = Service.create({
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Eliminar',
      description: '',
      price: 100,
      imageUrl: '',
      isActive: false,
      isDeleted: true,
    });
    serviceRepository.softDelete.mockResolvedValue(service);

    const req = createMockReqFull({ params: { id: new mongoose.Types.ObjectId().toString() } });
    const res = createMockRes();

    await controller.delete(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        service: expect.objectContaining({ isActive: false, isDeleted: true }),
      })
    );
  });

  it('delete debe responder 404 si el servicio no existe', async () => {
    serviceRepository.softDelete.mockResolvedValue(null);

    const req = createMockReqFull({ params: { id: new mongoose.Types.ObjectId().toString() } });
    const res = createMockRes();

    await controller.delete(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
