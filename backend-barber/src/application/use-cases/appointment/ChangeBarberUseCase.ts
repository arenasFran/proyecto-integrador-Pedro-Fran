import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { AppError } from '../../../domain/errors/AppError';
import { doesOverlap } from '../../../domain/utils/time';

export class ChangeBarberUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository
  ) {}

  async execute(
    id: string,
    newBarberId: string,
    userId: string,
    userKind: string
  ): Promise<{ message: string }> {
    if (userKind !== 'Admin' && userKind !== 'Empleado') {
      throw new AppError('No tenés permiso para cambiar el barbero.', 403);
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    if (appointment.status !== 'Confirmado') {
      throw new AppError('Solo se puede cambiar el barbero de turnos confirmados.', 400);
    }

    if (appointment.barberId === newBarberId) {
      return { message: 'El turno ya tiene ese barbero asignado' };
    }

    const newBarber = await this.barberRepository.findBarberById(newBarberId);
    if (!newBarber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!newBarber.isActive) {
      throw new AppError('El barbero no está activo.', 400);
    }

    const existingAppointments = await this.appointmentRepository.findByBarberAndDate(
      newBarberId,
      appointment.date
    );

    for (const existing of existingAppointments) {
      if (existing.status === 'Cancelado') continue;
      if (existing.id === id) continue;
      if (doesOverlap(appointment.startTime, appointment.endTime, existing.startTime, existing.endTime)) {
        throw new AppError('El barbero ya tiene un turno en ese horario.', 409);
      }
    }

    const actor = await this.resolveStaffActor(userId);
    const oldBarber = await this.barberRepository.findBarberById(appointment.barberId);
    const oldBarberName = oldBarber ? `${oldBarber.name} ${oldBarber.lastname}` : appointment.barberId;
    const newBarberName = `${newBarber.name} ${newBarber.lastname}`;

    await this.appointmentRepository.update(id, {
      barberId: newBarberId,
      version: appointment.version,
    });

    await this.appointmentRepository.updateStatus(id, {
      statusHistoryEntry: {
        status: appointment.status,
        timestamp: new Date(),
        actor: `${actor} (barbero: ${oldBarberName} → ${newBarberName})`,
      },
    });

    return { message: `Barbero cambiado de ${oldBarberName} a ${newBarberName}` };
  }

  private async resolveStaffActor(userId: string): Promise<string> {
    const staffMember = await this.barberRepository.findBarberById(userId);
    if (staffMember) {
      return `${staffMember.name} ${staffMember.lastname}`;
    }
    return 'Personal';
  }
}
