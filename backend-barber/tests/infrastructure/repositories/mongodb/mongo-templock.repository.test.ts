import mongoose from 'mongoose';
import { MongoTempLockRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoTempLockRepository';
import TempLockModel from '../../../../src/infrastructure/repositories/mongodb/models/tempLock.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoTempLockRepository', () => {
  let repository: MongoTempLockRepository;

  const barberId = new mongoose.Types.ObjectId().toString();
  const date = '2026-06-20';
  const startTime = '10:00';

  beforeEach(() => {
    repository = new MongoTempLockRepository();
  });

  afterEach(async () => {
    await TempLockModel.deleteMany({});
  });

  it('debe crear un tempLock y devolver su id', async () => {
    const id = await repository.create({ barberId, date, startTime });

    expect(id).toBeDefined();
    const doc = await TempLockModel.findById(id);
    expect(doc).not.toBeNull();
    expect(doc!.barberId.toString()).toBe(barberId);
    expect(doc!.date).toBe(date);
    expect(doc!.startTime).toBe(startTime);
  });

  it('debe lanzar error al crear un tempLock duplicado', async () => {
    await repository.create({ barberId, date, startTime });

    await expect(repository.create({ barberId, date, startTime })).rejects.toThrow(
      'El horario ya fue apartado por otro usuario.'
    );
  });

  it('debe encontrar un tempLock por id', async () => {
    const id = await repository.create({ barberId, date, startTime, clientId: 'client-1' });

    const found = await repository.findById(id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(id);
    expect(found!.barberId).toBe(barberId);
    expect(found!.date).toBe(date);
    expect(found!.startTime).toBe(startTime);
    expect(found!.clientId).toBe('client-1');
  });

  it('debe devolver null si no encuentra tempLock por id', async () => {
    const found = await repository.findById(new mongoose.Types.ObjectId().toString());

    expect(found).toBeNull();
  });

  it('debe eliminar un tempLock por id', async () => {
    const id = await repository.create({ barberId, date, startTime });

    await repository.deleteById(id);

    const doc = await TempLockModel.findById(id);
    expect(doc).toBeNull();
  });

  it('debe eliminar un tempLock por barberId, date y startTime', async () => {
    await repository.create({ barberId, date, startTime });

    await repository.deleteOne(barberId, date, startTime);

    const docs = await TempLockModel.find({ barberId: new mongoose.Types.ObjectId(barberId), date });
    expect(docs).toHaveLength(0);
  });

  it('debe buscar tempLocks por barberId y fecha', async () => {
    await repository.create({ barberId, date, startTime: '10:00' });
    await repository.create({ barberId, date, startTime: '11:00' });

    const results = await repository.findByBarberAndDate(barberId, date);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.startTime)).toEqual(expect.arrayContaining(['10:00', '11:00']));
  });

  it('debe eliminar multiples tempLocks por barberId', async () => {
    await repository.create({ barberId, date, startTime: '10:00' });
    await repository.create({ barberId, date: '2026-06-21', startTime: '10:00' });

    await repository.deleteMany({ barberId });

    const all = await TempLockModel.find({ barberId: new mongoose.Types.ObjectId(barberId) });
    expect(all).toHaveLength(0);
  });
});
