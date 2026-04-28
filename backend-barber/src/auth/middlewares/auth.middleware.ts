import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthKind } from "../types/user";
import Joi, { ObjectSchema } from "joi";

type Kind = AuthKind;

type ValidationSchemas = {
  body?: ObjectSchema;
  params?: ObjectSchema;
  query?: ObjectSchema;
};

type AuthRequest = Omit<Request, 'user'> & {
  user?: {
    email: string;
    _id: string;
    kind: Kind
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
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer") {
    return res.status(401).json({ error: "No autorizado" });
  }
  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    return next(new Error('JWT_SECRET no definido'));
  }
  jwt.verify(token, secret,{algorithms:['HS256']},(err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    if (!decoded || typeof decoded === "string") {
      return res.status(403).json({ error: "Token inválido" });
    }
    const user = decoded as JwtPayload;
    if (!user.email || !user.id || !user.kind) {
      return res.status(403).json({ error: "Token inválido" });
    }
    authReq.user = { 
      email: user.email,
      _id: user.id,
      kind: user.kind
    };
    next();
  });
};

export const authorize = (...kinds: Kind[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: "No autorizado" });
    }
    if (!kinds.includes(authReq.user.kind)) {
      return res.status(403).json({ error: "No tenés permisos para acceder a este recurso" });
    }
    next();
  }
};