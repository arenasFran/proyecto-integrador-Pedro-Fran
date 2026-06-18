import { Request, Response } from 'express';
import { CreateTempLockUseCase } from '../../../application/use-cases/tempLock/CreateTempLockUseCase';
import { ReleaseTempLockUseCase } from '../../../application/use-cases/tempLock/ReleaseTempLockUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class TempLockController {
  constructor(
    private readonly createTempLock: CreateTempLockUseCase,
    private readonly releaseTempLock: ReleaseTempLockUseCase
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createTempLock.execute(req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      return sendError(res, error, 'Error al apartar el horario');
    }
  };

  release = async (req: Request, res: Response) => {
    try {
      const tempLockId = req.params.tempLockId as string;
      await this.releaseTempLock.execute(tempLockId);
      return sendSuccess(res, { message: 'TempLock liberado' });
    } catch (error) {
      return sendError(res, error, 'Error al liberar el horario');
    }
  };
}