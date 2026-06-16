import { MongoBarberRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoBarberRepository';
import { Barber, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { Employee } from '../../../../src/infrastructure/repositories/mongodb/models/barber.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

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

const makeBarber = () =>
  Barber.create({
    id: 'barber-repo-1',
    email: 'repo@example.com',
    name: 'Carlos',
    lastname: 'Gomez',
    phone: '999888777',
    kind: 'Empleado',
    services: ['corte'],
    isActive: true,
    slotDuration: 30,
    maxAdvanceDays: 30,
    schedule: createSchedule(),
    passwordHash: 'hashed_password',
  });

describeIfMongo('MongoBarberRepository', () => {
  let repository: MongoBarberRepository;

  beforeEach(() => {
    repository = new MongoBarberRepository();
  });

  it('debe crear un empleado y devolver la entidad Barber', async () => {
    const barber = makeBarber();

    const created = await repository.createBarber(barber);

    expect(created).toBeInstanceOf(Barber);
    expect(created.email).toBe('repo@example.com');
    expect(created.name).toBe('Carlos');
    expect(created.phone).toBe('999888777');
    expect(created.slotDuration).toBe(30);
    expect(created.isActive).toBe(true);
  });

  it('debe buscar un empleado por id', async () => {
    const created = await repository.createBarber(makeBarber());

    const found = await repository.findBarberById(created.id);

    expect(found).not.toBeNull();
    expect(found!.email).toBe('repo@example.com');
  });

  it('debe devolver null si no encuentra empleado por id', async () => {
    const found = await repository.findBarberById('000000000000000000000000');

    expect(found).toBeNull();
  });

  it('debe listar todos los empleados', async () => {
    const barber1 = makeBarber();
    const barber2 = Barber.create({
      ...makeBarber().toPrimitives(),
      id: 'barber-repo-2',
      email: 'repo2@example.com',
      phone: '111222333',
    });

    await repository.createBarber(barber1);
    await repository.createBarber(barber2);

    const all = await repository.findAllBarbers();

    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((b) => b.email === 'repo@example.com')).toBe(true);
    expect(all.some((b) => b.email === 'repo2@example.com')).toBe(true);
  });

  it('debe actualizar un empleado', async () => {
    const created = await repository.createBarber(makeBarber());

    const updated = await repository.updateBarber(created.id, {
      name: 'Carlos Updated',
      slotDuration: 45,
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Carlos Updated');
    expect(updated!.slotDuration).toBe(45);
  });

  it('debe devolver null al actualizar un empleado inexistente', async () => {
    const result = await repository.updateBarber('000000000000000000000000', {
      name: 'Nadie',
    });

    expect(result).toBeNull();
  });

  it('debe desactivar un empleado', async () => {
    const created = await repository.createBarber(makeBarber());

    await repository.deactivateBarber(created.id);

    const found = await repository.findBarberById(created.id);
    expect(found?.isActive).toBe(false);
  });

  it('debe eliminar un empleado', async () => {
    const created = await repository.createBarber(makeBarber());

    await repository.deleteBarber(created.id);

    const found = await repository.findBarberById(created.id);
    expect(found).toBeNull();
  });

  it('debe actualizar el horario de un empleado', async () => {
    const created = await repository.createBarber(makeBarber());

    const newSchedule: BarberSchedule = {
      monday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      tuesday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      wednesday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      thursday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      friday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      saturday: { startTime: null, endTime: null, breaks: [] },
      sunday: { startTime: null, endTime: null, breaks: [] },
    };

    const updated = await repository.updateSchedule(created.id, newSchedule);

    expect(updated).not.toBeNull();
    expect(updated!.schedule.monday.startTime).toBe('10:00');
    expect(updated!.schedule.saturday.startTime).toBeNull();
  });
});
