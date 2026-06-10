import { User } from '../../../domain/entities/User';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { CompleteGoogleProfileDTO } from '../../dto/auth/CompleteGoogleProfileDTO';
import { AppError } from '../../errors/AppError';
import { IDateTimeProvider } from '../../ports/IDateTimeProvider';
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

export class CompleteGoogleProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly refreshTokenRepository: IRefreshTokenRepository
  ) {}

  async execute(dto: CompleteGoogleProfileDTO): Promise<{ message: string; token: string; refreshToken: string }> {
    let email: string;
    try {
      const result = this.tokenService.verifyPartialToken(dto.partialToken);
      email = result.email.trim().toLowerCase();
    } catch {
      throw new AppError('Token parcial inválido o expirado', 401);
    }
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('El usuario ya existe', 409);
    }

    const name = dto.name.trim();
    if (!name) {
      throw new AppError('El nombre es obligatorio', 400);
    }

    const user = User.create({
      id: '',
      email,
      name,
      lastname: dto.lastname?.trim() || '',
      kind: 'Registrado',
      authProvider: 'google',
    });

    const created = await this.userRepository.createRegisteredClient(user);

    const tokenPayload = { id: created.id, email: created.email, kind: created.kind };
    const token = this.tokenService.signAccessToken(tokenPayload);
    const refreshToken = this.tokenService.signRefreshToken(tokenPayload);

    const tokenHash = this.hashService.sha256(refreshToken);
    const expiresAt = new Date(this.dateTimeProvider.now().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(tokenHash, created.id, expiresAt);
    await this.userRepository.updateLastLogin(created.id);

    return { message: 'Perfil completado exitosamente', token, refreshToken };
  }
}
