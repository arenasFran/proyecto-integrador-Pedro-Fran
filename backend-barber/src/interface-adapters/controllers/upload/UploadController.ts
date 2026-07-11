import { Request, Response } from 'express';
import { CloudinaryService, extractPublicIdFromUrl } from '../../../infrastructure/services/CloudinaryService';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class UploadController {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly userRepository: MongoUserRepository
  ) {}

  uploadAvatar = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        throw new AppError('No se envió ninguna imagen.', 400);
      }

      const photoUrl = await this.cloudinary.uploadImage(req.file.buffer);

      const { oldPhotoUrl } = req.body;
      if (oldPhotoUrl && (await this.canDeletePhoto(req.user!._id, req.user!.kind, oldPhotoUrl))) {
        const publicId = extractPublicIdFromUrl(oldPhotoUrl);
        if (publicId) {
          await this.cloudinary.deleteImage(publicId);
        }
      }

      return sendSuccess(res, { photoUrl }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al subir la imagen');
    }
  };

  private async canDeletePhoto(userId: string, userKind: string, photoUrl: string): Promise<boolean> {
    if (userKind === 'Admin') return true;
    const user = await this.userRepository.findById(userId);
    return !!user && user.photoUrl === photoUrl;
  }
}
