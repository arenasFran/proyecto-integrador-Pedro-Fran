import OpenAI, { toFile } from 'openai';
import { IImageGenerationService, ImagenGenerada } from '../../application/ports/IImageGenerationService';
import { DALLE_BASE_IMAGE_PNG_B64, DALLE_MASK_PNG_B64 } from '../assets/dalleAssets';
import { AppError } from '../../domain/errors/AppError';

const DALLE_MODEL = 'dall-e-2';
const DALLE_SIZE = '1024x1024';

// dall-e-2 no permite elegir "no verificar organización", pero tampoco necesita
// verificación de identidad como los modelos gpt-image-*; es más lento que Gemini
// para editar, se le da margen generoso.
const OPENAI_IMAGE_TIMEOUT_MS = 60 * 1000;

function construirPrompt(nombreCorte: string, descripcion: string): string {
  return `Line-art illustration of a head, front view, black and white drawing style. Fill in the transparent hair area with a "${nombreCorte}" haircut (${descripcion}). Match the same simple line-art style as the rest of the image: black outlines, no color, no shading, no text, no watermark.`;
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
      const [image, mask] = await Promise.all([
        toFile(Buffer.from(DALLE_BASE_IMAGE_PNG_B64, 'base64'), 'base.png', { type: 'image/png' }),
        toFile(Buffer.from(DALLE_MASK_PNG_B64, 'base64'), 'mask.png', { type: 'image/png' }),
      ]);

      response = await client.images.edit({
        model: DALLE_MODEL,
        image,
        mask,
        prompt: construirPrompt(nombreCorte, descripcion),
        size: DALLE_SIZE,
        n: 1,
        response_format: 'b64_json',
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
