import {
  createAuthenticate,
  authorize,
  authorizeSelfOrKinds,
  createOptionalAuth,
} from '../../../src/interface-adapters/middlewares/auth.middleware';
import { ITokenService } from '../../../src/application/ports/ITokenService';

describe('createAuthenticate', () => {
  let tokenService: jest.Mocked<ITokenService>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    tokenService = {
      verify: jest.fn(),
      sign: jest.fn(),
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      signPartialToken: jest.fn(),
      verifyPartialToken: jest.fn(),
    };
    req = { headers: {}, user: undefined };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('debe devolver 401 si falta el header authorization', () => {
    createAuthenticate(tokenService)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe devolver 401 si el scheme no es Bearer', () => {
    req.headers['authorization'] = 'Basic token123';
    createAuthenticate(tokenService)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe devolver 401 si solo se envia Bearer sin token', () => {
    req.headers['authorization'] = 'Bearer ';
    createAuthenticate(tokenService)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe devolver 403 si el token es invalido', () => {
    req.headers['authorization'] = 'Bearer token-invalido';
    tokenService.verify.mockImplementation(() => { throw new Error('Invalid token'); });
    createAuthenticate(tokenService)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe llamar a next y asignar req.user si el token es valido', () => {
    req.headers['authorization'] = 'Bearer token-valido';
    tokenService.verify.mockReturnValue({ id: 'user-1', email: 'user@test.com', kind: 'Registrado' });
    createAuthenticate(tokenService)(req, res, next);
    expect(tokenService.verify).toHaveBeenCalledWith('token-valido');
    expect(req.user).toEqual({ _id: 'user-1', email: 'user@test.com', kind: 'Registrado' });
    expect(next).toHaveBeenCalled();
  });
});

describe('authorize', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = { user: undefined };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('debe devolver 401 si no hay req.user', () => {
    authorize('Admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe devolver 403 si el kind no esta incluido', () => {
    req.user = { _id: 'user-1', email: 'user@test.com', kind: 'Registrado' };
    authorize('Admin', 'Empleado')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tenés permisos para acceder a este recurso' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe llamar a next si el kind esta incluido', () => {
    req.user = { _id: 'user-1', email: 'admin@test.com', kind: 'Admin' };
    authorize('Admin', 'Empleado')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('debe llamar a next si el kind coincide con uno de varios', () => {
    req.user = { _id: 'user-2', email: 'emp@test.com', kind: 'Empleado' };
    authorize('Admin', 'Empleado', 'Registrado')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('authorizeSelfOrKinds', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = { user: undefined, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('debe devolver 401 si no hay req.user', () => {
    authorizeSelfOrKinds('id', 'Admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe devolver 403 si no es el mismo usuario ni el kind permitido', () => {
    req.user = { _id: 'user-1', email: 'user@test.com', kind: 'Registrado' };
    req.params = { id: 'user-2' };
    authorizeSelfOrKinds('id', 'Admin', 'Empleado')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tenés permisos para acceder a este recurso' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe llamar a next si el kind esta incluido', () => {
    req.user = { _id: 'admin-1', email: 'admin@test.com', kind: 'Admin' };
    req.params = { id: 'user-2' };
    authorizeSelfOrKinds('id', 'Admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('debe llamar a next si el _id coincide con req.params', () => {
    req.user = { _id: 'user-1', email: 'user@test.com', kind: 'Registrado' };
    req.params = { id: 'user-1' };
    authorizeSelfOrKinds('id', 'Admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('debe usar el paramKey correcto para buscar en params', () => {
    req.user = { _id: 'user-1', email: 'user@test.com', kind: 'Registrado' };
    req.params = { barberId: 'user-1' };
    authorizeSelfOrKinds('barberId', 'Admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createOptionalAuth', () => {
  let tokenService: jest.Mocked<ITokenService>;
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    tokenService = {
      verify: jest.fn(),
      sign: jest.fn(),
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      signPartialToken: jest.fn(),
      verifyPartialToken: jest.fn(),
    };
    req = { headers: {}, user: undefined };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('debe llamar a next si no hay header authorization', () => {
    createOptionalAuth(tokenService)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('debe llamar a next si el header no empieza con Bearer', () => {
    req.headers.authorization = 'Basic token123';
    createOptionalAuth(tokenService)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('debe asignar req.user si el token es valido', () => {
    req.headers.authorization = 'Bearer token-valido';
    tokenService.verify.mockReturnValue({ id: 'user-1', email: 'user@test.com', kind: 'Registrado' });
    createOptionalAuth(tokenService)(req, res, next);
    expect(req.user).toEqual({ _id: 'user-1', email: 'user@test.com', kind: 'Registrado' });
    expect(next).toHaveBeenCalled();
  });

  it('debe llamar a next sin asignar req.user si el token es invalido', () => {
    req.headers.authorization = 'Bearer token-invalido';
    tokenService.verify.mockImplementation(() => { throw new Error('Invalid'); });
    createOptionalAuth(tokenService)(req, res, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
