import mongoose from 'mongoose';
import { ServiceController } from '../../../../src/interface-adapters/controllers/service/ServiceController';
import { MongoServiceRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoServiceRepository';
import { createMockReq, createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { Service } from '../../../../src/domain/entities/Service';
import { AppError } from '../../../../src/domain/errors/AppError';

describe('ServiceController', () => {
  let serviceRepository: jest.Mocked<MongoServiceRepository>;
  let createServiceUseCase: { execute: jest.Mock };
  let updateServiceUseCase: { execute: jest.Mock };
  let controller: ServiceController;

  beforeEach(() => {
    serviceRepository = {
      findAll: jest.fn(),
      findAllAdmin: jest.fn(),
      findById: jest.fn(),
      findByIdIncludingInactive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<MongoServiceRepository>;

    createServiceUseCase = { execute: jest.fn() };
    updateServiceUseCase = { execute: jest.fn() };
    controller = new ServiceController(serviceRepository, createServiceUseCase as any, updateServiceUseCase as any);
  });

  it('debe responder 200 con la lista de servicios', async () => {
    const service = Service.create({
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: '',
      status: 'active',
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
      status: 'active',
    });
    serviceRepository.findAllAdmin.mockResolvedValue([service]);

    const req = createMockReqFull({ query: {} });
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

    const req = createMockReqFull({ query: {} });
    const res = createMockRes();

    await controller.getAllAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ services: [] })
    );
  });

  it('create debe responder 201 con el servicio creado', async () => {
    createServiceUseCase.execute.mockResolvedValue({ toPrimitives: () => ({ name: 'Corte de pelo', id: 'svc-1' }) });

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
    createServiceUseCase.execute.mockRejectedValue(new AppError('Ya existe un servicio con ese nombre.', 409));

    const req = createMockReq({ body: { name: 'Duplicado', description: 'otro', price: 200, imageUrl: '' } });
    const res = createMockRes();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('update debe responder 200 con el servicio actualizado', async () => {
    updateServiceUseCase.execute.mockResolvedValue({ toPrimitives: () => ({ name: 'Corte actualizado', id: 'svc-1' }) });

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
    updateServiceUseCase.execute.mockRejectedValue(new AppError('Servicio no encontrado.', 404));

    const req = createMockReqFull({ params: { id: new mongoose.Types.ObjectId().toString() }, body: { name: 'Corte actualizado' } });
    const res = createMockRes();

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
