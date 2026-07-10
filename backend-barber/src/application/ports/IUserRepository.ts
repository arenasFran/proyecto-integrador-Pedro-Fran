export interface IUserRepository {
  findEmailById(userId: string): Promise<string | null>;
}