import Joi from 'joi';
import { validate } from '../../../src/interface-adapters/middlewares/validation.middleware';

describe('validate', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('body validation', () => {
    const bodySchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0),
    });

    it('debe aceptar un body valido y mutarlo con stripUnknown', async () => {
      req.body = { name: 'Juan', age: 25, extraField: 'debe ser eliminado' };
      await validate({ body: bodySchema })(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'Juan', age: 25 });
      expect(req.body).not.toHaveProperty('extraField');
    });

    it('debe devolver 400 si el body es invalido', async () => {
      req.body = { age: 25 };
      await validate({ body: bodySchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
      expect(next).not.toHaveBeenCalled();
    });

    it('debe devolver todos los errores de validacion', async () => {
      req.body = { name: '', age: -1 };
      await validate({ body: bodySchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      const errorMsg = (res.json as jest.Mock).mock.calls[0][0].error;
      expect(errorMsg).toContain('name');
      expect(errorMsg).toContain('age');
      expect(next).not.toHaveBeenCalled();
    });

    it('debe manejar req.body que no es objeto', async () => {
      req.body = 'string-body';
      await validate({ body: bodySchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe conservar req.body cuando no hay schema body', async () => {
      req.body = { name: 'Juan' };
      await validate({})(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'Juan' });
    });
  });

  describe('params validation', () => {
    const paramsSchema = Joi.object({
      id: Joi.string().required(),
    });

    it('debe aceptar params validos y mutarlos', async () => {
      req.params = { id: 'abc-123', extra: 'debe ser eliminado' };
      await validate({ params: paramsSchema })(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.params).toEqual({ id: 'abc-123' });
    });

    it('debe devolver 400 si params son invalidos', async () => {
      req.params = {};
      await validate({ params: paramsSchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('query validation', () => {
    const querySchema = Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    });

    it('debe aceptar query validos y mutarlos', async () => {
      req.query = { date: '2026-06-15', extra: 'eliminado' };
      await validate({ query: querySchema })(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({ date: '2026-06-15' });
    });

    it('debe devolver 400 si query son invalidos', async () => {
      req.query = { date: '15-06-2026' };
      await validate({ query: querySchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validacion combinada (body + params + query)', () => {
    const bodySchema = Joi.object({ name: Joi.string().required() });
    const paramsSchema = Joi.object({ id: Joi.string().required() });
    const querySchema = Joi.object({ page: Joi.number().integer().min(1) });

    it('debe validar todos los schemas si estan presentes', async () => {
      req.body = { name: 'Juan' };
      req.params = { id: 'abc' };
      req.query = { page: '1' };
      await validate({ body: bodySchema, params: paramsSchema, query: querySchema })(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'Juan' });
      expect(req.params).toEqual({ id: 'abc' });
      expect(req.query).toEqual({ page: 1 });
    });

    it('debe devolver error si algun schema falla', async () => {
      req.body = { name: 'Juan' };
      req.params = {};
      req.query = { page: '1' };
      await validate({ body: bodySchema, params: paramsSchema, query: querySchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('manejo de errores no-Joi', () => {
    it('debe devolver mensaje de error generico si el error no es de Joi ni Error', async () => {
      const throwingSchema = {
        validateAsync: jest.fn().mockRejectedValue('error-string'),
      } as any;
      req.body = { name: 'Juan' };
      await validate({ body: throwingSchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error de validación' });
    });

    it('debe devolver error.message si es una instancia de Error pero no Joi', async () => {
      const throwingSchema = {
        validateAsync: jest.fn().mockRejectedValue(new Error('Error inesperado')),
      } as any;
      req.body = { name: 'Juan' };
      await validate({ body: throwingSchema })(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error inesperado' });
    });
  });

  describe('no schemas provided', () => {
    it('debe llamar a next directamente si no se pasan schemas', async () => {
      await validate({})(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
