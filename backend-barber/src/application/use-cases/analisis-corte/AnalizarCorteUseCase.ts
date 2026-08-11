import mongoose from 'mongoose';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoAnalisisCorteRepository, AnalisisCorteRecord } from '../../../infrastructure/repositories/mongodb/MongoAnalisisCorteRepository';
import { IFaceValidationService } from '../../ports/IFaceValidationService';
import { IRecommendationService } from '../../ports/IRecommendationService';
import { IImageGenerationService } from '../../ports/IImageGenerationService';
import { CloudinaryService } from '../../../infrastructure/services/CloudinaryService';
import { AppError } from '../../../domain/errors/AppError';
import { calcularCupoAnalisisCorte } from './calcularCupoAnalisisCorte';

type AnalizarCorteDTO = {
  clienteId: string;
  imagenBuffer: Buffer;
  mimeType: string;
  aceptaConsentimiento?: boolean;
};

export class AnalizarCorteUseCase {
  constructor(
    private readonly clientRepository: MongoClientRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly serviceRepository: MongoServiceRepository,
    private readonly analisisCorteRepository: MongoAnalisisCorteRepository,
    private readonly faceValidationService: IFaceValidationService,
    private readonly recommendationService: IRecommendationService,
    private readonly imageGenerationService?: IImageGenerationService,
    private readonly cloudinaryService?: CloudinaryService
  ) {}

  async execute(dto: AnalizarCorteDTO): Promise<AnalisisCorteRecord['resultado'] & { id: string }> {
    const hasActiveMembership = await this.membershipRepository.hasActiveMembership(dto.clienteId);
    if (!hasActiveMembership) {
      throw new AppError('No tenés una membresía activa.', 403);
    }

    const client = await this.clientRepository.findById(dto.clienteId);
    if (!client) {
      throw new AppError('Cliente no encontrado.', 404);
    }

    if (!client.consentimientoAnalisisIA && !dto.aceptaConsentimiento) {
      throw new AppError(
        'Necesitamos tu consentimiento para analizar la foto. Tu foto no se guarda, solo el resultado.',
        400,
        'CONSENT_REQUIRED'
      );
    }

    const reservado = await this.clientRepository.reservarAnalisisIA(dto.clienteId);
    if (!reservado) {
      // Se relee el cliente en este momento (no se reusa el `client` de arriba):
      // si perdió la carrera contra otro request concurrente, ese snapshot inicial
      // quedó desactualizado y podría mostrar cupo disponible por error.
      const clienteActual = await this.clientRepository.findById(dto.clienteId);
      const cupo = calcularCupoAnalisisCorte(clienteActual?.ultimoAnalisisFecha ?? client.ultimoAnalisisFecha);
      if (!cupo.disponible) {
        const proximaFecha = new Date(cupo.proximaFechaDisponible!);
        throw new AppError(
          `Ya usaste tu análisis de este mes. Podés volver a intentarlo el ${proximaFecha.toLocaleDateString('es-UY')}.`,
          429,
          'QUOTA_EXCEEDED'
        );
      }
      throw new AppError(
        'Ya tenés un análisis en curso, esperá unos segundos e intentá de nuevo.',
        409,
        'ANALYSIS_IN_PROGRESS'
      );
    }

    try {
      const validacion = await this.faceValidationService.validar(dto.imagenBuffer);
      if (!validacion.valido) {
        throw new AppError(validacion.motivo ?? 'La foto no es válida.', 422, 'PHOTO_INVALID');
      }

      const servicios = (await this.serviceRepository.findAll())
        .map((s) => ({ name: s.name, description: s.description }));

      const recomendacion = await this.recommendationService.recomendar(dto.imagenBuffer, dto.mimeType, servicios);

      // Genera las imágenes de ejemplo junto con la recomendación (mientras el
      // cliente ve el loader de escaneo) para que lleguen listas con el resultado.
      // Es best-effort: si una imagen falla, el corte se devuelve sin imagen y el
      // front puede regenerarla con el endpoint /imagen-ejemplo.
      if (this.imageGenerationService && this.cloudinaryService) {
        await Promise.all(
          recomendacion.cortesRecomendados.map(async (corte) => {
            try {
              const imagen = await this.imageGenerationService!.generarEjemploDeCorte(corte.nombreCorte, corte.descripcion);
              corte.imagenEjemploUrl = await this.cloudinaryService!.uploadImage(
                Buffer.from(imagen.base64, 'base64'),
                'cortes-ejemplo'
              );
            } catch (error) {
              console.error('[AnalizarCorte] No se pudo generar la imagen del corte recomendado:', error);
            }
          })
        );
      }

      const session = await mongoose.startSession();
      let registro: AnalisisCorteRecord;
      try {
        session.startTransaction();

        registro = await this.analisisCorteRepository.create(dto.clienteId, recomendacion, session);
        await this.clientRepository.updateAnalisisIA(
          dto.clienteId,
          {
            consentimientoAnalisisIA: true,
            ...(client.consentimientoAnalisisIA ? {} : { consentimientoAnalisisIAFecha: new Date() }),
            ultimoAnalisisFecha: new Date(),
            analisisLockedAt: null,
          },
          session
        );

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      return { id: registro.id, ...registro.resultado };
    } catch (error) {
      await this.clientRepository.liberarLockAnalisisIA(dto.clienteId);
      throw error;
    }
  }
}
