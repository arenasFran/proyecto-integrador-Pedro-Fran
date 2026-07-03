import mongoose from 'mongoose';
import { MongoBarberBlockRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { BarberBlockModel } from '../../../../src/infrastructure/repositories/mongodb/models/barberBlock.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoBarberBlockRepository', () => {
  let repository: MongoBarberBlockRepository;

  const barberId = new mongoose.Types.ObjectId().toString();
  const date = '2026-07-15';
  const startTime = '10:00';
  const endTime = '12:00';

  beforeAll(async () => {
    await BarberBlockModel.syncIndexes();
  });

  beforeEach(() => {
    repository = new MongoBarberBlockRepository();
  });

  afterEach(async () => {
    await BarberBlockModel.deleteMany({});
  });

  it('debe crear un bloque y devolver sus props', async () => {
    const block = await repository.create({ barberId, date, startTime, endTime });

    expect(block.id).toBeDefined();
    expect(block.barberId).toBe(barberId);
    expect(block.date).toBe(date);
    expect(block.startTime).toBe(startTime);
    expect(block.endTime).toBe(endTime);
  });

  it('debe lanzar error al crear un bloque duplicado', async () => {
    await repository.create({ barberId, date, startTime, endTime });
    await expect(repository.create({ barberId, date, startTime, endTime })).rejects.toThrow();
  });

  it('debe buscar bloques por barberId y fecha', async () => {
    await repository.create({ barberId, date, startTime: '10:00', endTime: '11:00' });
    await repository.create({ barberId, date, startTime: '14:00', endTime: '15:00' });

    const results = await repository.findByBarberAndDate(barberId, date);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.startTime)).toEqual(expect.arrayContaining(['10:00', '14:00']));
  });

  it('debe buscar bloques por barberId y rango de fechas', async () => {
    await repository.create({ barberId, date, startTime, endTime });
    await repository.create({ barberId, date: '2026-07-16', startTime, endTime });

    const results = await repository.findByBarberAndDateRange(barberId, '2026-07-15', '2026-07-16');

    expect(results).toHaveLength(2);
  });

  it('debe encontrar bloque por id', async () => {
    const created = await repository.create({ barberId, date, startTime, endTime });

    const found = await repository.findById(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.barberId).toBe(barberId);
    expect(found!.date).toBe(date);
    expect(found!.startTime).toBe(startTime);
    expect(found!.endTime).toBe(endTime);
  });

  it('debe devolver null si no encuentra bloque por id', async () => {
    const found = await repository.findById(new mongoose.Types.ObjectId().toString());
    expect(found).toBeNull();
  });

  it('debe eliminar un bloque por id', async () => {
    const created = await repository.create({ barberId, date, startTime, endTime });

    await repository.deleteById(created.id);

    const found = await repository.findById(created.id);
    expect(found).toBeNull();
  });

  it('debe eliminar bloques por barberId', async () => {
    await repository.create({ barberId, date, startTime: '10:00', endTime: '11:00' });
    await repository.create({ barberId, date, startTime: '14:00', endTime: '15:00' });

    await repository.deleteByBarberId(barberId);

    const results = await repository.findByBarberAndDate(barberId, date);
    expect(results).toHaveLength(0);
  });

  it('debe buscar bloques por rango de fechas', async () => {
    await repository.create({ barberId, date, startTime, endTime });
    await repository.create({ barberId: new mongoose.Types.ObjectId().toString(), date: '2026-07-16', startTime, endTime });

    const results = await repository.findByDateRange('2026-07-15', '2026-07-16');

    expect(results).toHaveLength(2);
  });
});
