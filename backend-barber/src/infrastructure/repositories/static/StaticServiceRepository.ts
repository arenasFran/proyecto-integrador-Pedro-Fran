import { Service } from '../../../domain/entities/Service';
import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';
import { SERVICES } from '../../config/services';

export class StaticServiceRepository implements IServiceRepository {
  async findAll(): Promise<Service[]> {
    return SERVICES.map((data) => Service.create(data));
  }

  async findById(id: string): Promise<Service | null> {
    const data = SERVICES.find((s) => s.id === id);
    if (!data) return null;
    return Service.create(data);
  }
}
