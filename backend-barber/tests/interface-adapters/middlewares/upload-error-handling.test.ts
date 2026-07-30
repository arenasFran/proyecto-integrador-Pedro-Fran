import express from 'express';
import request from 'supertest';
import { uploadAnalisisFoto, handleUploadErrors } from '../../../src/interface-adapters/middlewares/upload.middleware';

const buildTestApp = () => {
  const app = express();
  app.post('/foto', handleUploadErrors(uploadAnalisisFoto), (req, res) => {
    res.status(200).json({ ok: true, mimetype: req.file?.mimetype });
  });
  return app;
};

describe('handleUploadErrors', () => {
  it('devuelve 400 FILE_TOO_LARGE cuando el archivo supera el límite de multer', async () => {
    const app = buildTestApp();
    const archivoGrande = Buffer.alloc(6 * 1024 * 1024, 1);

    const res = await request(app)
      .post('/foto')
      .attach('foto', archivoGrande, { filename: 'grande.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('devuelve 400 INVALID_FILE cuando el mimetype no está permitido', async () => {
    const app = buildTestApp();

    const res = await request(app)
      .post('/foto')
      .attach('foto', Buffer.from('no soy una imagen'), { filename: 'archivo.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'INVALID_FILE' });
  });

  it('deja pasar un archivo válido al siguiente handler', async () => {
    const app = buildTestApp();

    const res = await request(app)
      .post('/foto')
      .attach('foto', Buffer.from('fake-photo-bytes'), { filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, mimetype: 'image/jpeg' });
  });
});
