import { AuthKind } from '../../domain/types/auth';

export type TokenPayload = {
  id: string;
  email: string;
  kind: AuthKind;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
  signPartialToken(email: string, googleId?: string): string;
  verifyPartialToken(token: string): { email: string; googleId?: string };
}
