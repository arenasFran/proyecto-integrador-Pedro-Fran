import { Service } from '../../domain/entities/Service';
import { ServiceData } from '../config/services';

export class ServiceMapper {
  static fromStaticData(data: ServiceData): Service {
    return Service.create({
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      durationMinutes: data.durationMinutes,
      imageUrl: data.imageUrl,
    });
  }
}
