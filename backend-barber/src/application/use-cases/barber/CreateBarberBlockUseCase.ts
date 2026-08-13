import { BarberBlockProps } from '../../../domain/entities/BarberBlock';
import { AppError } from '../../../domain/errors/AppError';
import { doesOverlap } from '../../../domain/utils/time';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';

export interface CreateBarberBlockDTO {
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  actorId?: string;
  actorKind?: string;
}

export class CreateBarberBlockUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly blockRepository: MongoBarberBlockRepository
  ) {}

  async execute(dto: CreateBarberBlockDTO): Promise<BarberBlockProps> {
    const { barberId, date, startTime, endTime, actorId, actorKind } = dto;

    if (actorKind !== 'Admin' && barberId !== actorId) {
      throw new AppError('No podés bloquear el horario de otro barbero.', 403);
    }

    const appointments = await this.appointmentRepository.findByBarberAndDate(barberId, date);
    for (const apt of appointments) {
      if (apt.status === 'Cancelado') continue;
      if (doesOverlap(startTime, endTime, apt.startTime, apt.endTime)) {
        throw new AppError('Hay turnos confirmados en ese horario. No se puede bloquear.', 409);
      }
    }

    const block = await this.blockRepository.create({
      barberId,
      date,
      startTime,
      endTime,
      createdBy: actorId,
    });

    return block;
  }
}
