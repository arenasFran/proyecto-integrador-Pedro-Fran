const generateMock = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    images: { generate: generateMock },
  })),
  toFile: jest.fn().mockImplementation(async (buffer: Buffer, filename: string) => ({ buffer, filename })),
}));

import { OpenAIImageGenerationService } from '../../../src/infrastructure/services/OpenAIImageGenerationService';
import { AppError } from '../../../src/domain/errors/AppError';

describe('OpenAIImageGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe lanzar error si no hay API key configurada', async () => {
    const service = new OpenAIImageGenerationService(undefined);
    await expect(service.generarEjemploDeCorte('Undercut', 'corte moderno')).rejects.toThrow(
      'OpenAI no está configurado. Falta OPENAI_API_KEY en el entorno.',
    );
  });

  it('debe devolver la imagen generada en base64', async () => {
    generateMock.mockResolvedValue({ data: [{ b64_json: 'ZmFrZS1pbWFnZQ==' }] });
    const service = new OpenAIImageGenerationService('sk-test');

    const result = await service.generarEjemploDeCorte('Undercut', 'corte moderno con volumen');

    expect(result).toEqual({ base64: 'ZmFrZS1pbWFnZQ==', mimeType: 'image/png' });
    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-image-1-mini',
      prompt: expect.stringContaining('Undercut'),
      size: '1024x1024',
      n: 1,
    }));
  });

  it('debe lanzar AppError 503 si la llamada a OpenAI falla', async () => {
    generateMock.mockRejectedValue(new Error('rate limit'));
    const service = new OpenAIImageGenerationService('sk-test');

    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toThrow(AppError);
    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toMatchObject({ statusCode: 503, code: 'AI_IMAGE_ERROR' });
  });

  it('debe lanzar AppError 503 si la respuesta no trae b64_json', async () => {
    generateMock.mockResolvedValue({ data: [{}] });
    const service = new OpenAIImageGenerationService('sk-test');

    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toMatchObject({ statusCode: 503, code: 'AI_IMAGE_ERROR' });
  });

  it('debe lanzar AppError 503 si la respuesta no trae data', async () => {
    generateMock.mockResolvedValue({ data: [] });
    const service = new OpenAIImageGenerationService('sk-test');

    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toMatchObject({ statusCode: 503, code: 'AI_IMAGE_ERROR' });
  });
});
