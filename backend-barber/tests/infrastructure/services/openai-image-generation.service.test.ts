const editMock = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    images: { edit: editMock },
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
    editMock.mockResolvedValue({ data: [{ b64_json: 'ZmFrZS1pbWFnZQ==' }] });
    const service = new OpenAIImageGenerationService('sk-test');

    const result = await service.generarEjemploDeCorte('Undercut', 'corte moderno con volumen');

    expect(result).toEqual({ base64: 'ZmFrZS1pbWFnZQ==', mimeType: 'image/png' });
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({
      model: 'dall-e-2',
      prompt: expect.stringContaining('Undercut'),
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json',
    }));
  });

  it('debe lanzar AppError 503 si la llamada a OpenAI falla', async () => {
    editMock.mockRejectedValue(new Error('rate limit'));
    const service = new OpenAIImageGenerationService('sk-test');

    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toThrow(AppError);
    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toMatchObject({ statusCode: 503, code: 'AI_IMAGE_ERROR' });
  });

  it('debe lanzar AppError 503 si la respuesta no trae b64_json', async () => {
    editMock.mockResolvedValue({ data: [{}] });
    const service = new OpenAIImageGenerationService('sk-test');

    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toMatchObject({ statusCode: 503, code: 'AI_IMAGE_ERROR' });
  });

  it('debe lanzar AppError 503 si la respuesta no trae data', async () => {
    editMock.mockResolvedValue({ data: [] });
    const service = new OpenAIImageGenerationService('sk-test');

    await expect(service.generarEjemploDeCorte('Undercut', 'desc')).rejects.toMatchObject({ statusCode: 503, code: 'AI_IMAGE_ERROR' });
  });
});
