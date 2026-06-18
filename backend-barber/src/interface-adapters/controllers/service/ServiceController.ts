import { Request, Response } from 'express';
import { GetAllServicesUseCase } from '../../../application/use-cases/service/GetAllServicesUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class ServiceController {
  constructor(private readonly getAllServices: GetAllServicesUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const result = await this.getAllServices.execute();
      return sendSuccess(res, { services: result }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener servicios');
    }
  };
}
