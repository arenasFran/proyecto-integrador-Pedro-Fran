import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      username: string;
      _id: string;
    };
    validated?: Record<string, unknown>;
  }
}