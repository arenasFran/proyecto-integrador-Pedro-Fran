import { Request, Response } from 'express';
import { GetAllServicesUseCase } from '../../../application/use-cases/service/GetAllServicesUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

export class ServiceController {
  constructor(private readonly getAllServices: GetAllServicesUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const result = await this.getAllServices.execute();
      return AuthPresenter.success(res, { services: result }, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al obtener servicios');
    }
  };
}
