import { Request, Response } from 'express';
import { CreateTempLockUseCase } from '../../../application/use-cases/tempLock/CreateTempLockUseCase';
import { BarberPresenter } from '../../presenters/BarberPresenter';

export class TempLockController {
  constructor(
    private readonly createTempLock: CreateTempLockUseCase
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createTempLock.execute(req.body);
      return BarberPresenter.success(res, result, 201);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al apartar el horario');
    }
  };
}