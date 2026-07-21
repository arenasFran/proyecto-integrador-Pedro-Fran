import mongoose from 'mongoose';
import { AnalizarCorteUseCase } from '../../../../src/application/use-cases/analisis-corte/AnalizarCorteUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Client } from '../../../../src/domain/entities/Client';
import { Service } from '../../../../src/domain/entities/Service';
import {
  makeMockClientRepository,
  makeMockMembershipRepository,
  makeMockServiceRepository,
  makeMockAnalisisCorteRepository,
  makeMockFaceValidationService,
  makeMockRecommendationService,
} from '../../../test-utils/mocks';

describe('AnalizarCorteUseCase', () => {
  let capturedSession: any;

  const makeClient = (overrides?: Partial<Parameters<typeof Client.create>[0]>) =>
    Client.create({
      id: 'client-1',
      name: 'Juan',
      lastname: 'Perez',
      kind: 'Registrado',
      contactEmail: 'juan@example.com',
      consentimientoAnalisisIA: false,
      ultimoAnalisisFecha: null,
      ...overrides,
    });

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

  const buildUseCase = () => {
    const clientRepository = makeMockClientRepository();
    const membershipRepository = makeMockMembershipRepository();
    const serviceRepository = makeMockServiceRepository();
    const analisisCorteRepository = makeMockAnalisisCorteRepository();
    const faceValidationService = makeMockFaceValidationService();
    const recommendationService = makeMockRecommendationService();

    const useCase = new AnalizarCorteUseCase(
      clientRepository as any,
      membershipRepository as any,
      serviceRepository as any,
      analisisCorteRepository as any,
      faceValidationService as any,
      recommendationService as any
    );

    return {
      useCase,
      clientRepository,
      membershipRepository,
      serviceRepository,
      analisisCorteRepository,
      faceValidationService,
      recommendationService,
    };
  };

  beforeEach(() => {
    capturedSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(capturedSession);
  });

  const dto = {
    clienteId: 'client-1',
    imagenBuffer: Buffer.from('foto'),
    mimeType: 'image/jpeg',
  };

  it('analiza y guarda con éxito cuando todo es válido', async () => {
    const deps = buildUseCase();
    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(makeClient({ consentimientoAnalisisIA: true }));
    deps.faceValidationService.validar.mockResolvedValue({ valido: true });
    deps.serviceRepository.findAll.mockResolvedValue([makeService('Corte de pelo'), makeService('Promo x2')]);
    deps.recommendationService.recomendar.mockResolvedValue(recomendacion);
    deps.analisisCorteRepository.create.mockResolvedValue({
      id: 'a1',
      clienteId: 'client-1',
      resultado: recomendacion,
      createdAt: new Date(),
    });

    const resultado = await deps.useCase.execute(dto);

    expect(resultado).toEqual(recomendacion);
    // Promo x2 debe quedar excluida del prompt
    expect(deps.recommendationService.recomendar).toHaveBeenCalledWith(
      dto.imagenBuffer,
      dto.mimeType,
      [{ name: 'Corte de pelo', description: 'Descripción de Corte de pelo' }]
    );
    expect(deps.analisisCorteRepository.create).toHaveBeenCalledWith('client-1', recomendacion, capturedSession);
    expect(deps.clientRepository.updateAnalisisIA).toHaveBeenCalledWith(
      'client-1',
      { consentimientoAnalisisIA: true, ultimoAnalisisFecha: expect.any(Date) },
      capturedSession
    );
    expect(capturedSession.commitTransaction).toHaveBeenCalled();
  });

  it('rechaza si el cliente no tiene membresía activa', async () => {
    const deps = buildUseCase();
    deps.membershipRepository.hasActiveMembership.mockResolvedValue(false);

    await expect(deps.useCase.execute(dto)).rejects.toMatchObject({ statusCode: 403 });
    expect(deps.clientRepository.findById).not.toHaveBeenCalled();
  });

  it('exige consentimiento si el cliente todavía no lo dio', async () => {
    const deps = buildUseCase();
    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(makeClient({ consentimientoAnalisisIA: false }));

    await expect(deps.useCase.execute(dto)).rejects.toMatchObject({
      statusCode: 400,
      code: 'CONSENT_REQUIRED',
    });
    expect(deps.faceValidationService.validar).not.toHaveBeenCalled();
  });

  it('permite avanzar si el cliente manda aceptaConsentimiento=true la primera vez', async () => {
    const deps = buildUseCase();
    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(makeClient({ consentimientoAnalisisIA: false }));
    deps.faceValidationService.validar.mockResolvedValue({ valido: true });
    deps.serviceRepository.findAll.mockResolvedValue([makeService('Corte de pelo')]);
    deps.recommendationService.recomendar.mockResolvedValue(recomendacion);
    deps.analisisCorteRepository.create.mockResolvedValue({
      id: 'a1',
      clienteId: 'client-1',
      resultado: recomendacion,
      createdAt: new Date(),
    });

    await deps.useCase.execute({ ...dto, aceptaConsentimiento: true });

    expect(deps.clientRepository.updateAnalisisIA).toHaveBeenCalledWith(
      'client-1',
      { consentimientoAnalisisIA: true, ultimoAnalisisFecha: expect.any(Date) },
      capturedSession
    );
  });

  it('rechaza si todavía no pasaron 30 días desde el último análisis exitoso', async () => {
    const deps = buildUseCase();
    const hace10Dias = new Date();
    hace10Dias.setDate(hace10Dias.getDate() - 10);

    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(
      makeClient({ consentimientoAnalisisIA: true, ultimoAnalisisFecha: hace10Dias })
    );

    await expect(deps.useCase.execute(dto)).rejects.toMatchObject({
      statusCode: 429,
      code: 'QUOTA_EXCEEDED',
    });
    expect(deps.faceValidationService.validar).not.toHaveBeenCalled();
  });

  it('permite un nuevo análisis si ya pasaron 30 días', async () => {
    const deps = buildUseCase();
    const hace31Dias = new Date();
    hace31Dias.setDate(hace31Dias.getDate() - 31);

    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(
      makeClient({ consentimientoAnalisisIA: true, ultimoAnalisisFecha: hace31Dias })
    );
    deps.faceValidationService.validar.mockResolvedValue({ valido: true });
    deps.serviceRepository.findAll.mockResolvedValue([makeService('Corte de pelo')]);
    deps.recommendationService.recomendar.mockResolvedValue(recomendacion);
    deps.analisisCorteRepository.create.mockResolvedValue({
      id: 'a1',
      clienteId: 'client-1',
      resultado: recomendacion,
      createdAt: new Date(),
    });

    await expect(deps.useCase.execute(dto)).resolves.toEqual(recomendacion);
  });

  it('no descuenta cupo si la foto es inválida', async () => {
    const deps = buildUseCase();
    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(makeClient({ consentimientoAnalisisIA: true }));
    deps.faceValidationService.validar.mockResolvedValue({ valido: false, motivo: 'Foto borrosa' });

    await expect(deps.useCase.execute(dto)).rejects.toMatchObject({
      statusCode: 422,
      code: 'PHOTO_INVALID',
      message: 'Foto borrosa',
    });
    expect(deps.clientRepository.updateAnalisisIA).not.toHaveBeenCalled();
    expect(deps.recommendationService.recomendar).not.toHaveBeenCalled();
  });

  it('no descuenta cupo si el proveedor de IA falla', async () => {
    const deps = buildUseCase();
    deps.membershipRepository.hasActiveMembership.mockResolvedValue(true);
    deps.clientRepository.findById.mockResolvedValue(makeClient({ consentimientoAnalisisIA: true }));
    deps.faceValidationService.validar.mockResolvedValue({ valido: true });
    deps.serviceRepository.findAll.mockResolvedValue([makeService('Corte de pelo')]);
    deps.recommendationService.recomendar.mockRejectedValue(new AppError('El servicio de recomendación no está disponible, probá de nuevo en unos segundos.', 503, 'AI_ERROR'));

    await expect(deps.useCase.execute(dto)).rejects.toMatchObject({ statusCode: 503, code: 'AI_ERROR' });
    expect(deps.clientRepository.updateAnalisisIA).not.toHaveBeenCalled();
    expect(deps.analisisCorteRepository.create).not.toHaveBeenCalled();
  });
});
