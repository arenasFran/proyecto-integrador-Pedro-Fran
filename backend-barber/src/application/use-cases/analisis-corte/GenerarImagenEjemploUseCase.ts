import { MongoAnalisisCorteRepository } from '../../../infrastructure/repositories/mongodb/MongoAnalisisCorteRepository';
import { CloudinaryService } from '../../../infrastructure/services/CloudinaryService';
import { IImageGenerationService } from '../../ports/IImageGenerationService';
import { AppError } from '../../../domain/errors/AppError';

type GenerarImagenEjemploDTO = {
  clienteId: string;
  analisisId: string;
  corteIndex: number;
};

export class GenerarImagenEjemploUseCase {
  constructor(
    private readonly analisisCorteRepository: MongoAnalisisCorteRepository,
    private readonly imageGenerationService: IImageGenerationService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async execute(dto: GenerarImagenEjemploDTO): Promise<string> {
    const registro = await this.analisisCorteRepository.findById(dto.analisisId);
    if (!registro || registro.clienteId !== dto.clienteId) {
      throw new AppError('Análisis no encontrado.', 404);
    }

    const corte = registro.resultado.cortesRecomendados[dto.corteIndex];
    if (!corte) {
      throw new AppError('Corte recomendado no encontrado.', 400);
    }

    // Ya se pagó por generarla una vez: se reusa en vez de volver a llamar a la IA.
    if (corte.imagenEjemploUrl) {
      return corte.imagenEjemploUrl;
    }

    const imagen = await this.imageGenerationService.generarEjemploDeCorte(corte.nombreCorte, corte.descripcion);
    const imagenUrl = await this.cloudinaryService.uploadImage(Buffer.from(imagen.base64, 'base64'), 'cortes-ejemplo');

    await this.analisisCorteRepository.actualizarImagenEjemplo(dto.analisisId, dto.corteIndex, imagenUrl);

    return imagenUrl;
  }
}
