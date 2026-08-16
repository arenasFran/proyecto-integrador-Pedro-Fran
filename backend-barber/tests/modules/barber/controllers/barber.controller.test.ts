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
  let blockRepository: {
    findByBarberAndDate: jest.Mock;
    findByBarberAndDateRange: jest.Mock;
    findByDateRange: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    deleteById: jest.Mock;
  };
  let getBarberOccupancy: { execute: jest.Mock };
  let createBarberBlock: { execute: jest.Mock };
  let controller: BarberController;

  beforeEach(() => {
    barberRepository = makeMockBarberRepository();
    userRepository = makeMockUserRepository();
    getAvailableSlots = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailableSlotsUseCase>;
    getAvailableSlots.execute.mockResolvedValue({ date: '2026-01-01', slots: ['09:00'] });
    deleteBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeleteBarberUseCase>;
    createBarber = { execute: jest.fn() };
    updateBarber = { execute: jest.fn() };
    updateBarberMe = { execute: jest.fn() };
    emailService = makeMockEmailService();
    blockRepository = {
      findByBarberAndDate: jest.fn(),
      findByBarberAndDateRange: jest.fn(),
      findByDateRange: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      deleteById: jest.fn(),
    };
    getBarberOccupancy = { execute: jest.fn() };
    createBarberBlock = { execute: jest.fn() };
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
      getBarberOccupancy as any,
      createBarberBlock as any,
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

    it('debe excluir barberos activos sin slots reservables en toda su ventana de anticipación', async () => {
      const available = makeBarberEntity({ id: 'barber-1' });
      const fullyBooked = makeBarberEntity({ id: 'barber-2', maxAdvanceDays: 1 });
      barberRepository.findAllBarbers.mockResolvedValue([available, fullyBooked]);
      getAvailableSlots.execute.mockImplementation(async (barberId) => (
        barberId === 'barber-1'
          ? { date: '2026-01-01', slots: ['09:00'] }
          : { date: '2026-01-01', slots: [], reason: 'fully-booked' }
      ));

      const req = createMockReq();
      const res = createMockRes();

      await controller.getAllPublic(req, res);

      expect(res.json).toHaveBeenCalledWith({
        barbers: [expect.objectContaining({ id: 'barber-1' })],
      });
      expect(getAvailableSlots.execute).toHaveBeenCalledWith('barber-2', expect.any(String));
    });

    it('debe conservar los barberos disponibles si falla la disponibilidad de otro', async () => {
      const available = makeBarberEntity({ id: 'barber-1' });
      const failed = makeBarberEntity({ id: 'barber-2' });
      barberRepository.findAllBarbers.mockResolvedValue([available, failed]);
      getAvailableSlots.execute.mockImplementation(async (barberId) => {
        if (barberId === 'barber-2') throw new Error('db down');
        return { date: '2026-01-01', slots: ['09:00'] };
      });

      const req = createMockReq();
      const res = createMockRes();

      await controller.getAllPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        barbers: [expect.objectContaining({ id: 'barber-1' })],
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

  describe('getBlocks', () => {
    it('debe devolver los bloques del barbero en el rango de fechas', async () => {
      blockRepository.findByBarberAndDateRange.mockResolvedValue([{ id: 'block-1' }]);
      const req = createMockReqFull({ params: { id: 'barber-1' }, query: { dateFrom: '2026-01-01', dateTo: '2026-01-31' } });
      const res = createMockRes();

      await controller.getBlocks(req, res);

      expect(blockRepository.findByBarberAndDateRange).toHaveBeenCalledWith('barber-1', '2026-01-01', '2026-01-31');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ blocks: [{ id: 'block-1' }] }));
    });

    it('debe responder 500 si falla', async () => {
      blockRepository.findByBarberAndDateRange.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ params: { id: 'barber-1' }, query: {} });
      const res = createMockRes();

      await controller.getBlocks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createBlock', () => {
    it('debe crear el bloque y responder 201', async () => {
      createBarberBlock.execute.mockResolvedValue({ id: 'block-1' });
      const req = createMockReqFull({ params: { id: 'barber-1' }, body: { date: '2026-01-15', startTime: '10:00', endTime: '11:00' } });
      (req as any).user = { _id: 'barber-1', kind: 'Empleado' };
      const res = createMockRes();

      await controller.createBlock(req, res);

      expect(createBarberBlock.execute).toHaveBeenCalledWith(
        expect.objectContaining({ barberId: 'barber-1', date: '2026-01-15' }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe responder según el AppError del caso de uso', async () => {
      createBarberBlock.execute.mockRejectedValue(new AppError('El bloque se superpone con un turno existente.', 409));
      const req = createMockReqFull({ params: { id: 'barber-1' }, body: {} });
      const res = createMockRes();

      await controller.createBlock(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('getAllBlocks', () => {
    it('debe devolver todos los bloques en el rango de fechas', async () => {
      blockRepository.findByDateRange.mockResolvedValue([{ id: 'block-1' }, { id: 'block-2' }]);
      const req = createMockReqFull({ query: { dateFrom: '2026-01-01', dateTo: '2026-01-31' } });
      const res = createMockRes();

      await controller.getAllBlocks(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ blocks: [{ id: 'block-1' }, { id: 'block-2' }] }));
    });

    it('debe responder 500 si falla', async () => {
      blockRepository.findByDateRange.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAllBlocks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteBlock', () => {
    it('debe eliminar el bloque si el actor es Admin', async () => {
      blockRepository.findById.mockResolvedValue({ id: 'block-1', barberId: 'barber-1', createdBy: 'admin-1' });
      const req = createMockReqFull({ params: { blockId: 'block-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.deleteBlock(req, res);

      expect(blockRepository.deleteById).toHaveBeenCalledWith('block-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe eliminar el bloque si el actor es el barbero dueño del bloque', async () => {
      blockRepository.findById.mockResolvedValue({ id: 'block-1', barberId: 'barber-1', createdBy: 'admin-1' });
      const req = createMockReqFull({ params: { blockId: 'block-1' } });
      (req as any).user = { _id: 'barber-1', kind: 'Empleado' };
      const res = createMockRes();

      await controller.deleteBlock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 404 si el bloque no existe', async () => {
      blockRepository.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { blockId: 'block-x' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.deleteBlock(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe responder 403 si el actor no es admin, ni dueño, ni el barbero del bloque', async () => {
      blockRepository.findById.mockResolvedValue({ id: 'block-1', barberId: 'barber-1', createdBy: 'admin-1' });
      const req = createMockReqFull({ params: { blockId: 'block-1' } });
      (req as any).user = { _id: 'otro-empleado', kind: 'Empleado' };
      const res = createMockRes();

      await controller.deleteBlock(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(blockRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('getOccupancy', () => {
    it('debe devolver la ocupación del barbero en la fecha', async () => {
      getBarberOccupancy.execute.mockResolvedValue({ occupancyRate: 0.5 });
      const req = createMockReqFull({ params: { id: 'barber-1' }, query: { date: '2026-01-15' } });
      const res = createMockRes();

      await controller.getOccupancy(req, res);

      expect(getBarberOccupancy.execute).toHaveBeenCalledWith({ barberId: 'barber-1', date: '2026-01-15' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ occupancyRate: 0.5 }));
    });

    it('debe responder 500 si falla', async () => {
      getBarberOccupancy.execute.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ params: { id: 'barber-1' }, query: {} });
      const res = createMockRes();

      await controller.getOccupancy(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
