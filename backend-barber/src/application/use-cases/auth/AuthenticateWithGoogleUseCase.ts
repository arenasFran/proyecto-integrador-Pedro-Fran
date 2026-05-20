import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { GoogleLoginDTO } from '../../dto/auth/GoogleLoginDTO';
import { AppError } from '../../errors/AppError';
import { IGoogleAuthService } from '../../ports/IGoogleAuthService';
import { ITokenService } from '../../ports/ITokenService';

export class AuthenticateWithGoogleUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly googleAuthService: IGoogleAuthService,
    private readonly tokenService: ITokenService
  ) {}

  async execute(dto: GoogleLoginDTO): Promise<{ message: string; token: string }> {
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

      const token = this.tokenService.sign({
        id: existingUser.id,
        email: existingUser.email,
        kind: existingUser.kind,
      });

      return { message: 'Login exitoso', token };
    }

    const user = User.create({
      id: '',
      email: normalizedEmail,
      name: payload.givenName || payload.name || 'Usuario',
      lastname: payload.familyName || '-',
      kind: 'Registrado',
      authProvider: 'google',
      googleId: payload.sub,
    });

    const created = await this.userRepository.createRegisteredClient(user);
    const token = this.tokenService.sign({
      id: created.id,
      email: created.email,
      kind: created.kind,
    });

    return { message: 'Login exitoso', token };
  }
}
