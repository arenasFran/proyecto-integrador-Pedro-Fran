import { Password } from '../../../domain/value-objects/Password';
import { AppError } from '../../../domain/errors/AppError';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export interface ChangePasswordDTO {
  userId: string;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface ChangePasswordResult {
  email: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository
  ) {}

  async execute(dto: ChangePasswordDTO): Promise<ChangePasswordResult> {
    if (dto.newPassword !== dto.newPasswordConfirmation) {
      throw new AppError('Las contraseñas nuevas no coinciden.', 400);
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new AppError('La nueva contraseña debe ser diferente a la actual.', 400);
    }

    Password.create(dto.newPassword);

    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const isCurrentPasswordValid = await this.passwordHasher.compare(
      dto.currentPassword,
      user.passwordHash!
    );
    if (!isCurrentPasswordValid) {
      throw new AppError('Contraseña actual incorrecta.', 401);
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);

    await this.userRepository.updatePassword(dto.userId, newPasswordHash);
    await this.refreshTokenRepository.revokeAllByUserId(dto.userId);

    return { email: user.email };
  }
}
