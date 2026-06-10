import { AppointmentController } from '../../../../src/interface-adapters/controllers/appointment/AppointmentController';
import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../../../../src/application/use-cases/appointment/GetAppointmentsUseCase';
import { GetAppointmentByIdUseCase } from '../../../../src/application/use-cases/appointment/GetAppointmentByIdUseCase';
import { GetAppointmentsAnonymousUseCase } from '../../../../src/application/use-cases/appointment/GetAppointmentsAnonymousUseCase';
import { CancelAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { PayAppointmentUseCase } from '../../../../src/application/use-cases/appointment/PayAppointmentUseCase';
import { RescheduleAppointmentUseCase } from '../../../../src/application/use-cases/appointment/RescheduleAppointmentUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AppointmentController', () => {
  let createAppointment: jest.Mocked<CreateAppointmentUseCase>;
  let getAppointments: jest.Mocked<GetAppointmentsUseCase>;
  let getAppointmentById: jest.Mocked<GetAppointmentByIdUseCase>;
  let getAppointmentsAnonymous: jest.Mocked<GetAppointmentsAnonymousUseCase>;
  let cancelAppointment: jest.Mocked<CancelAppointmentUseCase>;
  let updateAppointmentStatus: jest.Mocked<UpdateAppointmentStatusUseCase>;
  let payAppointment: jest.Mocked<PayAppointmentUseCase>;
  let rescheduleAppointment: jest.Mocked<RescheduleAppointmentUseCase>;
  let controller: AppointmentController;

  beforeEach(() => {
    createAppointment = { execute: jest.fn() } as unknown as jest.Mocked<CreateAppointmentUseCase>;
    getAppointments = { execute: jest.fn() } as unknown as jest.Mocked<GetAppointmentsUseCase>;
    getAppointmentById = { execute: jest.fn() } as unknown as jest.Mocked<GetAppointmentByIdUseCase>;
    getAppointmentsAnonymous = { execute: jest.fn() } as unknown as jest.Mocked<GetAppointmentsAnonymousUseCase>;
    cancelAppointment = { execute: jest.fn() } as unknown as jest.Mocked<CancelAppointmentUseCase>;
    updateAppointmentStatus = { execute: jest.fn() } as unknown as jest.Mocked<UpdateAppointmentStatusUseCase>;
    payAppointment = { execute: jest.fn() } as unknown as jest.Mocked<PayAppointmentUseCase>;
    rescheduleAppointment = { execute: jest.fn() } as unknown as jest.Mocked<RescheduleAppointmentUseCase>;
    controller = new AppointmentController(
      createAppointment,
      getAppointments,
      getAppointmentById,
      cancelAppointment,
      updateAppointmentStatus,
      payAppointment,
      rescheduleAppointment,
      getAppointmentsAnonymous
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

    it('debe asignar clientId si el usuario esta autenticado', async () => {
      createAppointment.execute.mockResolvedValue({ message: 'ok', appointment: {} as any });
      const req = createMockReq({
        barberId: 'barber-1',
        serviceId: 'svc-1',
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
      });
      (req as any).user = { _id: 'user-1', email: 'user@test.com', kind: 'Registrado' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(createAppointment.execute).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'user-1' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAll', () => {
    it('debe listar turnos del cliente autenticado', async () => {
      getAppointments.execute.mockResolvedValue({ appointments: [] });
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).query = {};
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(getAppointments.execute).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe permitir que admin filtre por barberId', async () => {
      getAppointments.execute.mockResolvedValue({ appointments: [] });
      const req = createMockReq();
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      (req as any).query = { barberId: 'barber-1' };
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(getAppointments.execute).toHaveBeenCalledWith(
        expect.objectContaining({ barberId: 'barber-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al listar turnos', async () => {
      getAppointments.execute.mockRejectedValue(new Error('boom'));
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
      getAppointmentById.execute.mockResolvedValue({
        appointment: { id: 'apt-1' } as any,
      });
      const req = createMockReq();
      (req as any).user = { _id: 'client-1', kind: 'Registrado' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(getAppointmentById.execute).toHaveBeenCalledWith(
        'apt-1', 'client-1', 'Registrado'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error de permiso', async () => {
      getAppointmentById.execute.mockRejectedValue(
        new AppError('No tenés permiso para ver este turno.', 403)
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
      const req = createMockReq({ status: 'Confirmado' });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(updateAppointmentStatus.execute).toHaveBeenCalledWith(
        'apt-1', { status: 'Confirmado' }, 'admin-1', 'Admin'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al actualizar estado', async () => {
      updateAppointmentStatus.execute.mockRejectedValue(new AppError('Turno no encontrado', 404));
      const req = createMockReq({ status: 'Confirmado' });
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
      getAppointmentsAnonymous.execute.mockResolvedValue({ appointments: [] });
      const req = createMockReq();
      (req as any).query = { email: 'juan@test.com' };
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(getAppointmentsAnonymous.execute).toHaveBeenCalledWith(
        expect.objectContaining({ clientEmail: 'juan@test.com' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe pasar date si se proporciona', async () => {
      getAppointmentsAnonymous.execute.mockResolvedValue({ appointments: [] });
      const req = createMockReq();
      (req as any).query = { email: 'juan@test.com', date: '2099-01-01' };
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(getAppointmentsAnonymous.execute).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2099-01-01' })
      );
    });

    it('debe manejar error', async () => {
      getAppointmentsAnonymous.execute.mockRejectedValue(new AppError('Error', 400));
      const req = createMockReq();
      (req as any).query = { email: 'juan@test.com' };
      const res = createMockRes();

      await controller.getAnonymous(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
