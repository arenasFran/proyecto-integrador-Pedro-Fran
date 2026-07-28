import { GenerarImagenEjemploUseCase } from '../../../../src/application/use-cases/analisis-corte/GenerarImagenEjemploUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import {
  makeMockAnalisisCorteRepository,
  makeMockImageGenerationService,
  makeMockCloudinaryService,
} from '../../../test-utils/mocks';

describe('GenerarImagenEjemploUseCase', () => {
  const buildUseCase = () => {
    const analisisCorteRepository = makeMockAnalisisCorteRepository();
    const imageGenerationService = makeMockImageGenerationService();
    const cloudinaryService = makeMockCloudinaryService();

    const useCase = new GenerarImagenEjemploUseCase(
      analisisCorteRepository as any,
      imageGenerationService as any,
      cloudinaryService as any
    );

    return { useCase, analisisCorteRepository, imageGenerationService, cloudinaryService };
  };

  const registro = {
    id: 'a1',
    clienteId: 'client-1',
    resultado: {
      formaCara: 'ovalada',
      cortesRecomendados: [
        { nombreCorte: 'Fade bajo', descripcion: 'desc', razon: 'razon', servicioSugerido: 'Corte de pelo' },
      ],
      explicacionGeneral: 'explicacion',
    },
    createdAt: new Date(),
  };

  it('genera la imagen, la sube a Cloudinary y la persiste cuando no hay una cacheada', async () => {
    const deps = buildUseCase();
    deps.analisisCorteRepository.findById.mockResolvedValue(registro);
    deps.imageGenerationService.generarEjemploDeCorte.mockResolvedValue({
      base64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
    });
    deps.cloudinaryService.uploadImage.mockResolvedValue('https://res.cloudinary.com/demo/cortes-ejemplo/fake.png');

    const url = await deps.useCase.execute({ clienteId: 'client-1', analisisId: 'a1', corteIndex: 0 });

    expect(deps.imageGenerationService.generarEjemploDeCorte).toHaveBeenCalledWith('Fade bajo', 'desc');
    expect(deps.cloudinaryService.uploadImage).toHaveBeenCalledWith(Buffer.from('ZmFrZS1pbWFnZQ==', 'base64'), 'cortes-ejemplo');
    expect(deps.analisisCorteRepository.actualizarImagenEjemplo).toHaveBeenCalledWith(
      'a1',
      0,
      'https://res.cloudinary.com/demo/cortes-ejemplo/fake.png'
    );
    expect(url).toBe('https://res.cloudinary.com/demo/cortes-ejemplo/fake.png');
  });

  it('devuelve la imagen cacheada sin volver a llamar a la IA si ya existe', async () => {
    const deps = buildUseCase();
    deps.analisisCorteRepository.findById.mockResolvedValue({
      ...registro,
      resultado: {
        ...registro.resultado,
        cortesRecomendados: [
          { ...registro.resultado.cortesRecomendados[0], imagenEjemploUrl: 'https://res.cloudinary.com/demo/ya-existe.png' },
        ],
      },
    });

    const url = await deps.useCase.execute({ clienteId: 'client-1', analisisId: 'a1', corteIndex: 0 });

    expect(url).toBe('https://res.cloudinary.com/demo/ya-existe.png');
    expect(deps.imageGenerationService.generarEjemploDeCorte).not.toHaveBeenCalled();
    expect(deps.cloudinaryService.uploadImage).not.toHaveBeenCalled();
    expect(deps.analisisCorteRepository.actualizarImagenEjemplo).not.toHaveBeenCalled();
  });

  it('rechaza si el análisis no existe', async () => {
    const deps = buildUseCase();
    deps.analisisCorteRepository.findById.mockResolvedValue(null);

    await expect(
      deps.useCase.execute({ clienteId: 'client-1', analisisId: 'a1', corteIndex: 0 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rechaza si el análisis pertenece a otro cliente (IDOR)', async () => {
    const deps = buildUseCase();
    deps.analisisCorteRepository.findById.mockResolvedValue({ ...registro, clienteId: 'otro-cliente' });

    await expect(
      deps.useCase.execute({ clienteId: 'client-1', analisisId: 'a1', corteIndex: 0 })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.imageGenerationService.generarEjemploDeCorte).not.toHaveBeenCalled();
  });

  it('rechaza si el corteIndex está fuera de rango', async () => {
    const deps = buildUseCase();
    deps.analisisCorteRepository.findById.mockResolvedValue(registro);

    await expect(
      deps.useCase.execute({ clienteId: 'client-1', analisisId: 'a1', corteIndex: 5 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
