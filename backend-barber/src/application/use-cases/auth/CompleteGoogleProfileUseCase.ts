import { User } from '../../../domain/entities/User';
import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Phone } from '../../../domain/value-objects/Phone';
import { AppError } from '../../../domain/errors/AppError';

interface CompleteGoogleProfileDTO {
  partialToken: string;
  name: string;
  lastname?: string;
  phone?: string;
}
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

export class CompleteGoogleProfileUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository
  ) {}

  async execute(dto: CompleteGoogleProfileDTO): Promise<{ message: string; token: string; refreshToken: string; user: { id: string; name: string; lastname: string; email: string; phone: string; kind: string; photoUrl: string | null } }> {
    let email: string;
    let googleId: string | undefined;
    try {
      const result = this.tokenService.verifyPartialToken(dto.partialToken);
      email = result.email.trim().toLowerCase();
      googleId = result.googleId;
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

    const phone = dto.phone?.trim() || undefined;
    if (phone) {
      Phone.create(phone);
    }

    const user = User.create({
      id: '',
      email,
      name,
      lastname: dto.lastname?.trim() || '',
      phone,
      googleId,
      kind: 'Registrado',
      authProvider: 'google',
    });

    const created = await this.userRepository.createRegisteredClient(user);

    const tokenPayload = { id: created.id, email: created.email, kind: created.kind };
    const token = this.tokenService.signAccessToken(tokenPayload);
    const refreshToken = this.tokenService.signRefreshToken(tokenPayload);

    const tokenHash = this.hashService.sha256(refreshToken);
    const expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(tokenHash, created.id, expiresAt);
    await this.userRepository.updateLastLogin(created.id);

    return {
      message: 'Perfil completado exitosamente',
      token,
      refreshToken,
      user: {
        id: created.id,
        name: created.name,
        lastname: created.lastname,
        email: created.email,
        phone: created.phone || '',
        kind: created.kind,
        photoUrl: null,
      },
    };
  }
}


