import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import Joi, { ObjectSchema } from "joi";

type Role = 'cliente' | 'barbero' | 'empleado' | 'admin'

type ValidationSchemas = {
  body?: ObjectSchema;
  params?: ObjectSchema;
  query?: ObjectSchema;
};

type AuthRequest = Request & {
  user?: {
    username: string;
    _id: string;
    role: Role
  };
  validated?: Record<string, unknown>;
};

export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetReq = req as AuthRequest;
      if (schemas.body) {
        const value = await schemas.body.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (req.body && typeof req.body === "object") {
          for (const key of Object.keys(req.body)) delete (req.body as Record<string, unknown>)[key];
          Object.assign(req.body, value);
        } else {
          req.body = value;
        }
      }
      if (schemas.params) {
        const value = await schemas.params.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (req.params && typeof req.params === "object") {
          for (const key of Object.keys(req.params)) delete (req.params as Record<string, unknown>)[key];
          Object.assign(req.params, value);
        } else {
          req.params = value;
        }
      }
      if (schemas.query) {
        const value = await schemas.query.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (req.query && typeof req.query === "object") {
          for (const key of Object.keys(req.query)) delete (req.query as Record<string, unknown>)[key];
          Object.assign(req.query, value);
        } else {
          targetReq.validated = Object.assign({}, targetReq.validated, { query: value });
        }
      }
      next();
      return;
    } catch (err) {
      const message = err instanceof Joi.ValidationError 
        ? err.details?.map(d => d.message) 
        : err instanceof Error 
        ? err.message 
        : "Error de validación";
      res.status(400).json({ error: message });
      return;
    }
  };
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no definido");
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    const user = decoded as JwtPayload;
    authReq.user = { 
      username: user.username, 
      _id: user.id,
      role: user.role
    };
    next();
  });
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: "No autorizado" });
    }
    if (!roles.includes(authReq.user.role)) {
      return res.status(403).json({ error: "No tenés permisos para acceder a este recurso" });
    }
    next();
  }
};