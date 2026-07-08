import express from 'express';
import { UploadController } from '../controllers/upload/UploadController';
import { uploadAvatar, uploadProductImages } from '../middlewares/upload.middleware';

export const createUploadRouter = (deps: {
  authenticate: express.RequestHandler;
  uploadController: UploadController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.use(deps.authenticate);

  router.post('/', uploadAvatar, deps.uploadController.uploadAvatar);
  router.post('/product-images', uploadProductImages, deps.uploadController.uploadProductImages);

  return router;
};
