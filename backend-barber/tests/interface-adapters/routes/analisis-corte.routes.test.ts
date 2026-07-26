import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { createAnalisisCorteRouter } from '../../../src/interface-adapters/routes/analisisCorte.routes';
import { makeMockMembershipRepository } from '../../test-utils/mocks';

describe('analisisCorte.routes — orden de middlewares', () => {
  const fakeAuthenticate = (userToInject: { _id: string; kind: string; email: string } | null) =>
    (req: Request, res: Response, next: NextFunction) => {
      if (!userToInject) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      req.user = userToInject as any;
      return next();
    };

  const buildApp = (opts: {
    user: { _id: string; kind: string; email: string } | null;
    hasActiveMembership: boolean;
  }) => {
    const membershipRepository = makeMockMembershipRepository();
    membershipRepository.hasActiveMembership.mockResolvedValue(opts.hasActiveMembership);

    const analisisCorteController = {
      analizar: jest.fn((_req: Request, res: Response) => res.status(201).json({ ok: true })),
      historial: jest.fn((_req: Request, res: Response) => res.status(200).json({ ok: true })),
    };

    const app = express();
    app.use(
      '/api/analisis-corte',
      createAnalisisCorteRouter({
        analisisCorteController: analisisCorteController as any,
        authenticate: fakeAuthenticate(opts.user),
        membershipRepository: membershipRepository as any,
      })
    );

    return { app, analisisCorteController, membershipRepository };
  };

  it('rechaza sin autenticación antes de llegar al controller (401)', async () => {
    const { app, analisisCorteController } = buildApp({ user: null, hasActiveMembership: true });

    const res = await request(app).post('/api/analisis-corte').attach('foto', Buffer.from('x'), 'foto.jpg');

    expect(res.status).toBe(401);
    expect(analisisCorteController.analizar).not.toHaveBeenCalled();
  });

  it('rechaza un usuario que no es Registrado antes de llegar al controller (403)', async () => {
    const { app, analisisCorteController } = buildApp({
      user: { _id: 'u1', kind: 'Admin', email: 'a@a.com' },
      hasActiveMembership: true,
    });

    const res = await request(app).post('/api/analisis-corte').attach('foto', Buffer.from('x'), 'foto.jpg');

    expect(res.status).toBe(403);
    expect(analisisCorteController.analizar).not.toHaveBeenCalled();
  });

  it('rechaza sin membresía activa antes de llegar al controller (403), después de pasar authorize', async () => {
    const { app, analisisCorteController, membershipRepository } = buildApp({
      user: { _id: 'u1', kind: 'Registrado', email: 'a@a.com' },
      hasActiveMembership: false,
    });

    const res = await request(app).post('/api/analisis-corte').attach('foto', Buffer.from('x'), 'foto.jpg');

    expect(res.status).toBe(403);
    expect(membershipRepository.hasActiveMembership).toHaveBeenCalledWith('u1');
    expect(analisisCorteController.analizar).not.toHaveBeenCalled();
  });

  it('llega al controller cuando pasa autenticación, autorización y membresía activa', async () => {
    const { app, analisisCorteController } = buildApp({
      user: { _id: 'u1', kind: 'Registrado', email: 'a@a.com' },
      hasActiveMembership: true,
    });

    const res = await request(app)
      .post('/api/analisis-corte')
      .attach('foto', Buffer.from('fake-photo-bytes'), { filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(analisisCorteController.analizar).toHaveBeenCalled();
  });

  it('GET /historial también respeta authenticate -> authorize -> requireActiveMembership', async () => {
    const { app, analisisCorteController } = buildApp({
      user: { _id: 'u1', kind: 'Registrado', email: 'a@a.com' },
      hasActiveMembership: false,
    });

    const res = await request(app).get('/api/analisis-corte/historial');

    expect(res.status).toBe(403);
    expect(analisisCorteController.historial).not.toHaveBeenCalled();
  });
});
