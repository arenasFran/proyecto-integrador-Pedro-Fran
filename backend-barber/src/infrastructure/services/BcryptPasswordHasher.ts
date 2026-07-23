import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../application/ports/IPasswordHasher';

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(raw: string): Promise<string> {
    return bcrypt.hash(raw, 10);
  }

  async compare(raw: string, hash: string): Promise<boolean> {
    return bcrypt.compare(raw, hash);
  }
}
