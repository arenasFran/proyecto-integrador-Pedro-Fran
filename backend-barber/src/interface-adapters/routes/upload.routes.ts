import express from 'express';
import rateLimit from 'express-rate-limit';
import { UploadController } from '../controllers/upload/UploadController';
import { authorize } from '../middlewares/auth.middleware';
import { uploadAvatar, uploadProductImages, handleUploadErrors, assertImageContent } from '../middlewares/upload.middleware';
import { getConfig } from '../../infrastructure/config/env';

const config = getConfig();

const uploadAvatarLimiter = rateLimit({
  windowMs: config.rateLimit.upload.windowMs,
  max: config.rateLimit.upload.max,
  message: { error: 'Demasiadas subidas de imágenes, esperá un momento' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadImagesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas subidas de imágenes, esperá 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createUploadRouter = (deps: {
  authenticate: express.RequestHandler;
  uploadController: UploadController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.use(deps.authenticate);

  router.post(
    '/',
    uploadAvatarLimiter,
    handleUploadErrors(uploadAvatar),
    assertImageContent,
    deps.uploadController.uploadAvatar
  );
  router.post(
    '/product-images',
    authorize('Admin', 'Empleado'),
    uploadImagesLimiter,
    handleUploadErrors(uploadProductImages),
    assertImageContent,
    deps.uploadController.uploadProductImages
  );

  return router;
};