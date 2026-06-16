import { TempLockController } from '../../../../src/interface-adapters/controllers/tempLock/TempLockController';
import { CreateTempLockUseCase } from '../../../../src/application/use-cases/tempLock/CreateTempLockUseCase';
import { ReleaseTempLockUseCase } from '../../../../src/application/use-cases/tempLock/ReleaseTempLockUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';

describe('TempLockController', () => {
  let createTempLock: jest.Mocked<CreateTempLockUseCase>;
  let releaseTempLock: jest.Mocked<ReleaseTempLockUseCase>;
  let controller: TempLockController;

  beforeEach(() => {
    createTempLock = { execute: jest.fn() } as unknown as jest.Mocked<CreateTempLockUseCase>;
    releaseTempLock = { execute: jest.fn() } as unknown as jest.Mocked<ReleaseTempLockUseCase>;
    controller = new TempLockController(createTempLock, releaseTempLock);
  });

  describe('create', () => {
    it('debe crear un tempLock y responder 201', async () => {
      createTempLock.execute.mockResolvedValue({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });
      const req = createMockReq({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(createTempLock.execute).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });
    });

    it('debe manejar error y delegar en BarberPresenter', async () => {
      createTempLock.execute.mockRejectedValue(new AppError('Conflicto', 409));
      const req = createMockReq({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conflicto' });
    });
  });

  describe('release', () => {
    it('debe liberar un tempLock y responder 200', async () => {
      releaseTempLock.execute.mockResolvedValue(undefined);
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(releaseTempLock.execute).toHaveBeenCalledWith('temp-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'TempLock liberado' });
    });

    it('debe manejar error al liberar', async () => {
      releaseTempLock.execute.mockRejectedValue(new Error('Error interno'));
      const req = createMockReqFull({ params: { tempLockId: 'temp-1' } });
      const res = createMockRes();

      await controller.release(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al liberar el horario' });
    });
  });
});
