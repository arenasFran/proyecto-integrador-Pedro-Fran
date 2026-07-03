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

  async uploadImage(fileBuffer: Buffer, folder = 'avatars'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
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
}
