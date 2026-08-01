import { Service } from '../../../domain/entities/Service';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';

export interface CreateServiceDTO {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

export class CreateServiceUseCase {
  constructor(
    private readonly serviceRepository: MongoServiceRepository
  ) {}

  async execute(dto: CreateServiceDTO): Promise<Service> {
    const service = await this.serviceRepository.create(dto);
    return service;
  }
}
