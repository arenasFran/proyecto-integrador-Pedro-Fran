import { NextFunction, Request, Response } from 'express';
import { ITokenService } from '../../application/ports/ITokenService';
import { AuthKind } from '../../domain/types/auth';

export const createAuthenticate = (tokenService: ITokenService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    try {
      const payload = tokenService.verify(token);
      req.user = {
        email: payload.email,
        _id: payload.id,
        kind: payload.kind,
      };
      return next();
    } catch {
      return res.status(403).json({ error: 'Token inválido' });
    }
  };
};

export const authorize = (...kinds: AuthKind[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    if (!kinds.includes(req.user.kind)) {
      return res.status(403).json({ error: 'No tenés permisos para acceder a este recurso' });
    }
    next();
  };
};

export const authorizeSelfOrKinds = (paramKey: string, ...kinds: AuthKind[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (kinds.includes(req.user.kind)) {
      return next();
    }

    if (req.user._id === req.params[paramKey]) {
      return next();
    }

    return res.status(403).json({ error: 'No tenés permisos para acceder a este recurso' });
  };
};

export const createOptionalAuth = (tokenService: ITokenService) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }
    const token = header.split(' ')[1];
    try {
      const decoded = tokenService.verify(token);
      req.user = {
        email: decoded.email,
        _id: decoded.id,
        kind: decoded.kind,
      };
    } catch {
      // token inválido -> sigue sin usuario
    }
    next();
  };
};
