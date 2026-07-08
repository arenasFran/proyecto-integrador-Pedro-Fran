import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { getConfig } from '../config/env';

export class CloudinaryService {
  constructor() {
    const config = getConfig();
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
    });
  }

  async uploadImage(fileBuffer: Buffer, folder = 'avatars', cropSquare = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const options: Record<string, unknown> = { folder, resource_type: 'image' };
      if (cropSquare) {
        options.width = 800;
        options.height = 800;
        options.crop = 'fill';
        options.gravity = 'auto';
      }
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.secure_url);
        }
      );
      const readable = new Readable();
      readable.push(fileBuffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error al eliminar imagen de Cloudinary:', error);
    }
  }
}

function extractPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}

export { extractPublicIdFromUrl };
