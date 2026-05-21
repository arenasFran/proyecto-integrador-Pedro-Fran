import { MongoUserRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoUserRepository';
import { Admin, Barber } from '../../../../src/infrastructure/repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';

const isMongoReady = (global as any).__MONGO_READY__ === true;
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoUserRepository', () => {
  let repository: MongoUserRepository;

  beforeEach(() => {
    repository = new MongoUserRepository();
  });

  it('debe encontrar un barber por email', async () => {
    const admin = await Admin.create({
      email: 'admin@example.com',
      password: 'hash',
      name: 'Admin',
      lastname: 'User',
      phone: '111111',
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
});
