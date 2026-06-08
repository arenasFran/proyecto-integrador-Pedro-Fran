import { Client } from '../entities/Client';

export type UnregisteredClientData = {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
};

export interface IClientRepository {
  findByEmail(email: string): Promise<Client | null>;
  findByPhone(phone: string): Promise<Client | null>;
  createUnregistered(data: UnregisteredClientData): Promise<Client>;
}