import multer from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../../domain/errors/AppError';
import { sendError } from '../../common/response';

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WebP.'));
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('images', 5);

// Límite de 5MB: es el máximo que acepta Rekognition DetectFaces con bytes inline.
export const uploadAnalisisFoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('foto');

// Traduce errores de multer (tamaño excedido, mimetype inválido) a respuestas
// JSON claras en vez de dejar que caigan al handler global de errores como 500 genérico.
export const handleUploadErrors = (upload: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, new AppError('La imagen no puede superar los 5MB.', 400, 'FILE_TOO_LARGE'), 'Archivo demasiado grande');
    }
    if (err instanceof Error && err.message.includes('Solo se permiten imágenes')) {
      return sendError(res, new AppError(err.message, 400, 'INVALID_FILE'), 'Formato de archivo inválido');
    }

    return next(err);
  });
};
