import { BarberController } from '../../../../src/interface-adapters/controllers/barber/BarberController';
import { GetAvailableSlotsUseCase } from '../../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { Email } from '../../../../src/domain/value-objects/Email';
import { Phone } from '../../../../src/domain/value-objects/Phone';
import { createMockReq, createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockBarberRepository, makeMockUserRepository, makeMockAppointmentRepository, makeMockEmailService } from '../../../test-utils/mocks';
import { DeleteBarberUseCase } from '../../../../src/application/use-cases/barber/DeleteBarberUseCase';

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

const makeBarberEntity = (overrides?: Partial<BarberProps>) => {
  const base: BarberProps = {
    id: 'barber-1',
    email: 'barber@example.com',
    name: 'Juan',
    lastname: 'Perez',
    phone: '123456789',
    kind: 'Empleado' as const,
    services: [],
    age: undefined,
    photoUrl: null,
    isActive: true,
    slotDuration: 30,
    maxAdvanceDays: 30,
    schedule: createSchedule(),
    passwordHash: 'hash',
  };
  return Barber.create({ ...base, ...overrides });
};

describe('BarberController', () => {
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let getAvailableSlots: jest.Mocked<GetAvailableSlotsUseCase>;
  let deleteBarber: jest.Mocked<DeleteBarberUseCase>;
  let createBarber: { execute: jest.Mock };
  let updateBarber: { execute: jest.Mock };
  let updateBarberMe: { execute: jest.Mock };
  let emailService: ReturnType<typeof makeMockEmailService>;
  let controller: BarberController;

  beforeEach(() => {
    barberRepository = makeMockBarberRepository();
    userRepository = makeMockUserRepository();
    getAvailableSlots = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailableSlotsUseCase>;
    deleteBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeleteBarberUseCase>;
    createBarber = { execute: jest.fn() };
    updateBarber = { execute: jest.fn() };
    updateBarberMe = { execute: jest.fn() };
    emailService = makeMockEmailService();
    const blockRepository = {
      findByBarberAndDate: jest.fn(),
      findByBarberAndDateRange: jest.fn(),
      create: jest.fn(),
      deleteById: jest.fn(),
    };
    const appointmentRepository = makeMockAppointmentRepository();

    controller = new BarberController(
      barberRepository,
      getAvailableSlots,
      deleteBarber,
      blockRepository as any,
      emailService,
      createBarber as any,
      updateBarber as any,
      updateBarberMe as any,
      {} as any,
      {} as any,
    );
  });

  describe('create', () => {
    it('debe responder 201 con el barbero creado', async () => {
      const barber = makeBarberEntity();
      createBarber.execute.mockResolvedValue(barber.toPrimitives());

      const req = createMockReq({
        email: 'new@example.com',
        password: 'Abcd1234',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
        schedule: createSchedule(),
      });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe manejar error email en uso', async () => {
      createBarber.execute.mockRejectedValue(new AppError('Email en uso.', 409));

      const req = createMockReq({
        email: 'used@example.com',
        password: 'Abcd1234',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
        schedule: createSchedule(),
      });
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email en uso.' });
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
    it('debe responder 200 con la lista de barberos', async () => {
      const barber = makeBarberEntity();
      barberRepository.findAllBarbers.mockResolvedValue([barber]);

      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        barbers: [expect.objectContaining({ id: 'barber-1', name: 'Juan' })],
      });
    });

    it('debe manejar error y responder 500', async () => {
      barberRepository.findAllBarbers.mockRejectedValue(new Error('boom'));

      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener barberos' });
    });
  });

  describe('getAllPublic', () => {
    it('debe devolver solo barberos activos', async () => {
      const active = makeBarberEntity();
      const inactive = makeBarberEntity({ id: 'barber-2', isActive: false });
      barberRepository.findAllBarbers.mockResolvedValue([active, inactive]);

      const req = createMockReq();
      const res = createMockRes();

      await controller.getAllPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        barbers: [expect.objectContaining({ id: 'barber-1' })],
      });
    });

    it('debe incluir el schedule semanal (necesario para deshabilitar días no laborables en el calendario público)', async () => {
      barberRepository.findAllBarbers.mockResolvedValue([makeBarberEntity()]);

      const req = createMockReq();
      const res = createMockRes();

      await controller.getAllPublic(req, res);

      expect(res.json).toHaveBeenCalledWith({
        barbers: [expect.objectContaining({ schedule: expect.any(Object) })],
      });
    });
  });

  describe('getById', () => {
    it('debe responder 200 con el barbero', async () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarberEntity());

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe manejar 404 cuando no existe', async () => {
      barberRepository.findBarberById.mockResolvedValue(null);

      const req = createMockReqFull({ params: { id: 'inexistente' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Barbero no encontrado.' });
    });
  });

  describe('update', () => {
    it('debe responder 200 con el barbero actualizado', async () => {
      updateBarber.execute.mockResolvedValue(makeBarberEntity({ name: 'Pedro' }).toPrimitives());

      const req = createMockReqFull({ body: { name: 'Pedro' }, params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deactivate', () => {
    it('debe responder 200 con mensaje de exito', async () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarberEntity());

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.deactivate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Barbero desactivado' });
    });
  });

  describe('delete', () => {
    it('debe responder 200 con mensaje de exito', async () => {
      deleteBarber.execute.mockResolvedValue({ message: 'Barbero desactivado exitosamente' });

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Barbero desactivado exitosamente' });
    });
  });

  describe('getSchedule', () => {
    it('debe responder 200 con el horario', async () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarberEntity());

      const req = createMockReqFull({ params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.getSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateSchedule', () => {
    it('debe responder 200 con el horario actualizado', async () => {
      const barber = makeBarberEntity();
      barberRepository.updateSchedule.mockResolvedValue(barber);

      const req = createMockReqFull({ body: createSchedule(), params: { id: 'barber-1' } });
      const res = createMockRes();

      await controller.updateSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateMe', () => {
    const makeReq = (body: Record<string, unknown>) =>
      ({
        body,
        user: { _id: 'barber-1', email: 'barber@example.com', kind: 'Empleado' },
      }) as unknown as import('express').Request;

    it('debe actualizar nombre/telefono sin pedir contraseña cuando no cambia el email', async () => {
      updateBarberMe.execute.mockResolvedValue({ barber: makeBarberEntity({ name: 'Carlos' }).toPrimitives() });

      const req = makeReq({ name: 'Carlos' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe permitir reenviar el mismo email sin pedir contraseña', async () => {
      updateBarberMe.execute.mockResolvedValue({ barber: makeBarberEntity().toPrimitives() });

      const req = makeReq({ email: 'barber@example.com' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('debe rechazar el cambio de email sin currentPassword', async () => {
      updateBarberMe.execute.mockRejectedValue(new AppError('Se requiere la contraseña actual para cambiar el email.', 400));

      const req = makeReq({ email: 'nuevo@example.com' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe rechazar el cambio de email con currentPassword incorrecta', async () => {
      updateBarberMe.execute.mockRejectedValue(new AppError('Contraseña actual incorrecta.', 401));

      const req = makeReq({ email: 'nuevo@example.com', currentPassword: 'wrong' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contraseña actual incorrecta.' });
    });

    it('debe cambiar el email con currentPassword correcta y avisar al email viejo', async () => {
      updateBarberMe.execute.mockResolvedValue({ barber: makeBarberEntity({ email: 'nuevo@example.com' }).toPrimitives(), oldEmail: 'barber@example.com' });

      const req = makeReq({ email: 'nuevo@example.com', currentPassword: 'CurrentPass1' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'barber@example.com' })
      );
    });

    it('debe rechazar el cambio de email si ya está en uso por otro usuario', async () => {
      updateBarberMe.execute.mockRejectedValue(new AppError('El email ya está en uso.', 409));

      const req = makeReq({ email: 'nuevo@example.com', currentPassword: 'CurrentPass1' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('ya no hashea ni procesa un campo password aunque llegue en el body', async () => {
      barberRepository.updateBarber.mockResolvedValue(makeBarberEntity());

      const req = makeReq({ name: 'Carlos', password: 'Ignorado123' });
      const res = createMockRes();

      await controller.updateMe(req, res);

      expect(updateBarberMe.execute).toHaveBeenCalled();
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
  });
});
