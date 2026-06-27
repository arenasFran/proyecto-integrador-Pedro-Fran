import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { AppointmentController } from '../../../../src/interface-adapters/controllers/appointment/AppointmentController';
import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { CancelAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { RescheduleAppointmentUseCase } from '../../../../src/application/use-cases/appointment/RescheduleAppointmentUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockAppointmentRepository } from '../../../test-utils/mocks';

describe('AppointmentController', () => {
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let createAppointment: jest.Mocked<CreateAppointmentUseCase>;
  let cancelAppointment: jest.Mocked<CancelAppointmentUseCase>;
  let updateAppointmentStatus: jest.Mocked<UpdateAppointmentStatusUseCase>;
  let rescheduleAppointment: jest.Mocked<RescheduleAppointmentUseCase>;
  let controller: AppointmentController;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    createAppointment = { execute: jest.fn() } as unknown as jest.Mocked<CreateAppointmentUseCase>;
    cancelAppointment = { execute: jest.fn() } as unknown as jest.Mocked<CancelAppointmentUseCase>;
    updateAppointmentStatus = { execute: jest.fn() } as unknown as jest.Mocked<UpdateAppointmentStatusUseCase>;
    rescheduleAppointment = { execute: jest.fn() } as unknown as jest.Mocked<RescheduleAppointmentUseCase>;
    controller = new AppointmentController(
      appointmentRepository,
      createAppointment,
      cancelAppointment,
      updateAppointmentStatus,
      rescheduleAppointment
    );
  });

  describe('create', () => {
    it('debe crear turno y responder 201', async () => {
      createAppointment.execute.mockResolvedValue({ message: 'ok', appointment: {} as any });
      const req = createMockReq({
        barberId: 'barber-1',
        serviceId: 'svc-1',
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
      });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'ok', appointment: {} });
    });

    it('debe manejar error al crear turno', async () => {
      createAppointment.execute.mockRejectedValue(new AppError('Barbero no encontrado', 404));
      const req = createMockReq({ barberId: 'barber-1' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Barbero no encontrado' });
    });

    it('debe asignar clientId y createdBy cuando usuario autenticado es Registrado', async () => {
      createAppointment.execute.mockResolvedValue({ message: 'ok', appointment: {} as any });
      const body = {
        barberId: 'barber-1',
        serviceId: 'svc-1',
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
      };
      const req = createMockReq(body);
      (req as any).user = { _id: 'user-1', email: 'user@test.com', kind: 'Registrado' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(createAppointment.execute).toHaveBeenCalledWith({
        ...body,
        clientId: 'user-1',
        createdBy: { type: 'registered', userId: 'user-1' },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe asignar createdBy anonymous si no hay usuario autenticado', async () => {
      createAppointment.execute.mockResolvedValue({ message: 'ok', appointment: {} as any });
      const body = {
        barberId: 'barber-1',
        serviceId: 'svc-1',
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
      };
      const req = createMockReq(body);
      const res = createMockRes();

      await controller.create(req, res);

      expect(createAppointment.execute).toHaveBeenCalledWith({
        ...body,
        createdBy: { type: 'anonymous' },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAll', () => {
    it('debe listar turnos del cliente autenticado', async () => {
      appointmentRepository.findMany.mockResolvedValue([]);
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).query = {};
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe permitir que admin filtre por barberId', async () => {
      appointmentRepository.findMany.mockResolvedValue([]);
      const req = createMockReq();
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      (req as any).query = { barberId: 'barber-1' };
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ barberId: 'barber-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al listar turnos', async () => {
      appointmentRepository.findMany.mockRejectedValue(new Error('boom'));
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).query = {};
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getById', () => {
    it('debe obtener turno por id y responder 200', async () => {
      const now = new Date();
      appointmentRepository.findById.mockResolvedValue(
        Appointment.create({
          id: 'apt-1',
          barberId: 'barber-1',
          clientId: 'client-1',
          clientName: 'Juan',
          clientLastname: 'Perez',
          serviceId: 'svc-1',
          serviceName: 'Corte',
          servicePrice: 490,
          serviceDuration: 30,
          date: '2099-01-01',
          startTime: '10:00',
          endTime: '10:30',
          status: 'Confirmado',
          paymentStatus: 'Pendiente',
          paymentMethod: 'local',
          statusHistory: [{ status: 'Confirmado', timestamp: now, actor: 'system' }],
          createdAt: now,
          updatedAt: now,
        })
      );
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(appointmentRepository.findById).toHaveBeenCalledWith('apt-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar 404 si no existe', async () => {
      appointmentRepository.findById.mockResolvedValue(null);
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe manejar error de permiso', async () => {
      const now = new Date();
      appointmentRepository.findById.mockResolvedValue(
        Appointment.create({
          id: 'apt-1',
          barberId: 'barber-1',
          clientId: 'other-user',
          clientName: 'Juan',
          clientLastname: 'Perez',
          serviceId: 'svc-1',
          serviceName: 'Corte',
          servicePrice: 490,
          serviceDuration: 30,
          date: '2099-01-01',
          startTime: '10:00',
          endTime: '10:30',
          status: 'Confirmado',
          paymentStatus: 'Pendiente',
          paymentMethod: 'local',
          statusHistory: [{ status: 'Confirmado', timestamp: now, actor: 'system' }],
          createdAt: now,
          updatedAt: now,
        })
      );
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('cancel', () => {
    it('debe cancelar turno y responder 200', async () => {
      cancelAppointment.execute.mockResolvedValue({ message: 'Turno cancelado' });
      const req = createMockReq({ reason: 'Cambio de planes' });
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.cancel(req, res);

      expect(cancelAppointment.execute).toHaveBeenCalledWith(
        'apt-1', 'client-1', 'Registrado', 'Cambio de planes'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al cancelar', async () => {
      cancelAppointment.execute.mockRejectedValue(new AppError('Turno no encontrado', 404));
      const req = createMockReq({ reason: 'test' });
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.cancel(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar estado y responder 200', async () => {
      updateAppointmentStatus.execute.mockResolvedValue({ message: 'Estado actualizado' });
      const req = createMockReq({ status: 'Completado' });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(updateAppointmentStatus.execute).toHaveBeenCalledWith(
        'apt-1', { status: 'Completado' }, 'admin-1', 'Admin'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al actualizar estado', async () => {
      updateAppointmentStatus.execute.mockRejectedValue(new AppError('Turno no encontrado', 404));
      const req = createMockReq({ status: 'Completado' });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('reschedule', () => {
    it('debe reagendar turno y responder 200', async () => {
      rescheduleAppointment.execute.mockResolvedValue({
        message: 'Turno reagendado exitosamente',
        appointment: { id: 'apt-1' } as any,
      });
      const req = createMockReq({
        date: '2099-01-02',
        startTime: '11:00',
        barberId: 'barber-2',
      });
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.reschedule(req, res);

      expect(rescheduleAppointment.execute).toHaveBeenCalledWith(
        'apt-1',
        { date: '2099-01-02', startTime: '11:00', barberId: 'barber-2' },
        'client-1',
        'Registrado'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al reagendar', async () => {
      rescheduleAppointment.execute.mockRejectedValue(new AppError('Error', 400));
      const req = createMockReq({
        date: '2099-01-02',
        startTime: '11:00',
        barberId: 'barber-2',
      });
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.reschedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAnonymous', () => {
    it('debe devolver turnos del anonimo', async () => {
      appointmentRepository.findMany.mockResolvedValue([]);
      const req = createMockReq();
      (req as any).query = { email: 'juan@test.com' };
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ clientEmail: 'juan@test.com' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe pasar date si se proporciona', async () => {
      appointmentRepository.findMany.mockResolvedValue([]);
      const req = createMockReq();
      (req as any).query = { email: 'juan@test.com', date: '2099-01-01' };
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2099-01-01' })
      );
    });

    it('debe fallar si no hay email ni phone', async () => {
      const req = createMockReq();
      (req as any).query = {};
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe manejar error', async () => {
      appointmentRepository.findMany.mockRejectedValue(new AppError('Error', 400));
      const req = createMockReq();
      (req as any).query = { email: 'juan@test.com' };
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
