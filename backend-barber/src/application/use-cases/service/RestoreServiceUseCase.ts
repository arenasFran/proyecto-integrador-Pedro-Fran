import { Service } from '../../../domain/entities/Service';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface RestoreServiceDTO {
  id: string;
}

export class RestoreServiceUseCase {
  constructor(
    private readonly serviceRepository: MongoServiceRepository
  ) {}

  async execute(dto: RestoreServiceDTO): Promise<Service> {
    const service = await this.serviceRepository.restore(dto.id);
    if (!service) {
      throw new AppError('Servicio no encontrado o no está eliminado', 404);
    }
    return service;
  }
}
