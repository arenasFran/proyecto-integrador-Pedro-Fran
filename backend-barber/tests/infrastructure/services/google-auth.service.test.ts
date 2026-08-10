const verifyIdTokenMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

import { GoogleAuthService } from '../../../src/infrastructure/services/GoogleAuthService';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleAuthService('client-id-123');
  });

  it('debe devolver los datos del usuario a partir de un token válido', async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: 'user@test.com',
        email_verified: true,
        given_name: 'Juan',
        family_name: 'Perez',
        name: 'Juan Perez',
        sub: 'google-sub-1',
      }),
    });

    const result = await service.verifyIdToken('valid-token');

    expect(verifyIdTokenMock).toHaveBeenCalledWith({ idToken: 'valid-token', audience: 'client-id-123' });
    expect(result).toEqual({
      email: 'user@test.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-sub-1',
    });
  });

  it('debe marcar emailVerified como false si el payload no lo trae', async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ email: 'user@test.com', sub: 'sub-1' }),
    });

    const result = await service.verifyIdToken('token');

    expect(result.emailVerified).toBe(false);
  });

  it('debe lanzar error si el payload no tiene email', async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub: 'sub-1' }),
    });

    await expect(service.verifyIdToken('token')).rejects.toThrow('Token de Google inválido');
  });

  it('debe lanzar error si no hay payload', async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => null,
    });

    await expect(service.verifyIdToken('token')).rejects.toThrow('Token de Google inválido');
  });

  it('debe propagar el error si verifyIdToken falla (token inválido/expirado)', async () => {
    verifyIdTokenMock.mockRejectedValue(new Error('Wrong number of segments'));

    await expect(service.verifyIdToken('malformed')).rejects.toThrow('Wrong number of segments');
  });
});
