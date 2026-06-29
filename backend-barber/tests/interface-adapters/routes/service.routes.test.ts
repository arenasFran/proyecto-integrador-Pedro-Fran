jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app';
import ServiceModel from '../../../src/infrastructure/repositories/mongodb/models/service.model';
import { seedService, seedAdmin, signToken } from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Service routes — integración real', () => {
  beforeEach(async () => {
    await ServiceModel.deleteMany({});
  });

  it('debe devolver servicios activos sin auth', async () => {
    await seedService({ name: 'Corte de pelo', price: 490 });
    await seedService({ name: 'Barba', price: 250 });

    const response = await request(app).get('/api/services');

    expect(response.status).toBe(200);
    expect(response.body.services).toHaveLength(2);
  });

  it('debe devolver 200 con array vacío si no hay servicios activos', async () => {
    await seedService({ name: 'Inactivo', price: 100, isActive: false });

    const response = await request(app).get('/api/services');

    expect(response.status).toBe(200);
    expect(response.body.services).toEqual([]);
  });

  it('debe permitir crear servicio como admin', async () => {
    const { adminId } = await seedAdmin();
    const { token } = signToken({ id: adminId, kind: 'Admin' });

    const response = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Nuevo servicio',
        description: 'Descripción',
        price: 300,
      });

    expect(response.status).toBe(201);
    expect(response.body.service.name).toBe('Nuevo servicio');
  });

  it('debe rechazar crear servicio sin auth', async () => {
    const response = await request(app)
      .post('/api/services')
      .send({
        name: 'Nuevo servicio',
        description: 'Descripción',
        price: 300,
      });

    expect(response.status).toBe(401);
  });

  it('debe rechazar nombre duplicado', async () => {
    const { adminId } = await seedAdmin();
    const { token } = signToken({ id: adminId, kind: 'Admin' });

    await seedService({ name: 'Duplicado', price: 100 });

    const response = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Duplicado',
        description: 'otro',
        price: 200,
      });

    expect(response.status).toBe(409);
  });

  it('debe actualizar servicio como admin', async () => {
    const { adminId } = await seedAdmin();
    const { token } = signToken({ id: adminId, kind: 'Admin' });
    const { serviceId } = await seedService({ name: 'Original', price: 100 });

    const response = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 200 });

    expect(response.status).toBe(200);
    expect(response.body.service.price).toBe(200);
  });

  it('debe hacer soft-delete como admin', async () => {
    const { adminId } = await seedAdmin();
    const { token } = signToken({ id: adminId, kind: 'Admin' });
    const { serviceId } = await seedService({ name: 'Eliminar', price: 100 });

    const response = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.service.isDeleted).toBe(true);
  });
});
