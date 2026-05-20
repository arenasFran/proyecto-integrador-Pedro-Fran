export type GoogleUser = {
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
  sub: string;
};

export interface IGoogleAuthService {
  verifyIdToken(token: string): Promise<GoogleUser>;
}
