import { UserProps } from '../../../domain/entities/User';
import { AppError } from '../../../domain/errors/AppError';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export interface UpdateUserProfileDTO {
  email?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  photoUrl?: string | null;
  currentPassword?: string;
}

export interface UpdateUserProfileResult {
  user: UserProps;
  oldEmail?: string;
}

export class UpdateUserProfileUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(userId: string, dto: UpdateUserProfileDTO): Promise<UpdateUserProfileResult> {
    const { currentPassword, ...updateData } = dto;

    let oldEmail: string | undefined;

    if (updateData.email) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      if (updateData.email !== user.email) {
        if (!currentPassword) {
          throw new AppError('La contraseña actual es obligatoria para cambiar el email.', 400);
        }
        const isCurrentPasswordValid = await this.passwordHasher.compare(
          currentPassword,
          user.passwordHash!
        );
        if (!isCurrentPasswordValid) {
          throw new AppError('Contraseña actual incorrecta.', 401);
        }
        oldEmail = user.email;
      }
    }

    const updated = await this.userRepository.update(userId, updateData);
    if (!updated) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    return { user: updated.toPrimitives(), oldEmail };
  }
}
