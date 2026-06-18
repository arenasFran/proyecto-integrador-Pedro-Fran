import { Request, Response } from 'express';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../application/errors/AppError';

export class TempLockController {
  constructor(
    private readonly tempLockRepository: MongoTempLockRepository
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const tempLockId = await this.tempLockRepository.create(req.body);
      return sendSuccess(res, { message: 'Slot apartado temporalmente', tempLockId }, 201);
    } catch (error: any) {
      if (error?.message?.includes('ya fue apartado')) {
        return sendError(res, new AppError('El horario ya fue apartado por otro usuario.', 409), 'Error al apartar el horario');
      }
      return sendError(res, error, 'Error al apartar el horario');
    }
  };

  release = async (req: Request, res: Response) => {
    try {
      const tempLockId = req.params.tempLockId as string;
      const lock = await this.tempLockRepository.findById(tempLockId);
      if (lock) {
        await this.tempLockRepository.deleteById(tempLockId);
      }
      return sendSuccess(res, { message: 'TempLock liberado' });
    } catch (error) {
      return sendError(res, error, 'Error al liberar el horario');
    }
  };
}