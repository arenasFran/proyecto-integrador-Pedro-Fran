import { Request, Response } from 'express';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class TempLockController {
  constructor(
    private readonly tempLockRepository: MongoTempLockRepository
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const { id: tempLockId, ownerToken } = await this.tempLockRepository.create(req.body);
      return sendSuccess(res, { message: 'Slot apartado temporalmente', tempLockId, ownerToken }, 201);
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
      const ownerToken = req.body?.ownerToken as string;
      if (!ownerToken) {
        return sendError(res, new AppError('Falta el token del horario.', 400), 'Error al liberar el horario');
      }

      const result = await this.tempLockRepository.release(tempLockId, ownerToken);
      if (result === 'forbidden') {
        return sendError(res, new AppError('No tenés permiso para liberar este horario.', 403), 'Error al liberar el horario');
      }
      return sendSuccess(res, { message: 'TempLock liberado' });
    } catch (error) {
      return sendError(res, error, 'Error al liberar el horario');
    }
  };
}

