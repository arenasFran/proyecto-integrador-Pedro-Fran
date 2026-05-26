import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class GetAllServicesUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(): Promise<Record<string, unknown>[]> {
    const services = await this.serviceRepository.findAll();
    return services.map((s) => s.toPrimitives());
  }
}
