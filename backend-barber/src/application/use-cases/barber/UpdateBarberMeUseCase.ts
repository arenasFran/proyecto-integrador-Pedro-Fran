import { BarberProps, BarberSchedule } from '../../../domain/entities/Barber';
import { Email } from '../../../domain/value-objects/Email';
import { AppError } from '../../../domain/errors/AppError';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export interface UpdateBarberMeDTO {
  email?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  photoUrl?: string | null;
  age?: number | null;
  currentPassword?: string;
  schedule?: BarberSchedule;
}

export interface UpdateBarberMeResult {
  barber: BarberProps;
  oldEmail?: string;
}

export class UpdateBarberMeUseCase {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(userId: string, dto: UpdateBarberMeDTO): Promise<UpdateBarberMeResult> {
    const { schedule: scheduleData, currentPassword, ...profileData } = dto;

    let oldEmail: string | undefined;

    if (profileData.email) {
      const current = await this.barberRepository.findBarberById(userId);
      if (!current) {
        throw new AppError('Barbero no encontrado.', 404);
      }

      const email = Email.create(profileData.email).getValue();
      profileData.email = email;

      if (email !== current.email) {
        const existing = await this.userRepository.findByEmail(email);
        if (existing && existing.id !== current.id) {
          throw new AppError('Email en uso.', 409);
        }

        if (!currentPassword) {
          throw new AppError('La contraseña actual es obligatoria para cambiar el email.', 400);
        }
        const isCurrentPasswordValid = await this.passwordHasher.compare(
          currentPassword,
          current.passwordHash!
        );
        if (!isCurrentPasswordValid) {
          throw new AppError('Contraseña actual incorrecta.', 401);
        }
        oldEmail = current.email;
      }
    }

    const updated = await this.barberRepository.updateBarber(userId, profileData);

    if (scheduleData && updated) {
      await this.barberRepository.updateSchedule(userId, scheduleData);
    }

    if (!updated) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    return { barber: updated.toPrimitives(), oldEmail };
  }
}
