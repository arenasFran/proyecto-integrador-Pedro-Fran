import { TempLockController } from '../../../../src/interface-adapters/controllers/tempLock/TempLockController';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReq, createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockTempLockRepository } from '../../../test-utils/mocks';

describe('TempLockController', () => {
  let tempLockRepository: ReturnType<typeof makeMockTempLockRepository>;
  let controller: TempLockController;

  beforeEach(() => {
    tempLockRepository = makeMockTempLockRepository();
    controller = new TempLockController(tempLockRepository);
  });

  describe('create', () => {
    it('debe crear un tempLock y responder 201 con el ownerToken', async () => {
      tempLockRepository.create.mockResolvedValue({ id: 'temp-1', ownerToken: 'a'.repeat(64) });
      const req = createMockReq({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(tempLockRepository.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1', ownerToken: 'a'.repeat(64) });
    });

    it('debe manejar error de conflicto (ya apartado)', async () => {
      tempLockRepository.create.mockRejectedValue(new Error('El horario ya fue apartado'));
      const req = createMockReq({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'El horario ya fue apartado por otro usuario.' });
    });

    it('debe manejar error generico y responder 500', async () => {
      tempLockRepository.create.mockRejectedValue(new AppError('Error interno', 500));
      const req = createMockReq({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error interno' });
    });
  });

  describe('release', () => {
    it('debe liberar un tempLock con token valido y responder 200', async () => {
      tempLockRepository.release.mockResolvedValue('released');
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' }, body: { ownerToken: 'a'.repeat(64) } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(tempLockRepository.release).toHaveBeenCalledWith('temp-1', 'a'.repeat(64));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'TempLock liberado' });
    });

    it('debe responder 200 si el tempLock no existe (idempotente)', async () => {
      tempLockRepository.release.mockResolvedValue('not_found');
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' }, body: { ownerToken: 'a'.repeat(64) } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'TempLock liberado' });
    });

    it('debe responder 403 si el token no coincide', async () => {
      tempLockRepository.release.mockResolvedValue('forbidden');
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' }, body: { ownerToken: 'b'.repeat(64) } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No tenés permiso para liberar este horario.' });
    });

    it('debe responder 400 si falta el ownerToken', async () => {
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' }, body: {} });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe manejar error al liberar', async () => {
      tempLockRepository.release.mockRejectedValue(new Error('Error interno'));
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' }, body: { ownerToken: 'a'.repeat(64) } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al liberar el horario' });
    });
  });
});
