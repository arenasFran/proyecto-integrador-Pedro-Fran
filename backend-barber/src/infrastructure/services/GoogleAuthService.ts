import { OAuth2Client } from 'google-auth-library';
import { GoogleUser, IGoogleAuthService } from '../../application/ports/IGoogleAuthService';

export class GoogleAuthService implements IGoogleAuthService {
  private readonly client: OAuth2Client;

  constructor(clientId?: string) {
    this.client = new OAuth2Client(clientId || process.env.GOOGLE_CLIENT_ID);
  }

  async verifyIdToken(token: string): Promise<GoogleUser> {
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Token de Google inválido');
    }

    return {
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      givenName: payload.given_name,
      familyName: payload.family_name,
      name: payload.name,
      sub: payload.sub as string,
    };
  }
}
