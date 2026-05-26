import { Service } from '../entities/Service';

export interface IServiceRepository {
  findAll(): Promise<Service[]>;
}
