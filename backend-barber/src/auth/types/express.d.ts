import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      username: string;
      _id: string;
      role: 'cliente' | 'empleado' | 'admin'
    };
    validated?: Record<string, unknown>;
  }
}