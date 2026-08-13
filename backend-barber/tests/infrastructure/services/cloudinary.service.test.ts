import { PassThrough } from 'stream';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService, extractPublicIdFromUrl } from '../../../src/infrastructure/services/CloudinaryService';

const mockedCloudinary = cloudinary as unknown as {
  config: jest.Mock;
  uploader: { upload_stream: jest.Mock; destroy: jest.Mock };
};

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CloudinaryService();
  });

  it('debe configurar el SDK de Cloudinary con las credenciales del config', () => {
    expect(mockedCloudinary.config).toHaveBeenCalledWith(
      expect.objectContaining({ cloud_name: expect.anything(), api_key: expect.anything(), api_secret: expect.anything() }),
    );
  });

  describe('uploadImage', () => {
    it('debe subir la imagen y devolver la secure_url', async () => {
      mockedCloudinary.uploader.upload_stream.mockImplementation((_options: unknown, callback: (err: unknown, result: unknown) => void) => {
        const stream = new PassThrough();
        stream.on('finish', () => callback(null, { secure_url: 'https://cloudinary.test/img.jpg' }));
        return stream;
      });

      const url = await service.uploadImage(Buffer.from('fake-image-data'));

      expect(url).toBe('https://cloudinary.test/img.jpg');
      expect(mockedCloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'avatars', resource_type: 'image' }),
        expect.any(Function),
      );
    });

    it('con cropSquare=true debe pasar las opciones de recorte cuadrado', async () => {
      mockedCloudinary.uploader.upload_stream.mockImplementation((_options: unknown, callback: (err: unknown, result: unknown) => void) => {
        const stream = new PassThrough();
        stream.on('finish', () => callback(null, { secure_url: 'https://cloudinary.test/square.jpg' }));
        return stream;
      });

      await service.uploadImage(Buffer.from('data'), 'perfiles', true);

      expect(mockedCloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'perfiles', width: 800, height: 800, crop: 'fill', gravity: 'auto' }),
        expect.any(Function),
      );
    });

    it('debe rechazar la promesa si Cloudinary devuelve un error', async () => {
      mockedCloudinary.uploader.upload_stream.mockImplementation((_options: unknown, callback: (err: unknown, result: unknown) => void) => {
        const stream = new PassThrough();
        stream.on('finish', () => callback(new Error('upload falló'), null));
        return stream;
      });

      await expect(service.uploadImage(Buffer.from('data'))).rejects.toThrow('upload falló');
    });
  });

  describe('deleteImage', () => {
    it('debe eliminar la imagen por publicId', async () => {
      mockedCloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      await service.deleteImage('avatars/abc123');

      expect(mockedCloudinary.uploader.destroy).toHaveBeenCalledWith('avatars/abc123');
    });

    it('no debe lanzar si Cloudinary falla al eliminar', async () => {
      mockedCloudinary.uploader.destroy.mockRejectedValue(new Error('not found'));

      await expect(service.deleteImage('avatars/abc123')).resolves.toBeUndefined();
    });
  });
});

describe('extractPublicIdFromUrl', () => {
  it('debe extraer el publicId de una URL de Cloudinary con versión', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1234567890/avatars/abc123.jpg';
    expect(extractPublicIdFromUrl(url)).toBe('avatars/abc123');
  });

  it('debe devolver null si la URL no tiene el formato esperado', () => {
    expect(extractPublicIdFromUrl('https://example.com/no-cloudinary.jpg')).toBeNull();
  });
});
