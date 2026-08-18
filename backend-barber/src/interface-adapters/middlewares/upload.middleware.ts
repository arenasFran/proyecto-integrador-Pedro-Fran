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

const isJpeg = (buf: Buffer): boolean =>
  buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

const isPng = (buf: Buffer): boolean =>
  buf.length > 7 &&
  buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
  buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;

const isWebp = (buf: Buffer): boolean =>
  buf.length > 11 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';

const detectImageType = (buf: Buffer): string | null => {
  if (isJpeg(buf)) return 'image/jpeg';
  if (isPng(buf)) return 'image/png';
  if (isWebp(buf)) return 'image/webp';
  return null;
};

// Verifica los "magic bytes" del archivo contra el mimetype declarado, porque el
// mimetype lo controla el cliente y puede ser falseado.
export const assertImageContent: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const files = req.file
    ? [req.file]
    : (req.files as Express.Multer.File[] | undefined) ?? [];

  for (const file of files) {
    const detected = detectImageType(file.buffer);
    if (!detected || detected !== file.mimetype) {
      return sendError(
        res,
        new AppError('El contenido del archivo no coincide con el formato de imagen declarado.', 400, 'INVALID_FILE'),
        'Formato de archivo inválido'
      );
    }
  }

  next();
};
