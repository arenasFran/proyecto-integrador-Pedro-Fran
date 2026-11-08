import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { AppError } from '../../../domain/errors/AppError';
import { registerTwoFactorFailure } from './twoFactorLockout';
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { ITokenService } from '../../ports/ITokenService';

type LoginDTO = { email: string; password: string };
type LoginResult =
  | { requiresTwoFactor: true }
  | { message: string; token: string; refreshToken: string };

export class LoginUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository,
    private readonly hashService: IHashService
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResult> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new AppError('Email y/o contraseña incorrectos.', 401);

    if (user.twoFactorLockedUntil && new Date() < user.twoFactorLockedUntil) {
      const remainingMin = Math.ceil((user.twoFactorLockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Demasiados intentos fallidos. Intentalo de nuevo en ${remainingMin} minutos.`, 429);
    }

    if (!user.passwordHash) {
      throw new AppError('Este usuario se registró con Google, usá ese método para ingresar.', 401);
    }

    const isValid = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isValid) {
      await registerTwoFactorFailure(
        this.userRepository,
        user.id,
        user.twoFactorFailedAttempts || 0,
        'Email y/o contraseña incorrectos.'
      );
    }

    if (user.kind === 'Admin' || user.kind === 'Empleado') {
      return { requiresTwoFactor: true };
    }

    await this.userRepository.updateUserSecurity(user.id, {
      twoFactorFailedAttempts: 0,
      twoFactorLockedUntil: null,
    });

    const tokenPayload = { id: user.id, email: user.email, kind: user.kind };
    const token = this.tokenService.signAccessToken(tokenPayload);
    const refreshToken = this.tokenService.signRefreshToken(tokenPayload);
    await this.refreshTokenRepository.create(
      this.hashService.sha256(refreshToken),
      user.id,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    await this.userRepository.updateLastLogin(user.id);

    return { message: 'Login exitoso', token, refreshToken };
  }
}
