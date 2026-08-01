import { Barber, BarberSchedule, BarberProps } from '../../../domain/entities/Barber';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Phone } from '../../../domain/value-objects/Phone';
import { AppError } from '../../../domain/errors/AppError';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export interface CreateBarberDTO {
  name: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  services?: string[];
  age?: number;
  photoUrl?: string | null;
  slotDuration?: number;
  maxAdvanceDays?: number;
  schedule: BarberSchedule;
}

export class CreateBarberUseCase {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: CreateBarberDTO): Promise<BarberProps> {
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
      maxAdvanceDays: dto.maxAdvanceDays ?? 30,
      schedule: dto.schedule,
      passwordHash,
    });

    const created = await this.barberRepository.createBarber(barber);
    return created.toPrimitives();
  }
}
