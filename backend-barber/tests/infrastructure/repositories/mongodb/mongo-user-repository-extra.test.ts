import mongoose from 'mongoose';
import { MongoUserRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoUserRepository';
import { Barber, Employee } from '../../../../src/infrastructure/repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
const emptySchedule = () => ({
  monday: createEmptyDay(),
  tuesday: createEmptyDay(),
  wednesday: createEmptyDay(),
  thursday: createEmptyDay(),
  friday: createEmptyDay(),
  saturday: createEmptyDay(),
  sunday: createEmptyDay(),
});

describeIfMongo('MongoUserRepository (métodos adicionales)', () => {
  let repository: MongoUserRepository;

  const createBarber = (overrides: Partial<{ email: string; name: string; phone: string }> = {}) =>
    Employee.create({
      email: overrides.email ?? `barber-${Date.now()}-${Math.random()}@test.com`,
      password: 'hash',
      name: overrides.name ?? 'Carlos',
      lastname: 'Barbero',
      phone: overrides.phone ?? `0991${Math.floor(Math.random() * 100000)}`,
      slotDuration: 30,
      schedule: emptySchedule(),
    });

  const createClient = (overrides: Partial<{ email: string; name: string }> = {}) =>
    RegisteredClient.create({
      name: overrides.name ?? 'Ana',
      lastname: 'Cliente',
      email: overrides.email ?? `client-${Date.now()}-${Math.random()}@test.com`,
      password: 'hash',
      kind: 'Registrado',
    });

  beforeEach(() => {
    repository = new MongoUserRepository();
  });

  afterEach(async () => {
    await Barber.deleteMany({});
    await RegisteredClient.deleteMany({});
  });

  describe('findEmailById', () => {
    it('debe devolver el email de un cliente registrado', async () => {
      const client = await createClient({ email: 'cliente1@test.com' });
      const email = await repository.findEmailById(client._id.toString());
      expect(email).toBe('cliente1@test.com');
    });

    it('debe devolver el email de un barbero si no es un cliente', async () => {
      const barber = await createBarber({ email: 'barbero1@test.com' });
      const email = await repository.findEmailById(barber._id.toString());
      expect(email).toBe('barbero1@test.com');
    });

    it('debe devolver null si el id no existe', async () => {
      const email = await repository.findEmailById(new mongoose.Types.ObjectId().toString());
      expect(email).toBeNull();
    });
  });

  describe('findRegisteredClients', () => {
    it('debe devolver todos los clientes registrados ordenados por nombre', async () => {
      await createClient({ name: 'Zoe' });
      await createClient({ name: 'Ana' });

      const clients = await repository.findRegisteredClients();

      expect(clients).toHaveLength(2);
      expect(clients[0].name).toBe('Ana');
    });
  });

  describe('findByIds', () => {
    it('debe devolver un Map con barberos y clientes encontrados', async () => {
      const barber = await createBarber();
      const client = await createClient();

      const map = await repository.findByIds([barber._id.toString(), client._id.toString()]);

      expect(map.size).toBe(2);
      expect(map.get(barber._id.toString())?.kind).toBeDefined();
    });

    it('debe devolver Map vacío si la lista está vacía', async () => {
      const map = await repository.findByIds([]);
      expect(map.size).toBe(0);
    });

    it('debe ignorar ids con formato inválido', async () => {
      const map = await repository.findByIds(['no-es-un-object-id', 'manual_123']);
      expect(map.size).toBe(0);
    });
  });

  describe('findById', () => {
    it('debe encontrar un barbero por id', async () => {
      const barber = await createBarber();
      const found = await repository.findById(barber._id.toString());
      expect(found).not.toBeNull();
    });

    it('debe encontrar un cliente registrado por id', async () => {
      const client = await createClient();
      const found = await repository.findById(client._id.toString());
      expect(found).not.toBeNull();
    });

    it('debe devolver null si no existe', async () => {
      const found = await repository.findById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('debe actualizar los datos de un barbero', async () => {
      const barber = await createBarber();
      const updated = await repository.update(barber._id.toString(), { name: 'Nuevo Nombre' });
      expect(updated!.name).toBe('Nuevo Nombre');
    });

    it('debe actualizar los datos de un cliente registrado', async () => {
      const client = await createClient();
      const updated = await repository.update(client._id.toString(), { name: 'Otro Nombre' });
      expect(updated!.name).toBe('Otro Nombre');
    });

    it('debe devolver null si el usuario no existe', async () => {
      const updated = await repository.update(new mongoose.Types.ObjectId().toString(), { name: 'X' });
      expect(updated).toBeNull();
    });

    it('debe actualizar el email y el contactEmail juntos', async () => {
      const client = await createClient();
      const updated = await repository.update(client._id.toString(), { email: 'nuevo@test.com' });
      expect(updated!.email).toBe('nuevo@test.com');
    });
  });

  describe('updateLastLogin', () => {
    it('debe persistir lastLoginAt de un barbero', async () => {
      const barber = await createBarber();
      await repository.updateLastLogin(barber._id.toString());
      const updated = await Barber.findById(barber._id);
      expect(updated!.lastLoginAt).toBeInstanceOf(Date);
    });

    it('debe persistir lastLoginAt de un cliente registrado', async () => {
      const client = await createClient();
      await repository.updateLastLogin(client._id.toString());
      const updated = await RegisteredClient.findById(client._id);
      expect(updated!.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('updateUserSecurity', () => {
    it('debe actualizar los contadores de seguridad de un barbero', async () => {
      const barber = await createBarber();
      await repository.updateUserSecurity(barber._id.toString(), { twoFactorFailedAttempts: 2 });
      const updated = await Barber.findById(barber._id);
      expect(updated!.twoFactorFailedAttempts).toBe(2);
    });

    it('debe actualizar los contadores de seguridad de un cliente registrado', async () => {
      const client = await createClient();
      await repository.updateUserSecurity(client._id.toString(), { resetFailedAttempts: 3 });
      const updated = await RegisteredClient.findById(client._id);
      expect(updated!.resetFailedAttempts).toBe(3);
    });
  });

  describe('updatePassword', () => {
    it('debe actualizar la password de un barbero', async () => {
      const barber = await createBarber();
      await repository.updatePassword(barber._id.toString(), 'nuevo-hash');
      const updated = await Barber.findById(barber._id);
      expect(updated!.password).toBe('nuevo-hash');
    });
  });

  describe('updateTwoFactor', () => {
    it('debe actualizar el código 2FA de un cliente registrado', async () => {
      const client = await createClient();
      const expiresAt = new Date();
      await repository.updateTwoFactor(client._id.toString(), { codeHash: 'code-hash', expiresAt });
      const updated = await RegisteredClient.findById(client._id);
      expect(updated!.twoFactorCode).toBe('code-hash');
    });
  });
});
