import { IPasswordResetRepository } from '../../../domain/repositories/IPasswordResetRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Password } from '../../../domain/value-objects/Password';
import { ResetPasswordDTO } from '../../dto/password/ResetPasswordDTO';
import { AppError } from '../../errors/AppError';
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly hashService: IHashService
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<{ message: string }> {
    Password.create(dto.password);

    const tokenHash = this.hashService.sha256(dto.token);
    const tokenDoc = await this.passwordResetRepository.verifyAndConsume(tokenHash);

    if (!tokenDoc) {
      throw new AppError('Token inválido o expirado', 400);
    }

    const hash = await this.passwordHasher.hash(dto.password);
    await this.userRepository.updatePassword(tokenDoc.userId, hash);

    return { message: 'Contraseña restablecida con éxito' };
  }
}
