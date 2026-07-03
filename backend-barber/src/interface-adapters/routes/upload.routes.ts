import express from 'express';
import { UploadController } from '../controllers/upload/UploadController';
import { uploadAvatar } from '../middlewares/upload.middleware';

export const createUploadRouter = (deps: {
  authenticate: express.RequestHandler;
  uploadController: UploadController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.use(deps.authenticate);

  router.post('/', uploadAvatar, deps.uploadController.uploadAvatar);

  return router;
};
