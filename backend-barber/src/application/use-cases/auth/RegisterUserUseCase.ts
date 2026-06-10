import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Phone } from '../../../domain/value-objects/Phone';
import { RegisterUserDTO } from '../../dto/auth/RegisterUserDTO';
import { AppError } from '../../errors/AppError';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO): Promise<{ message: string }> {
    if (dto.password !== dto.repeatPassword) {
      throw new AppError('Las contraseñas no coinciden.', 400);
    }

    const email = Email.create(dto.email).getValue();
    const phone = Phone.create(dto.phone).getValue();
    Password.create(dto.password);

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email en uso.', 409);
    }

    const existingPhone = await this.userRepository.findByPhone(phone);
    if (existingPhone) {
      throw new AppError('Teléfono en uso.', 409);
    }

    const hash = await this.passwordHasher.hash(dto.password);

    const user = User.create({
      id: '',
      email,
      name: dto.name,
      lastname: dto.lastname,
      phone,
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: hash,
    });

    await this.userRepository.createRegisteredClient(user);

    return { message: 'Usuario registrado con éxito' };
  }
}
