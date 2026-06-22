import { User } from '../../../domain/entities/User';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { Email } from '../../../domain/value-objects/Email';
import { Password } from '../../../domain/value-objects/Password';
import { Phone } from '../../../domain/value-objects/Phone';
import { AppError } from '../../errors/AppError';

type RegisterUserDTO = {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
};
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly appointmentRepository: MongoAppointmentRepository
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

    const createdUser = await this.userRepository.createRegisteredClient(user);

    // Vincular turnos anónimos con mismo email y teléfono
    this.linkAnonymousAppointments(createdUser.id, email, phone);

    return { message: 'Usuario registrado con éxito' };
  }

  private async linkAnonymousAppointments(
    registeredClientId: string,
    email: string,
    phone: string
  ): Promise<void> {
    try {
      const anonymousAppointments = await this.appointmentRepository.findByContact(email, phone);
      for (const appointment of anonymousAppointments) {
        await this.appointmentRepository.updateClientId(appointment.id, registeredClientId);
      }
    } catch (error) {
      console.error('Error vinculando turnos anónimos:', error);
    }
  }
}
