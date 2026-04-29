import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      email: string;
      _id: string;
      kind: 'Admin' | 'Empleado' | 'Registrado' | 'NoRegistrado';
    };
    validated?: Record<string, unknown>;
  }
}
