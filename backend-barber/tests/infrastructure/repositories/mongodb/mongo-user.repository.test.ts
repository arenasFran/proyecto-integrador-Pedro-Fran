import { MongoUserRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoUserRepository';
import { Admin, Barber } from '../../../../src/infrastructure/repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';
import { User } from '../../../../src/domain/entities/User';
import { AppError } from '../../../../src/domain/errors/AppError';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoUserRepository', () => {
  let repository: MongoUserRepository;

  beforeEach(() => {
    repository = new MongoUserRepository();
  });

  it('debe encontrar un barber por email', async () => {
    const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
    const admin = await Admin.create({
      email: 'admin@example.com',
      password: 'hash',
      name: 'Admin',
      lastname: 'User',
      phone: '111111',
      slotDuration: 30,
      schedule: {
        monday: createEmptyDay(),
        tuesday: createEmptyDay(),
        wednesday: createEmptyDay(),
        thursday: createEmptyDay(),
        friday: createEmptyDay(),
        saturday: createEmptyDay(),
        sunday: createEmptyDay(),
      },
    });

    const user = await repository.findByEmail('admin@example.com');

    expect(user).not.toBeNull();
    expect(user?.id).toBe(admin._id.toString());
    expect(user?.kind).toBe('Admin');
  });

  it('debe encontrar un cliente registrado por email', async () => {
    const client = await RegisteredClient.create({
      email: 'client@example.com',
      password: 'hash',
      name: 'Client',
      lastname: 'User',
      phone: '222222',
      authProvider: 'local',
    });

    const user = await repository.findByEmail('client@example.com');

    expect(user).not.toBeNull();
    expect(user?.id).toBe(client._id.toString());
    expect(user?.kind).toBe('Registrado');
  });

  it('debe actualizar password del cliente registrado', async () => {
    const client = await RegisteredClient.create({
      email: 'client2@example.com',
      password: 'old',
      name: 'Client',
      lastname: 'User',
      phone: '333333',
      authProvider: 'local',
    });

    await repository.updatePassword(client._id.toString(), 'new');

    const updated = await RegisteredClient.findById(client._id);
    expect(updated?.password).toBe('new');
  });

  it('debe actualizar 2FA del barber', async () => {
    const barber = await Barber.create({
      email: 'barber@example.com',
      password: 'hash',
      name: 'Barber',
      lastname: 'User',
      phone: '444444',
    });

    const expiresAt = new Date();
    await repository.updateTwoFactor(barber._id.toString(), {
      codeHash: 'code',
      expiresAt,
    });

    const updated = await Barber.findById(barber._id);
    expect(updated?.twoFactorCode).toBe('code');
    expect(updated?.twoFactorExpires?.toISOString()).toBe(expiresAt.toISOString());
  });

  it('debe buscar por telefono', async () => {
    const client = await RegisteredClient.create({
      email: 'client3@example.com',
      password: 'hash',
      name: 'Client',
      lastname: 'User',
      phone: '555555',
      authProvider: 'local',
    });

    const user = await repository.findByPhone('555555');

    expect(user?.id).toBe(client._id.toString());
  });

  const makeNewUser = (overrides: { email: string; phone: string }) =>
    User.create({
      id: '',
      email: overrides.email,
      name: 'Nuevo',
      lastname: 'Cliente',
      phone: overrides.phone,
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: 'hash',
    });

  it('debe lanzar 409 si el email ya está en uso (carrera de registro concurrente)', async () => {
    await RegisteredClient.create({
      email: 'duplicado@example.com',
      password: 'hash',
      name: 'Existente',
      lastname: 'User',
      phone: '666666',
      authProvider: 'local',
    });

    await expect(
      repository.createRegisteredClient(makeNewUser({ email: 'duplicado@example.com', phone: '777777' }))
    ).rejects.toMatchObject({ message: 'Email en uso.', statusCode: 409 });
  });

  it('debe lanzar 409 si el teléfono ya está en uso', async () => {
    await RegisteredClient.create({
      email: 'otro@example.com',
      password: 'hash',
      name: 'Existente',
      lastname: 'User',
      phone: '888888',
      authProvider: 'local',
    });

    await expect(
      repository.createRegisteredClient(makeNewUser({ email: 'nuevo2@example.com', phone: '888888' }))
    ).rejects.toMatchObject({ message: 'Teléfono en uso.', statusCode: 409 });
  });

  it('debe registrar dos intentos concurrentes con el mismo email: uno gana, el otro recibe 409 (no un 500)', async () => {
    const results = await Promise.allSettled([
      repository.createRegisteredClient(makeNewUser({ email: 'concurrente@example.com', phone: '999001' })),
      repository.createRegisteredClient(makeNewUser({ email: 'concurrente@example.com', phone: '999002' })),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const rejection = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejection).toBeInstanceOf(AppError);
    expect(rejection.statusCode).toBe(409);
  });
});
