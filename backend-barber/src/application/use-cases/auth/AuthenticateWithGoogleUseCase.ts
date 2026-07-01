import { User } from '../../../domain/entities/User';
import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { AppError } from '../../../domain/errors/AppError';

type GoogleLoginDTO = {
  token: string;
};
import { IGoogleAuthService } from '../../ports/IGoogleAuthService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

type GoogleLoginResponse =
  | { message: string; token: string; refreshToken: string }
  | { requiresProfileCompletion: true; partialToken: string; name?: string; lastname?: string };

export class AuthenticateWithGoogleUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly googleAuthService: IGoogleAuthService,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository,
    private readonly hashService: IHashService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: GoogleLoginDTO): Promise<GoogleLoginResponse> {
    let payload;
    try {
      payload = await this.googleAuthService.verifyIdToken(dto.token);
    } catch (error) {
      throw new AppError('Token de Google inválido', 401);
    }

    if (!payload.email || !payload.emailVerified) {
      throw new AppError('Cuenta de Google no verificada', 401);
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      if (existingUser.kind === 'Admin' || existingUser.kind === 'Empleado') {
        throw new AppError('Este usuario no puede iniciar con Google.', 401);
      }

      if (
        existingUser.authProvider === 'google' &&
        existingUser.googleId &&
        existingUser.googleId !== payload.sub
      ) {
        throw new AppError('Token de Google inválido', 401);
      }

      if (existingUser.authProvider === 'local' && !existingUser.googleId) {
        throw new AppError(
          'Ya existe una cuenta con este email. Iniciá sesión con tu contraseña.',
          409,
          'ACCOUNT_EXISTS_LOCAL'
        );
      }

      const tokenPayload = { id: existingUser.id, email: existingUser.email, kind: existingUser.kind };
      const token = this.tokenService.signAccessToken(tokenPayload);
      const refreshToken = this.tokenService.signRefreshToken(tokenPayload);

      const tokenHash = this.hashService.sha256(refreshToken);
      const expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
      await this.refreshTokenRepository.create(tokenHash, existingUser.id, expiresAt);
      await this.userRepository.updateLastLogin(existingUser.id);

      return { message: 'Login exitoso', token, refreshToken };
    }

    const name = payload.name || payload.givenName;
    const lastname = payload.familyName;

    const partialToken = this.tokenService.signPartialToken(normalizedEmail, payload.sub);

    return {
      requiresProfileCompletion: true,
      partialToken,
      name: name || undefined,
      lastname: lastname || undefined,
    };
  }
}


