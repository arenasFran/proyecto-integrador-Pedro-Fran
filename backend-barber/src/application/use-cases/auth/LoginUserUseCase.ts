import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { LoginUserDTO } from '../../dto/auth/LoginUserDTO';
import { AppError } from '../../errors/AppError';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { ITokenService } from '../../ports/ITokenService';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService
  ) {}

  async execute(dto: LoginUserDTO): Promise<{ message: string; token: string }> {
    const email = Email.create(dto.email).getValue();

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Email y/o contraseña incorrectos.', 401);
    }

    if (!user.passwordHash) {
      throw new AppError(
        'Este usuario se registró con Google, usá ese método para ingresar.',
        401
      );
    }

    const isValid = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Email y/o contraseña incorrectos.', 401);
    }

    const token = this.tokenService.sign({
      id: user.id,
      email: user.email,
      kind: user.kind,
    });

    return { message: 'Login exitoso', token };
  }
}
