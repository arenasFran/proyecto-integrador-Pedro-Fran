import { BarberController } from '../../../../src/interface-adapters/controllers/barber/BarberController';
import { CreateBarberUseCase } from '../../../../src/application/use-cases/barber/CreateBarberUseCase';
import { DeactivateBarberUseCase } from '../../../../src/application/use-cases/barber/DeactivateBarberUseCase';
import { GetAllBarbersUseCase } from '../../../../src/application/use-cases/barber/GetAllBarbersUseCase';
import { GetBarberByIdUseCase } from '../../../../src/application/use-cases/barber/GetBarberByIdUseCase';
import { UpdateBarberUseCase } from '../../../../src/application/use-cases/barber/UpdateBarberUseCase';
import { DeleteBarberUseCase } from '../../../../src/application/use-cases/barber/DeleteBarberUseCase';
import { GetBarberScheduleUseCase } from '../../../../src/application/use-cases/barber/GetBarberScheduleUseCase';
import { UpdateBarberScheduleUseCase } from '../../../../src/application/use-cases/barber/UpdateBarberScheduleUseCase';
import { GetAvailableSlotsUseCase } from '../../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { BarberSchedule } from '../../../../src/domain/entities/Barber';
import { createMockReq, createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';

const createScheduleDay = () => ({
  startTime: '09:00',
  endTime: '18:00',
  breaks: [],
});

const createSchedule = (): BarberSchedule => ({
  monday: createScheduleDay(),
  tuesday: createScheduleDay(),
  wednesday: createScheduleDay(),
  thursday: createScheduleDay(),
  friday: createScheduleDay(),
  saturday: createScheduleDay(),
  sunday: createScheduleDay(),
});

const makeBarberResponse = () => ({
  id: 'barber-1',
  name: 'Juan',
  lastname: 'Perez',
  email: 'barber@example.com',
  phone: '123456789',
  kind: 'Empleado' as const,
  services: [],
  isActive: true,
  slotDuration: 30,
  maxAdvanceDays: 30,
  schedule: createSchedule(),
  photoUrl: null,
  age: undefined,
});

describe('BarberController', () => {
  let createBarber: jest.Mocked<CreateBarberUseCase>;
  let getAllBarbers: jest.Mocked<GetAllBarbersUseCase>;
  let getBarberById: jest.Mocked<GetBarberByIdUseCase>;
  let updateBarber: jest.Mocked<UpdateBarberUseCase>;
  let deleteBarber: jest.Mocked<DeleteBarberUseCase>;
  let deactivateBarber: jest.Mocked<DeactivateBarberUseCase>;
  let getBarberSchedule: jest.Mocked<GetBarberScheduleUseCase>;
  let updateBarberSchedule: jest.Mocked<UpdateBarberScheduleUseCase>;
  let getAvailableSlots: jest.Mocked<GetAvailableSlotsUseCase>;
  let controller: BarberController;

  beforeEach(() => {
    createBarber = { execute: jest.fn() } as unknown as jest.Mocked<CreateBarberUseCase>;
    getAllBarbers = { execute: jest.fn() } as unknown as jest.Mocked<GetAllBarbersUseCase>;
    getBarberById = { execute: jest.fn() } as unknown as jest.Mocked<GetBarberByIdUseCase>;
    updateBarber = { execute: jest.fn() } as unknown as jest.Mocked<UpdateBarberUseCase>;
    deleteBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeleteBarberUseCase>;
    deactivateBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeactivateBarberUseCase>;
    getBarberSchedule = { execute: jest.fn() } as unknown as jest.Mocked<GetBarberScheduleUseCase>;
    updateBarberSchedule = { execute: jest.fn() } as unknown as jest.Mocked<UpdateBarberScheduleUseCase>;
    getAvailableSlots = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailableSlotsUseCase>;
    controller = new BarberController(
      createBarber,
      getAllBarbers,
      getBarberById,
      updateBarber,
      deleteBarber,
      deactivateBarber,
      getBarberSchedule,
      updateBarberSchedule,
      getAvailableSlots
    );
  });

  describe('create', () => {
    it('debe responder 201 con el barbero creado', async () => {
      const barber = makeBarberResponse();
      createBarber.execute.mockResolvedValue(barber);

      const req = createMockReq({ email: 'new@example.com' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(barber);
    });

    it('debe manejar error y responder con el status de AppError', async () => {
      createBarber.execute.mockRejectedValue(new AppError('Email en uso', 409));

      const req = createMockReq({ email: 'used@example.com' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email en uso' });
    });

    it('debe manejar error generico y responder 500', async () => {
      createBarber.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReq({ email: 'new@example.com' });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear el barbero' });
    });
  });

  describe('getAll', () => {
    it('debe pasar el kind del usuario al use case', async () => {
      const barbers = [makeBarberResponse()];
      getAllBarbers.execute.mockResolvedValue(barbers);

      const req = createMockReq();
      (req as any).user = { kind: 'Empleado' };
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(getAllBarbers.execute).toHaveBeenCalledWith('Empleado');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ barbers });
    });

    it('debe llamar al use case sin kind si no hay usuario', async () => {
      const barbers = [makeBarberResponse()];
      getAllBarbers.execute.mockResolvedValue(barbers);

      const req = createMockReq();
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(getAllBarbers.execute).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar error y responder 500', async () => {
      getAllBarbers.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReq();
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener barberos' });
    });
  });

  describe('getById', () => {
    it('debe responder 200 con el barbero', async () => {
      const barber = makeBarberResponse();
      getBarberById.execute.mockResolvedValue(barber);

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(barber);
    });

    it('debe manejar 404 cuando no existe', async () => {
      getBarberById.execute.mockRejectedValue(new AppError('Barbero no encontrado.', 404));

      const req = createMockReqFull({ params: { id: 'inexistente' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Barbero no encontrado.' });
    });
  });

  describe('update', () => {
    it('debe responder 200 con el barbero actualizado', async () => {
      const barber = makeBarberResponse();
      updateBarber.execute.mockResolvedValue(barber);

      const req = createMockReqFull({ body: { name: 'Pedro' }, params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(barber);
    });

    it('debe manejar error y responder 500', async () => {
      updateBarber.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReqFull({ body: { name: 'Pedro' }, params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar barbero' });
    });
  });

  describe('delete', () => {
    it('debe responder 200 con mensaje de exito', async () => {
      deleteBarber.execute.mockResolvedValue({ message: 'Barbero eliminado' });

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Barbero eliminado' });
    });

    it('debe manejar error y responder 500', async () => {
      deleteBarber.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar barbero' });
    });
  });

  describe('getSchedule', () => {
    it('debe responder 200 con el horario', async () => {
      const schedule = createSchedule();
      getBarberSchedule.execute.mockResolvedValue(schedule);

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.getSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ schedule });
    });

    it('debe manejar error y responder 500', async () => {
      getBarberSchedule.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.getSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener el horario' });
    });
  });

  describe('updateSchedule', () => {
    it('debe responder 200 con el horario actualizado', async () => {
      const schedule = createSchedule();
      updateBarberSchedule.execute.mockResolvedValue(schedule);

      const req = createMockReqFull({ body: createSchedule(), params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ schedule });
    });

    it('debe manejar error y responder 500', async () => {
      updateBarberSchedule.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReqFull({ body: createSchedule(), params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar el horario' });
    });
  });

  describe('getSlots', () => {
    it('debe responder 200 con los slots disponibles', async () => {
      const slotsResult = { date: '2026-06-15', slots: ['09:00', '09:30', '10:00'] };
      getAvailableSlots.execute.mockResolvedValue(slotsResult);

      const req = createMockReqFull({ params: { id: 'barber-1' }, query: { date: '2026-06-15' } });
      const res = createMockRes();

      await controller.getSlots(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(slotsResult);
    });

    it('debe manejar error y responder 500', async () => {
      getAvailableSlots.execute.mockRejectedValue(new Error('boom'));

      const req = createMockReqFull({ params: { id: 'barber-1' }, query: { date: '2026-06-15' } });
      const res = createMockRes();

      await controller.getSlots(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener los slots' });
    });
  });
});
