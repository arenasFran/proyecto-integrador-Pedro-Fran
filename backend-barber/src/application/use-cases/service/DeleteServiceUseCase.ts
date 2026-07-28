import { Service } from '../../../domain/entities/Service';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface DeleteServiceDTO {
  id: string;
}

export class DeleteServiceUseCase {
  constructor(
    private readonly serviceRepository: MongoServiceRepository
  ) {}

  async execute(dto: DeleteServiceDTO): Promise<Service> {
    const service = await this.serviceRepository.softDelete(dto.id);
    if (!service) {
      throw new AppError('Servicio no encontrado', 404);
    }
    return service;
  }
}
