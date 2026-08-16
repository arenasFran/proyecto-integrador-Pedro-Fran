import { AppError } from '../../../domain/errors/AppError';
import { Email } from '../../../domain/value-objects/Email';
import { MongoPasswordResetRepository } from '../../../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IHashService } from '../../ports/IHashService';
import { assertNotLocked, registerFailedAttempt } from './resetLockout';

type VerifyResetCodeDTO = {
  email: string;
  code: string;
};

export class VerifyPasswordResetCodeUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordResetRepository: MongoPasswordResetRepository,
    private readonly hashService: IHashService
  ) {}

  async execute(dto: VerifyResetCodeDTO): Promise<{ message: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Código inválido o expirado.', 400);
    }

    assertNotLocked(user);

    const codeHash = this.hashService.sha256(dto.code.trim());
    const tokenDoc = await this.passwordResetRepository.verify(codeHash);

    if (!tokenDoc || tokenDoc.userId !== user.id) {
      await registerFailedAttempt(this.userRepository, user);
      throw new AppError('Código inválido o expirado.', 400);
    }

    return { message: 'Código verificado.' };
  }
}
