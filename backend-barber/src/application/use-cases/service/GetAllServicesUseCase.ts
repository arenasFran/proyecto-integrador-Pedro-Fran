import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';
import { ServiceResponseDTO } from '../../dto/service/ServiceResponseDTO';
import { AppError } from '../../errors/AppError';

export class GetAllServicesUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(): Promise<ServiceResponseDTO[]> {
    const services = await this.serviceRepository.findAll();
    if (services.length === 0) {
      throw new AppError('No hay servicios disponibles', 404);
    }

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes,
      imageUrl: service.imageUrl,
    }));
  }
}
