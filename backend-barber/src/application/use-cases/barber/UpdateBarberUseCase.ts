import { BarberProps } from '../../../domain/entities/Barber';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Phone } from '../../../domain/value-objects/Phone';
import { AppError } from '../../../domain/errors/AppError';
import { MongoBarberRepository, BarberUpdate } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export interface UpdateBarberDTO {
  email?: string;
  phone?: string;
  password?: string;
  name?: string;
  lastname?: string;
  services?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
}

export class UpdateBarberUseCase {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(barberId: string, dto: UpdateBarberDTO): Promise<BarberProps> {
    const current = await this.barberRepository.findBarberById(barberId);
    if (!current) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    const update: BarberUpdate = {};

    if (dto.email) {
      const email = Email.create(dto.email).getValue();
      const existing = await this.userRepository.findByEmail(email);
      if (existing && existing.id !== current.id) {
        throw new AppError('Email en uso.', 409);
      }
      update.email = email;
    }

    if (dto.phone) {
      const phone = Phone.create(dto.phone).getValue();
      const existing = await this.userRepository.findByPhone(phone);
      if (existing && existing.id !== current.id) {
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
    if (dto.services) update.services = dto.services;
    if (dto.age !== undefined) update.age = dto.age;
    if (dto.photoUrl !== undefined) update.photoUrl = dto.photoUrl;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.slotDuration !== undefined) update.slotDuration = dto.slotDuration;
    if (dto.maxAdvanceDays !== undefined) update.maxAdvanceDays = dto.maxAdvanceDays;

    const updated = await this.barberRepository.updateBarber(barberId, update);
    if (!updated) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    return updated.toPrimitives();
  }
}
