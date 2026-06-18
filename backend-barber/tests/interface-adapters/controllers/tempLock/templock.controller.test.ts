import { TempLockController } from '../../../../src/interface-adapters/controllers/tempLock/TempLockController';
import { AppError } from '../../../../src/application/errors/AppError';
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
    it('debe crear un tempLock y responder 201', async () => {
      tempLockRepository.create.mockResolvedValue('temp-1');
      const req = createMockReq({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(tempLockRepository.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });
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
    it('debe liberar un tempLock y responder 200', async () => {
      tempLockRepository.findById.mockResolvedValue({ _id: 'temp-1' });
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(tempLockRepository.findById).toHaveBeenCalledWith('temp-1');
      expect(tempLockRepository.deleteById).toHaveBeenCalledWith('temp-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'TempLock liberado' });
    });

    it('debe responder 200 si el tempLock no existe', async () => {
      tempLockRepository.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'TempLock liberado' });
    });

    it('debe manejar error al liberar', async () => {
      tempLockRepository.findById.mockRejectedValue(new Error('Error interno'));
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al liberar el horario' });
    });
  });
});
