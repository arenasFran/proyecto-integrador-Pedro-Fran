import { User } from '../../domain/entities/User';

export interface IUserRepository {
  findEmailById(userId: string): Promise<string | null>;
  findByIds(ids: string[]): Promise<Map<string, User>>;
}