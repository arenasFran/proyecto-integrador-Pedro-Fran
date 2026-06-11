import 'express-serve-static-core';
import { AuthKind } from '../../domain/types/auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      email: string;
      _id: string;
      kind: AuthKind;
    };
    validated?: Record<string, unknown>;
  }
}
