import { Client } from '../../../domain/entities/Client';
import {
  IClientRepository,
  UnregisteredClientData,
} from '../../../domain/repositories/IClientRepository';
import { ClientMapper } from '../../mappers/ClientMapper';
import { UnregisteredClient } from './models/client.model';

export class MongoClientRepository implements IClientRepository {
  async findByEmail(email: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ contactEmail: email }).lean();
    if (!doc) return null;
    return ClientMapper.fromDocument(doc);
  }

  async findByPhone(phone: string): Promise<Client | null> {
    const doc = await UnregisteredClient.findOne({ phone }).lean();
    if (!doc) return null;
    return ClientMapper.fromDocument(doc);
  }

  async createUnregistered(data: UnregisteredClientData): Promise<Client> {
    const doc = await UnregisteredClient.create({
      name: data.name,
      lastname: data.lastname,
      phone: data.phone,
      contactEmail: data.contactEmail,
    });
    return ClientMapper.fromDocument(doc);
  }
}