import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { TwoFactorVerifyDTO } from '../../dto/auth/TwoFactorVerifyDTO';
import { AppError } from '../../errors/AppError';
import { IDateTimeProvider } from '../../ports/IDateTimeProvider';
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

export class VerifyTwoFactorUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly dateTimeProvider: IDateTimeProvider
  ) {}

  async execute(dto: TwoFactorVerifyDTO): Promise<{ message: string; token: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Usuario no encontrado.', 401);
    }

    if (!user.twoFactor?.codeHash || !user.twoFactor?.expiresAt) {
      throw new AppError('No hay código activo.', 401);
    }

    if (this.dateTimeProvider.now() > user.twoFactor.expiresAt) {
      await this.userRepository.updateTwoFactor(user.id, {
        codeHash: undefined,
        expiresAt: undefined,
      });
      throw new AppError('El código expiró.', 401);
    }

    if (user.twoFactor.codeHash !== this.hashService.sha256(dto.code)) {
      throw new AppError('Código incorrecto.', 401);
    }

    await this.userRepository.updateTwoFactor(user.id, {
      codeHash: undefined,
      expiresAt: undefined,
    });

    const token = this.tokenService.sign({
      id: user.id,
      email: user.email,
      kind: user.kind,
    });

    return { message: 'Login exitoso', token };
  }
}
