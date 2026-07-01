import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppointmentProps } from '../../../domain/entities/Appointment';

type RescheduleAppointmentDTO = {
  date: string;
  startTime: string;
  barberId: string;
};
import { AppError } from '../../errors/AppError';
import {
  toMinutes,
  doesOverlap,
  getNowInTimezone,
  validateAppointmentSlot,
} from '../../../domain/utils/time';
import { VALID_TRANSITIONS } from '../../../domain/types/appointment';

export class RescheduleAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly serviceRepository: MongoServiceRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(
    id: string,
    dto: RescheduleAppointmentDTO,
    userId: string,
    userKind: string
  ): Promise<{ message: string; appointment: AppointmentProps }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    // RN09 — No se puede reagendar en estado terminal
    const allowedTransitions = VALID_TRANSITIONS[appointment.status];
    if (!allowedTransitions || allowedTransitions.length === 0) {
      throw new AppError(
        `No se puede reagendar un turno ${appointment.status}.`, 400
      );
    }

    // RN20 — Permission: owner, admin, or assigned barber
    const isOwner = appointment.clientId === userId;
    const isAdmin = userKind === 'Admin';
    const isAssignedBarber = userKind === 'Empleado' && appointment.barberId === userId;
    if (!isOwner && !isAdmin && !isAssignedBarber) {
      throw new AppError('No tenés permiso para reagendar este turno.', 403);
    }

    const barber = await this.barberRepository.findBarberById(dto.barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!barber.isActive) {
      throw new AppError('El barbero no está activo.', 400);
    }

    // Task 7 — Límite máximo de anticipación por barbero
    const nowInTz = getNowInTimezone();
    const [y, m, d] = dto.date.split('-').map(Number);
    const [ny, nm, nd] = nowInTz.date.split('-').map(Number);
    const aptEpoch = Date.UTC(y, m - 1, d);
    const nowEpoch = Date.UTC(ny, nm - 1, nd);
    const diffDays = (aptEpoch - nowEpoch) / (1000 * 60 * 60 * 24);
    if (diffDays > barber.maxAdvanceDays) {
      throw new AppError(
        `No se puede reservar con más de ${barber.maxAdvanceDays} días de anticipación.`, 400
      );
    }

    const service = await this.serviceRepository.findByIdIncludingInactive(appointment.serviceId);
    if (!service) {
      throw new AppError('Servicio no encontrado.', 404);
    }

    // RN01 — Revalidar fecha
    if (dto.date < nowInTz.date) {
      throw new AppError('No se puede agendar en el pasado.', 400);
    }
    if (dto.date === nowInTz.date) {
      const startMins = toMinutes(dto.startTime);
      if (startMins !== null && startMins <= nowInTz.minutes) {
        throw new AppError('La hora ya pasó.', 400);
      }
    }

    const { startMinutes, endMinutes, endTime, daySchedule } = validateAppointmentSlot(
      dto.startTime, dto.date, barber
    );

    // RN04 — Colisión
    const existingAppointments = await this.appointmentRepository.findByBarberAndDate(
      dto.barberId,
      dto.date
    );
    for (const existing of existingAppointments) {
      if (existing.status === 'Cancelado') continue;
      if (existing.id === id) continue; // excluirse a sí mismo
      if (doesOverlap(dto.startTime, endTime, existing.startTime, existing.endTime)) {
        throw new AppError('El horario seleccionado ya está ocupado.', 409);
      }
    }

    // RN15 — Límite de 1 turno activo total (excluyéndose a sí mismo)
    let activeAppointments: import('../../../domain/entities/Appointment').Appointment[] = [];
    if (appointment.clientId) {
      activeAppointments = await this.appointmentRepository.findByClientId(appointment.clientId);
    } else if (appointment.clientEmail && appointment.clientPhone) {
      activeAppointments = await this.appointmentRepository.findByContact(
        appointment.clientEmail,
        appointment.clientPhone
      );
    }
    const filtered = activeAppointments.filter((a) => a.id !== id);
    const hasActive = filtered.some(
      (a) => a.status === 'Confirmado'
    );
    if (hasActive) {
      throw new AppError(
        'Ya tenés un turno activo completo. Cancelalo antes de reagendar.',
        409
      );
    }

    const updated = await this.appointmentRepository.update(id, {
      date: dto.date,
      startTime: dto.startTime,
      endTime,
      barberId: dto.barberId,
    });

    if (!updated) {
      throw new AppError('Error al actualizar el turno.', 500);
    }

    // RN17 — Email notification (async)
    const clientEmail = updated.clientEmail;
    if (clientEmail) {
      this.emailService
        .sendMail({
          to: clientEmail,
          subject: 'Turno reprogramado',
          html: `<p>Tu turno fue reprogramado.</p>
<p>Nueva fecha: ${updated.date} a las ${updated.startTime}</p>
<p>Barbero: ${barber.name} ${barber.lastname}</p>`,
        })
        .catch((error) => {
          console.error('Error enviando email de reprogramacion:', error);
        });
    }

    return {
      message: 'Turno reagendado exitosamente',
      appointment: updated.toPrimitives(),
    };
  }
}