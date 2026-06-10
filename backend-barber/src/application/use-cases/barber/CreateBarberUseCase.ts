import { Barber } from '../../../domain/entities/Barber';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Phone } from '../../../domain/value-objects/Phone';
import { CreateBarberDTO } from '../../dto/barber/CreateBarberDTO';
import { BarberResponseDTO, toBarberResponse } from '../../dto/barber/BarberResponseDTO';
import { AppError } from '../../errors/AppError';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export class CreateBarberUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly barberRepository: IBarberRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: CreateBarberDTO): Promise<BarberResponseDTO> {
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

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const barber = Barber.create({
      id: '',
      email,
      name: dto.name,
      lastname: dto.lastname,
      phone,
      kind: 'Empleado',
      services: dto.services || [],
      age: dto.age,
      photoUrl: dto.photoUrl ?? null,
      isActive: true,
      slotDuration: dto.slotDuration ?? 30,
      schedule: dto.schedule,
      passwordHash,
    });

    const created = await this.barberRepository.createBarber(barber);

    return toBarberResponse(created);
  }
}
