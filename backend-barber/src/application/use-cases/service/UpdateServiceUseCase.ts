import { Service, type ServiceStatus } from '../../../domain/entities/Service';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface UpdateServiceDTO {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  status?: ServiceStatus;
}

export class UpdateServiceUseCase {
  constructor(
    private readonly serviceRepository: MongoServiceRepository
  ) {}

  async execute(dto: UpdateServiceDTO): Promise<Service> {
    const { id, ...data } = dto;
    const service = await this.serviceRepository.update(id, data);
    if (!service) {
      throw new AppError('Servicio no encontrado', 404);
    }
    return service;
  }
}
