import { MongoClientRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoClientRepository';
import { RegisteredClient, UnregisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoClientRepository — searchRegistered', () => {
  let repository: MongoClientRepository;

  beforeEach(() => {
    repository = new MongoClientRepository();
  });

  afterEach(async () => {
    await RegisteredClient.deleteMany({});
    await UnregisteredClient.deleteMany({});
  });

  it('debe encontrar un cliente registrado por prefijo de nombre (case-insensitive)', async () => {
    await RegisteredClient.create({ name: 'Gonzalo', lastname: 'Perez', email: 'gonzalo@test.com', password: 'hash' });

    const results = await repository.searchRegistered('gon');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Gonzalo');
  });

  it('NO debe encontrar un cliente por un fragmento que no sea el prefijo (regex anclado)', async () => {
    await RegisteredClient.create({ name: 'Gonzalo', lastname: 'Perez', email: 'gonzalo2@test.com', password: 'hash' });

    const results = await repository.searchRegistered('onzalo');

    expect(results).toHaveLength(0);
  });

  it('debe encontrar por prefijo de apellido o email', async () => {
    await RegisteredClient.create({ name: 'Ana', lastname: 'Martinez', email: 'ana.m@test.com', password: 'hash' });

    const byLastname = await repository.searchRegistered('Mart');
    expect(byLastname).toHaveLength(1);

    const byEmail = await repository.searchRegistered('ana.m');
    expect(byEmail).toHaveLength(1);
  });

  it('NO debe devolver clientes NoRegistrado', async () => {
    await UnregisteredClient.create({ name: 'Invitado', lastname: 'Anonimo', phone: '098111222' });

    const results = await repository.searchRegistered('Invitado');

    expect(results).toHaveLength(0);
  });
});
