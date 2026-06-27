import { Request, Response } from 'express';
import { StaticServiceRepository } from '../../../infrastructure/repositories/static/StaticServiceRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class ServiceController {
  constructor(private readonly serviceRepository: StaticServiceRepository) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const services = await this.serviceRepository.findAll();
      if (services.length === 0) {
        throw new AppError('No hay servicios disponibles', 404);
      }
      return sendSuccess(res, { services: services.map((s) => s.toPrimitives()) }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener servicios');
    }
  };
}


