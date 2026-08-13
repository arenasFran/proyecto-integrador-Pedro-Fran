import OpenAI from 'openai';
import { IImageGenerationService, ImagenGenerada } from '../../application/ports/IImageGenerationService';
import { AppError } from '../../domain/errors/AppError';

// gpt-image-1-mini: el modelo de imágenes de entrada más barato de OpenAI
// (DALL-E 2 fue deprecado y ya no existe en la API).
const GPT_IMAGE_MODEL = 'gpt-image-1-mini';
const GPT_IMAGE_SIZE = '1024x1024';
const OPENAI_IMAGE_TIMEOUT_MS = 90 * 1000;

function construirPrompt(nombreCorte: string, descripcion: string): string {
  return `Black and white line-art illustration of a male head, front view. The hairstyle is a "${nombreCorte}" (${descripcion}). Simple black outlines, flat white background, no color, no shading, no text, no watermark.`;
}

export class OpenAIImageGenerationService implements IImageGenerationService {
  constructor(private readonly apiKey: string | undefined) {}

  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new Error('OpenAI no está configurado. Falta OPENAI_API_KEY en el entorno.');
    }
  }

  async generarEjemploDeCorte(nombreCorte: string, descripcion: string): Promise<ImagenGenerada> {
    this.ensureConfigured();

    const client = new OpenAI({ apiKey: this.apiKey!, timeout: OPENAI_IMAGE_TIMEOUT_MS });

    let response;
    try {
      response = await client.images.generate({
        model: GPT_IMAGE_MODEL,
        prompt: construirPrompt(nombreCorte, descripcion),
        size: GPT_IMAGE_SIZE,
        n: 1,
      });
    } catch (error) {
      console.error('[OpenAI] Error al generar la imagen de ejemplo:', error);
      throw new AppError('No se pudo generar la imagen de ejemplo, probá de nuevo en unos segundos.', 503, 'AI_IMAGE_ERROR');
    }

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new AppError('No se pudo generar la imagen de ejemplo, probá de nuevo en unos segundos.', 503, 'AI_IMAGE_ERROR');
    }

    return { base64, mimeType: 'image/png' };
  }
}
