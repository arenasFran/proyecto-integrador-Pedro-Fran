export type TokenPayload = {
  id: string;
  email: string;
  kind: string;
};

export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
