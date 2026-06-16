import { AuthKind } from '../../domain/types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        _id: string;
        kind: AuthKind;
      };
      validated?: Record<string, unknown>;
    }
  }
}
