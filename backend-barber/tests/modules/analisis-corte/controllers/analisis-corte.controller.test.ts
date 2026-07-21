import { AnalisisCorteController } from '../../../../src/interface-adapters/controllers/analisis-corte/AnalisisCorteController';
import { createMockRes } from '../../../test-utils/expressMocks';
import { makeMockAnalisisCorteRepository, makeMockClientRepository } from '../../../test-utils/mocks';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Client } from '../../../../src/domain/entities/Client';

describe('AnalisisCorteController', () => {
  let analizarCorte: { execute: jest.Mock };
  let analisisCorteRepository: ReturnType<typeof makeMockAnalisisCorteRepository>;
  let clientRepository: ReturnType<typeof makeMockClientRepository>;
  let controller: AnalisisCorteController;

  const makeClient = (overrides?: Partial<Parameters<typeof Client.create>[0]>) =>
    Client.create({
      id: 'client-1',
      name: 'Juan',
      lastname: 'Perez',
      kind: 'Registrado',
      contactEmail: 'juan@example.com',
      consentimientoAnalisisIA: true,
      ultimoAnalisisFecha: null,
      ...overrides,
    });

  const makeReq = (overrides: Record<string, any> = {}) =>
    ({
      file: { buffer: Buffer.from('fake-photo'), mimetype: 'image/jpeg' },
      body: {},
      user: { _id: 'client-1', email: 'client@example.com', kind: 'Registrado' },
      ...overrides,
    }) as any;

  beforeEach(() => {
    analizarCorte = { execute: jest.fn() };
    analisisCorteRepository = makeMockAnalisisCorteRepository();
    clientRepository = makeMockClientRepository();
    controller = new AnalisisCorteController(
      analizarCorte as any,
      analisisCorteRepository as any,
      clientRepository as any
    );
  });

  describe('analizar', () => {
    it('llama al use case con el buffer, el clienteId y responde 201', async () => {
      const resultado = { formaCara: 'ovalada', cortesRecomendados: [], explicacionGeneral: '' };
      analizarCorte.execute.mockResolvedValue(resultado);
      const req = makeReq();
      const res = createMockRes();

      await controller.analizar(req, res);

      expect(analizarCorte.execute).toHaveBeenCalledWith({
        clienteId: 'client-1',
        imagenBuffer: req.file.buffer,
        mimeType: 'image/jpeg',
        aceptaConsentimiento: false,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(resultado);
    });

    it('interpreta aceptaConsentimiento="true" del form-data como boolean', async () => {
      analizarCorte.execute.mockResolvedValue({});
      const req = makeReq({ body: { aceptaConsentimiento: 'true' } });
      const res = createMockRes();

      await controller.analizar(req, res);

      expect(analizarCorte.execute).toHaveBeenCalledWith(
        expect.objectContaining({ aceptaConsentimiento: true })
      );
    });

    it('responde 400 si no se envió ninguna foto', async () => {
      const req = makeReq({ file: undefined });
      const res = createMockRes();

      await controller.analizar(req, res);

      expect(analizarCorte.execute).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('propaga el status code de un AppError del use case (ej. cupo agotado)', async () => {
      analizarCorte.execute.mockRejectedValue(new AppError('Ya usaste tu análisis de este mes.', 429, 'QUOTA_EXCEEDED'));
      const req = makeReq();
      const res = createMockRes();

      await controller.analizar(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya usaste tu análisis de este mes.', code: 'QUOTA_EXCEEDED' });
    });
  });

  describe('historial', () => {
    it('devuelve el historial completo y el cupo disponible cuando nunca hizo un análisis', async () => {
      const historial = [{ id: 'a1', clienteId: 'client-1', resultado: {}, createdAt: new Date() }];
      analisisCorteRepository.findByClienteId.mockResolvedValue(historial);
      clientRepository.findById.mockResolvedValue(makeClient({ ultimoAnalisisFecha: null }));
      const req = makeReq();
      const res = createMockRes();

      await controller.historial(req, res);

      expect(analisisCorteRepository.findByClienteId).toHaveBeenCalledWith('client-1');
      expect(clientRepository.findById).toHaveBeenCalledWith('client-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        historial,
        cupo: { disponible: true, proximaFechaDisponible: null },
      });
    });

    it('devuelve cupo no disponible con la próxima fecha si el último análisis fue hace menos de 30 días', async () => {
      const hace10Dias = new Date();
      hace10Dias.setDate(hace10Dias.getDate() - 10);
      analisisCorteRepository.findByClienteId.mockResolvedValue([]);
      clientRepository.findById.mockResolvedValue(makeClient({ ultimoAnalisisFecha: hace10Dias }));
      const req = makeReq();
      const res = createMockRes();

      await controller.historial(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          cupo: { disponible: false, proximaFechaDisponible: expect.any(String) },
        })
      );
    });
  });
});
