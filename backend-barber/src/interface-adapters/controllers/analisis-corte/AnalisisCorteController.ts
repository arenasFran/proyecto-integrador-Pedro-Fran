import { Request, Response } from 'express';
import { AnalizarCorteUseCase } from '../../../application/use-cases/analisis-corte/AnalizarCorteUseCase';
import { calcularCupoAnalisisCorte } from '../../../application/use-cases/analisis-corte/calcularCupoAnalisisCorte';
import { GenerarImagenEjemploUseCase } from '../../../application/use-cases/analisis-corte/GenerarImagenEjemploUseCase';
import { MongoAnalisisCorteRepository } from '../../../infrastructure/repositories/mongodb/MongoAnalisisCorteRepository';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';
import { sendError, sendSuccess } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class AnalisisCorteController {
  constructor(
    private readonly analizarCorte: AnalizarCorteUseCase,
    private readonly analisisCorteRepository: MongoAnalisisCorteRepository,
    private readonly clientRepository: MongoClientRepository,
    private readonly generarImagenEjemplo: GenerarImagenEjemploUseCase
  ) {}

  analizar = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        throw new AppError('Debés subir una foto.', 400);
      }

      const resultado = await this.analizarCorte.execute({
        clienteId: req.user!._id,
        imagenBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        aceptaConsentimiento: req.body.aceptaConsentimiento === 'true',
      });

      return sendSuccess(res, resultado, 201);
    } catch (error) {
      return sendError(res, error, 'Error al analizar la foto');
    }
  };

  historial = async (req: Request, res: Response) => {
    try {
      const [historial, client] = await Promise.all([
        this.analisisCorteRepository.findByClienteId(req.user!._id),
        this.clientRepository.findById(req.user!._id),
      ]);

      const cupo = calcularCupoAnalisisCorte(client?.ultimoAnalisisFecha ?? null);

      return sendSuccess(res, {
        historial,
        cupo,
        consentimientoAceptado: client?.consentimientoAnalisisIA ?? false,
      });
    } catch (error) {
      return sendError(res, error, 'Error al obtener el historial de análisis');
    }
  };

  imagenEjemplo = async (req: Request, res: Response) => {
    try {
      const { analisisId, corteIndex } = req.body;

      if (
        typeof analisisId !== 'string' ||
        !analisisId.trim() ||
        typeof corteIndex !== 'number' ||
        !Number.isInteger(corteIndex) ||
        corteIndex < 0
      ) {
        throw new AppError('Datos inválidos para generar la imagen de ejemplo.', 400);
      }

      const imagenUrl = await this.generarImagenEjemplo.execute({
        clienteId: req.user!._id,
        analisisId,
        corteIndex,
      });

      return sendSuccess(res, { imagenUrl });
    } catch (error) {
      return sendError(res, error, 'Error al generar la imagen de ejemplo');
    }
  };
}
