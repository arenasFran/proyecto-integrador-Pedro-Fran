import { Request, Response } from 'express';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class ServiceController {
  constructor(private readonly serviceRepository: MongoServiceRepository) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const services = await this.serviceRepository.findAll();
      return sendSuccess(res, { services: services.map((s) => s.toPrimitives()) }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener servicios');
    }
  };

  getAllAdmin = async (req: Request, res: Response) => {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const services = await this.serviceRepository.findAllAdmin(includeDeleted);
      return sendSuccess(res, { services: services.map((s) => s.toPrimitives()) }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener servicios');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const service = await this.serviceRepository.create(req.body);
      return sendSuccess(res, { service: service.toPrimitives() }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear servicio');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const service = await this.serviceRepository.update(id, req.body);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }
      return sendSuccess(res, { service: service.toPrimitives() }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar servicio');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const service = await this.serviceRepository.softDelete(id);
      if (!service) {
        throw new AppError('Servicio no encontrado', 404);
      }
      return sendSuccess(res, { service: service.toPrimitives() }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al eliminar servicio');
    }
  };

  restore = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const service = await this.serviceRepository.restore(id);
      if (!service) {
        throw new AppError('Servicio no encontrado o no está eliminado', 404);
      }
      return sendSuccess(res, { service: service.toPrimitives() }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al restaurar servicio');
    }
  };
}


