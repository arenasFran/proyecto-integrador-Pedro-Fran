import { Request, Response } from 'express';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { CreateServiceUseCase } from '../../../application/use-cases/service/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../../../application/use-cases/service/UpdateServiceUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class ServiceController {
  constructor(
    private readonly serviceRepository: MongoServiceRepository,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase
  ) {}

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
      const services = await this.serviceRepository.findAllAdmin();
      return sendSuccess(res, { services: services.map((s) => s.toPrimitives()) }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener servicios');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const service = await this.createServiceUseCase.execute(req.body);
      return sendSuccess(res, { service: service.toPrimitives() }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear servicio');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const service = await this.updateServiceUseCase.execute({ id, ...req.body });
      return sendSuccess(res, { service: service.toPrimitives() }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar servicio');
    }
  };
}
