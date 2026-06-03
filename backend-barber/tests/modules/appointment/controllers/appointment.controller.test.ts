import { AppointmentController } from '../../../../src/interface-adapters/controllers/appointment/AppointmentController';
import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../../../../src/application/use-cases/appointment/GetAppointmentsUseCase';
import { CancelAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AppointmentController', () => {
  let createAppointment: jest.Mocked<CreateAppointmentUseCase>;
  let getAppointments: jest.Mocked<GetAppointmentsUseCase>;
  let cancelAppointment: jest.Mocked<CancelAppointmentUseCase>;
  let updateAppointmentStatus: jest.Mocked<UpdateAppointmentStatusUseCase>;
  let controller: AppointmentController;

  beforeEach(() => {
    createAppointment = { execute: jest.fn() } as unknown as jest.Mocked<CreateAppointmentUseCase>;
    getAppointments = { execute: jest.fn() } as unknown as jest.Mocked<GetAppointmentsUseCase>;
    cancelAppointment = { execute: jest.fn() } as unknown as jest.Mocked<CancelAppointmentUseCase>;
    updateAppointmentStatus = { execute: jest.fn() } as unknown as jest.Mocked<UpdateAppointmentStatusUseCase>;
    controller = new AppointmentController(
      createAppointment,
      getAppointments,
      cancelAppointment,
      updateAppointmentStatus
    );
  });

  describe('create', () => {
    it('debe crear turno y responder 201', async () => {
      createAppointment.execute.mockResolvedValue({ message: 'ok', appointment: {} });
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
      createAppointment.execute.mockResolvedValue({ message: 'ok', appointment: {} });
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
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(updateAppointmentStatus.execute).toHaveBeenCalledWith('apt-1', {
        status: 'Confirmado',
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error al actualizar estado', async () => {
      updateAppointmentStatus.execute.mockRejectedValue(new AppError('Turno no encontrado', 404));
      const req = createMockReq({ status: 'Confirmado' });
      (req as any).params = { id: 'apt-1' };
      const res = createMockRes();

      await controller.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
