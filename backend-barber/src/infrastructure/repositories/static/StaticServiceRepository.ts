import { Service } from '../../../domain/entities/Service';
import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';
import { SERVICES } from '../../config/services';
import { ServiceMapper } from '../../mappers/ServiceMapper';

export class StaticServiceRepository implements IServiceRepository {
  async findAll(): Promise<Service[]> {
    return SERVICES.map(ServiceMapper.fromStaticData);
  }
}
