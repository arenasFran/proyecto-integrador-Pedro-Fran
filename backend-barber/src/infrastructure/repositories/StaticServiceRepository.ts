import { IServiceRepository } from '../../domain/repositories/IServiceRepository';
import { Service } from '../../domain/entities/Service';
import { SERVICES } from '../config/services';

export class StaticServiceRepository implements IServiceRepository {
  async findAll(): Promise<Service[]> {
    return SERVICES.map((s) =>
      Service.create({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes,
        imageUrl: s.imageUrl,
      })
    );
  }
}
