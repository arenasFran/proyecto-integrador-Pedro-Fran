import mongoose from 'mongoose';
import { AnalizarCorteUseCase } from '../../../../src/application/use-cases/analisis-corte/AnalizarCorteUseCase';
import { MongoClientRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoClientRepository';
import { RegisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';
import { Service } from '../../../../src/domain/entities/Service';
import {
  makeMockMembershipRepository,
  makeMockServiceRepository,
  makeMockAnalisisCorteRepository,
  makeMockFaceValidationService,
  makeMockRecommendationService,
} from '../../../test-utils/mocks';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

// El mongod en memoria de jest.setup.ts corre standalone (sin replica set), así
// que no soporta transacciones reales. reservarAnalisisIA/liberarLockAnalisisIA
// no las necesitan (son un solo findOneAndUpdate atómico sobre un documento), por
// eso se ejercitan reales acá. Lo que sí requiere transacción (creación del
// registro + confirmación final) se mockea, igual que en analizar-corte.usecase.test.ts.
describeIfMongo('AnalizarCorteUseCase — concurrencia real sobre Mongo', () => {
  let clientRepository: MongoClientRepository;

  const makeService = (name: string) =>
    Service.create({
      id: `svc-${name}`,
      name,
      description: `Descripción de ${name}`,
      price: 100,
      imageUrl: '',
      status: 'active',
    });

  const recomendacion = {
    formaCara: 'ovalada',
    cortesRecomendados: [
      { nombreCorte: 'Fade bajo', descripcion: 'desc', razon: 'razon', servicioSugerido: 'Corte de pelo' },
    ],
    explicacionGeneral: 'explicacion',
  };

  const crearCliente = async (overrides: { ultimoAnalisisFecha?: Date | null; analisisLockedAt?: Date | null } = {}) => {
    const doc = await RegisteredClient.create({
      name: 'Juan',
      lastname: 'Perez',
      email: `juan-${Date.now()}-${Math.random()}@test.com`,
      password: 'hash',
      consentimientoAnalisisIA: true,
      ultimoAnalisisFecha: overrides.ultimoAnalisisFecha ?? null,
      analisisLockedAt: overrides.analisisLockedAt ?? null,
    });
    return (doc._id as mongoose.Types.ObjectId).toString();
  };

  const buildUseCase = () => {
    const membershipRepository = makeMockMembershipRepository();
    const serviceRepository = makeMockServiceRepository();
    const analisisCorteRepository = makeMockAnalisisCorteRepository();
    const faceValidationService = makeMockFaceValidationService();
    const recommendationService = makeMockRecommendationService();

    membershipRepository.hasActiveMembership.mockResolvedValue(true);
    serviceRepository.findAll.mockResolvedValue([makeService('Corte de pelo')]);
    faceValidationService.validar.mockResolvedValue({ valido: true });
    recommendationService.recomendar.mockResolvedValue(recomendacion);
    analisisCorteRepository.create.mockImplementation(async (clienteId: string) => ({
      id: 'a1',
      clienteId,
      resultado: recomendacion,
      createdAt: new Date(),
    }));

    return new AnalizarCorteUseCase(
      clientRepository as any,
      membershipRepository as any,
      serviceRepository as any,
      analisisCorteRepository as any,
      faceValidationService as any,
      recommendationService as any
    );
  };

  beforeEach(() => {
    clientRepository = new MongoClientRepository();

    // reservarAnalisisIA y liberarLockAnalisisIA quedan reales (son lo que se
    // está probando). Solo se evita que la escritura final intente abrir una
    // transacción real, que el mongod standalone de test no soporta.
    jest.spyOn(clientRepository, 'updateAnalisisIA').mockImplementation(async (id: string, data: any) => {
      await RegisteredClient.findByIdAndUpdate(id, { $set: data });
    });
    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    } as any);
  });

  afterEach(async () => {
    await RegisteredClient.deleteMany({});
  });

  it('ante dos requests simultáneas del mismo cliente, solo una pasa y el cupo no se gasta dos veces', async () => {
    const clienteId = await crearCliente();
    const dto = { clienteId, imagenBuffer: Buffer.from('foto'), mimeType: 'image/jpeg' };

    const resultados = await Promise.allSettled([
      buildUseCase().execute(dto),
      buildUseCase().execute(dto),
    ]);

    const exitosos = resultados.filter((r) => r.status === 'fulfilled');
    const rechazados = resultados.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Cuál código exacto (409 vs 429) ve el perdedor depende de si el ganador ya
    // terminó de confirmar en el instante en que se rechaza — eso es una carrera
    // real de timing, no algo que este test deba fijar. Lo que sí es una garantía
    // dura de la atomicidad: exactamente uno tuvo éxito, y quedó rechazado con un
    // AppError válido (no una excepción no controlada).
    expect(exitosos).toHaveLength(1);
    expect(rechazados).toHaveLength(1);
    expect(rechazados[0].reason).toMatchObject({ statusCode: expect.any(Number), code: expect.any(String) });
    expect([409, 429]).toContain((rechazados[0].reason as any).statusCode);

    const clienteFinal = await RegisteredClient.findById(clienteId).lean();
    expect(clienteFinal?.analisisLockedAt).toBeNull();
    expect(clienteFinal?.ultimoAnalisisFecha).not.toBeNull();
  });

  it('si el lock quedó pegado hace más de 2 minutos, un nuevo execute() lo libera y avanza', async () => {
    const hace3Minutos = new Date(Date.now() - 3 * 60 * 1000);
    const clienteId = await crearCliente({ analisisLockedAt: hace3Minutos });
    const dto = { clienteId, imagenBuffer: Buffer.from('foto'), mimeType: 'image/jpeg' };

    const resultado = await buildUseCase().execute(dto);

    expect(resultado).toEqual({ id: expect.any(String), ...recomendacion });

    const clienteFinal = await RegisteredClient.findById(clienteId).lean();
    expect(clienteFinal?.analisisLockedAt).toBeNull();
    expect(clienteFinal?.ultimoAnalisisFecha).not.toBeNull();
  });

  it('si el lock está activo y NO vencido, un nuevo execute() es rechazado', async () => {
    const hace30Segundos = new Date(Date.now() - 30 * 1000);
    const clienteId = await crearCliente({ analisisLockedAt: hace30Segundos });
    const dto = { clienteId, imagenBuffer: Buffer.from('foto'), mimeType: 'image/jpeg' };

    await expect(buildUseCase().execute(dto)).rejects.toMatchObject({
      statusCode: 409,
      code: 'ANALYSIS_IN_PROGRESS',
    });
  });
});
