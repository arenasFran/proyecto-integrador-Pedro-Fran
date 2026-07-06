import { Request, Response } from 'express';
import { CloudinaryService, extractPublicIdFromUrl } from '../../../infrastructure/services/CloudinaryService';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class UploadController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  uploadAvatar = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        throw new AppError('No se envió ninguna imagen.', 400);
      }

      const { oldPhotoUrl } = req.body;
      if (oldPhotoUrl) {
        const publicId = extractPublicIdFromUrl(oldPhotoUrl);
        if (publicId) {
          await this.cloudinary.deleteImage(publicId);
        }
      }

      const photoUrl = await this.cloudinary.uploadImage(req.file.buffer);
      return sendSuccess(res, { photoUrl }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al subir la imagen');
    }
  };
}
