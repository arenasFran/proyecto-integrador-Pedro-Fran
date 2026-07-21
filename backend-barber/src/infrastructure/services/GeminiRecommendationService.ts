import { GoogleGenAI } from '@google/genai';
import {
  IRecommendationService,
  ResultadoRecomendacion,
  ServicioParaPrompt,
} from '../../application/ports/IRecommendationService';
import { AppError } from '../../domain/errors/AppError';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

export class GeminiRecommendationService implements IRecommendationService {
  constructor(private readonly apiKey: string | undefined) {}

  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new Error('Gemini no está configurado. Falta GEMINI_API_KEY en el entorno.');
    }
  }

  private construirPrompt(servicios: ServicioParaPrompt[]): string {
    const listaServicios = servicios.map((s) => `- "${s.name}": ${s.description}`).join('\n');

    return `
Sos un barbero experto con conocimiento actualizado de cortes y tendencias de peluquería real.

Analizá la foto adjunta y determiná la forma de cara de la persona (ovalada, redonda, cuadrada, alargada, triangular, o diamante).

Con base en la forma de cara, recomendá entre 2 y 3 cortes de cabello reales y actuales que existen en el mundo real (ej: fade bajo, undercut, textured crop, pompadour, buzz cut, etc.) que le queden bien a esa forma de rostro.

Estos son los servicios que ofrece la barbería (usá EXACTAMENTE estos nombres, sin modificarlos, para indicar qué debería reservar el cliente):
${listaServicios}

Para cada corte recomendado, indicá cuál de estos servicios (por su nombre exacto de la lista) debería reservar el cliente para realizárselo.

Respondé ÚNICAMENTE con JSON, sin texto adicional, con esta estructura:
{
  "formaCara": "string",
  "cortesRecomendados": [
    {
      "nombreCorte": "string (nombre real del corte)",
      "descripcion": "string (breve descripción del corte)",
      "razon": "string (por qué le queda bien a esta forma de cara)",
      "servicioSugerido": "string (EXACTAMENTE uno de los nombres de servicio listados arriba)"
    }
  ],
  "explicacionGeneral": "string"
}
`.trim();
  }

  private parsearYValidar(texto: string, servicios: ServicioParaPrompt[]): ResultadoRecomendacion {
    let parsed: unknown;
    try {
      parsed = JSON.parse(texto);
    } catch {
      throw new AppError('El servicio de recomendación no está disponible, probá de nuevo en unos segundos.', 503, 'AI_ERROR');
    }

    const resultado = parsed as Partial<ResultadoRecomendacion>;
    const nombresValidos = new Set(servicios.map((s) => s.name));

    if (
      !resultado ||
      typeof resultado.formaCara !== 'string' ||
      typeof resultado.explicacionGeneral !== 'string' ||
      !Array.isArray(resultado.cortesRecomendados) ||
      resultado.cortesRecomendados.length === 0 ||
      resultado.cortesRecomendados.some(
        (c) =>
          typeof c.nombreCorte !== 'string' ||
          typeof c.descripcion !== 'string' ||
          typeof c.razon !== 'string' ||
          !nombresValidos.has(c.servicioSugerido)
      )
    ) {
      throw new AppError('El servicio de recomendación no está disponible, probá de nuevo en unos segundos.', 503, 'AI_ERROR');
    }

    return resultado as ResultadoRecomendacion;
  }

  async recomendar(
    imagenBuffer: Buffer,
    mimeType: string,
    servicios: ServicioParaPrompt[]
  ): Promise<ResultadoRecomendacion> {
    this.ensureConfigured();

    const ai = new GoogleGenAI({ apiKey: this.apiKey! });

    let response;
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: this.construirPrompt(servicios) },
              { inlineData: { data: imagenBuffer.toString('base64'), mimeType } },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
    } catch {
      throw new AppError('El servicio de recomendación no está disponible, probá de nuevo en unos segundos.', 503, 'AI_ERROR');
    }

    const texto = response.text;
    if (!texto) {
      throw new AppError('El servicio de recomendación no está disponible, probá de nuevo en unos segundos.', 503, 'AI_ERROR');
    }

    return this.parsearYValidar(texto, servicios);
  }
}
