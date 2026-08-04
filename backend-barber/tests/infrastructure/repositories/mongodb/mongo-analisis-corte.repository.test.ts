import mongoose from 'mongoose';
import { MongoAnalisisCorteRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoAnalisisCorteRepository';
import { AnalisisCorteModel } from '../../../../src/infrastructure/repositories/mongodb/models/analisis-corte.model';
import type { ResultadoRecomendacion } from '../../../../src/application/ports/IRecommendationService';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const makeResultado = (overrides: Partial<ResultadoRecomendacion> = {}): ResultadoRecomendacion => ({
  formaCara: 'ovalada',
  explicacionGeneral: 'Tu forma de cara combina bien con cortes con volumen arriba.',
  cortesRecomendados: [
    { nombreCorte: 'Undercut', descripcion: 'Corte moderno', razon: 'Realza el rostro ovalado', servicioSugerido: 'Corte de pelo' },
    { nombreCorte: 'Pompadour', descripcion: 'Clásico con volumen', razon: 'Equilibra las proporciones', servicioSugerido: 'Corte de pelo' },
  ],
  ...overrides,
});

describeIfMongo('MongoAnalisisCorteRepository', () => {
  let repository: MongoAnalisisCorteRepository;
  const clienteId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    repository = new MongoAnalisisCorteRepository();
  });

  afterEach(async () => {
    await AnalisisCorteModel.deleteMany({});
  });

  describe('create', () => {
    it('debe crear el análisis y devolverlo con id y clienteId como strings', async () => {
      const created = await repository.create(clienteId, makeResultado());

      expect(created.id).toBeTruthy();
      expect(created.clienteId).toBe(clienteId);
      expect(created.resultado.formaCara).toBe('ovalada');
      expect(created.resultado.cortesRecomendados).toHaveLength(2);
      expect(created.createdAt).toBeInstanceOf(Date);

      const inDb = await AnalisisCorteModel.findById(created.id);
      expect(inDb).not.toBeNull();
    });
  });

  describe('findByClienteId', () => {
    it('debe devolver los análisis del cliente ordenados por fecha descendente', async () => {
      const first = await repository.create(clienteId, makeResultado({ formaCara: 'redonda' }));
      await new Promise((r) => setTimeout(r, 5));
      const second = await repository.create(clienteId, makeResultado({ formaCara: 'cuadrada' }));

      const result = await repository.findByClienteId(clienteId);

      expect(result.total).toBe(2);
      expect(result.data[0].id).toBe(second.id);
      expect(result.data[1].id).toBe(first.id);
    });

    it('no debe devolver análisis de otro cliente', async () => {
      await repository.create(clienteId, makeResultado());
      await repository.create(new mongoose.Types.ObjectId().toString(), makeResultado());

      const result = await repository.findByClienteId(clienteId);

      expect(result.total).toBe(1);
    });

    it('debe paginar los resultados', async () => {
      for (let i = 0; i < 3; i++) await repository.create(clienteId, makeResultado());

      const result = await repository.findByClienteId(clienteId, { page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('debe usar page=1 y limit=20 por defecto ante valores inválidos', async () => {
      await repository.create(clienteId, makeResultado());

      const result = await repository.findByClienteId(clienteId, { page: 0, limit: -5 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('debe devolver vacío si el cliente no tiene análisis', async () => {
      const result = await repository.findByClienteId(new mongoose.Types.ObjectId().toString());

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('debe devolver el análisis por id', async () => {
      const created = await repository.create(clienteId, makeResultado());
      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.resultado.formaCara).toBe('ovalada');
    });

    it('debe devolver null si el id no existe', async () => {
      const found = await repository.findById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });

    it('debe devolver null (sin lanzar) si el id no tiene formato válido', async () => {
      const found = await repository.findById('no-es-un-object-id');
      expect(found).toBeNull();
    });
  });

  describe('actualizarImagenEjemplo', () => {
    it('debe actualizar la imagenEjemploUrl del corte en el índice indicado', async () => {
      const created = await repository.create(clienteId, makeResultado());

      await repository.actualizarImagenEjemplo(created.id, 0, 'https://cdn.test/imagen.jpg');

      const updated = await repository.findById(created.id);
      expect(updated!.resultado.cortesRecomendados[0].imagenEjemploUrl).toBe('https://cdn.test/imagen.jpg');
      expect(updated!.resultado.cortesRecomendados[1].imagenEjemploUrl).toBeUndefined();
    });
  });
});
