import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Phone } from '../../../domain/value-objects/Phone';
import { AppError } from '../../errors/AppError';
import { UpdateUserDTO } from '../../dto/user/UpdateUserDTO';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(userId: string, dto: UpdateUserDTO): Promise<User> {
    const current = await this.userRepository.findById(userId);
    if (!current) {
      throw new AppError('Usuario no encontrado.', 404);
    }
    if (current.kind !== 'Registrado') {
      throw new AppError('Solo clientes registrados pueden actualizar su perfil.', 403);
    }

    const update: {
      name?: string;
      lastname?: string;
      phone?: string;
      email?: string;
      contactEmail?: string;
      passwordHash?: string;
      photoUrl?: string | null;
    } = {};

    if (dto.email) {
      const email = Email.create(dto.email).getValue();
      const existing = await this.userRepository.findByEmail(email);
      if (existing && existing.id !== userId) {
        throw new AppError('Email en uso.', 409);
      }
      update.email = email;
      update.contactEmail = email;
    }

    if (dto.phone) {
      const phone = Phone.create(dto.phone).getValue();
      const existing = await this.userRepository.findByPhone(phone);
      if (existing && existing.id !== userId) {
        throw new AppError('Teléfono en uso.', 409);
      }
      update.phone = phone;
    }

    if (dto.password) {
      Password.create(dto.password);
      update.passwordHash = await this.passwordHasher.hash(dto.password);
    }

    if (dto.name) update.name = dto.name;
    if (dto.lastname) update.lastname = dto.lastname;
    if (dto.photoUrl !== undefined) update.photoUrl = dto.photoUrl;

    const updated = await this.userRepository.update(userId, update);
    if (!updated) {
      throw new AppError('Usuario no encontrado.', 404);
    }
    return updated;
  }
}
