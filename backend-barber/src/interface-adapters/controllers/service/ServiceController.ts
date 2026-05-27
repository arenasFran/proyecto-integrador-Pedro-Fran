import { Request, Response } from 'express';
import { GetAllServicesUseCase } from '../../../application/use-cases/service/GetAllServicesUseCase';
import { ServicePresenter } from '../../presenters/ServicePresenter';

export class ServiceController {
  constructor(private readonly getAllServices: GetAllServicesUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const result = await this.getAllServices.execute();
      return ServicePresenter.success(res, { services: result }, 200);
    } catch (error) {
      return ServicePresenter.handleError(res, error, 'Error al obtener servicios');
    }
  };
}
