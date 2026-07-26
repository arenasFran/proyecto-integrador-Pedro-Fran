import { RekognitionClient, DetectFacesCommand, FaceDetail } from '@aws-sdk/client-rekognition';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { IFaceValidationService, ResultadoValidacionFoto } from '../../application/ports/IFaceValidationService';
import { AppError } from '../../domain/errors/AppError';

export type RekognitionCredentials = {
  region: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  sessionToken: string | undefined;
};

// Bien por debajo de ANALISIS_LOCK_STALE_MS (2 min) para dejar margen a Gemini + la escritura a Mongo.
const REKOGNITION_TIMEOUT_MS = 45 * 1000;

export function validarDetalleCara(faceDetails: FaceDetail[]): ResultadoValidacionFoto {
  if (faceDetails.length === 0) {
    return { valido: false, motivo: 'No se detectó ninguna cara en la foto' };
  }
  if (faceDetails.length > 1) {
    return { valido: false, motivo: 'Se detectó más de una persona, subí una foto individual' };
  }

  const cara = faceDetails[0];

  if ((cara.Confidence ?? 0) < 90) {
    return { valido: false, motivo: 'No se pudo confirmar que la imagen contiene una cara clara' };
  }
  if ((cara.Quality?.Sharpness ?? 0) < 40 || (cara.Quality?.Brightness ?? 0) < 30) {
    return { valido: false, motivo: 'La foto está borrosa o mal iluminada, probá con mejor luz/enfoque' };
  }
  if (Math.abs(cara.Pose?.Yaw ?? 0) > 35) {
    return { valido: false, motivo: 'Subí una foto de frente, no muy de perfil' };
  }
  if (cara.FaceOccluded?.Value && (cara.FaceOccluded.Confidence ?? 0) > 80) {
    return { valido: false, motivo: 'Tu cara está tapada en la foto (mano, cabello, etc.)' };
  }

  return { valido: true };
}

export class RekognitionFaceValidationService implements IFaceValidationService {
  constructor(private readonly credentials: RekognitionCredentials) {}

  private ensureConfigured(): void {
    if (!this.credentials.accessKeyId || !this.credentials.secretAccessKey) {
      throw new Error('Rekognition no está configurado. Faltan credenciales de AWS en el entorno.');
    }
  }

  async validar(imagenBuffer: Buffer): Promise<ResultadoValidacionFoto> {
    this.ensureConfigured();

    const client = new RekognitionClient({
      region: this.credentials.region,
      credentials: {
        accessKeyId: this.credentials.accessKeyId!,
        secretAccessKey: this.credentials.secretAccessKey!,
        sessionToken: this.credentials.sessionToken,
      },
      requestHandler: new NodeHttpHandler({
        requestTimeout: REKOGNITION_TIMEOUT_MS,
        connectionTimeout: 5000,
      }),
    });

    let response;
    try {
      response = await client.send(
        new DetectFacesCommand({
          Image: { Bytes: imagenBuffer },
          Attributes: ['DEFAULT'],
        })
      );
    } catch (error) {
      console.error('[Rekognition] Error al validar la foto:', error);
      const nombre = error instanceof Error ? error.name : '';
      if (nombre === 'InvalidImageFormatException') {
        return { valido: false, motivo: 'Formato de imagen no soportado, subí una foto JPG o PNG.' };
      }
      throw new AppError('No pudimos validar la foto, probá de nuevo en unos segundos.', 503, 'FACE_VALIDATION_ERROR');
    }

    return validarDetalleCara(response.FaceDetails ?? []);
  }
}
