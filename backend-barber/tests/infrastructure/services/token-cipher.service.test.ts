// Debe fijarse ANTES de importar el servicio: env.ts cachea la config en el primer
// getConfig(), igual que en gemini.service.test.ts.
process.env.TELEGRAM_TOKEN_ENC_KEY = 'a'.repeat(64);

import { TokenCipherService } from '../../../src/infrastructure/services/TokenCipherService';

describe('TokenCipherService', () => {
  const cipher = new TokenCipherService();

  it('descifra exactamente lo que cifró (round-trip)', () => {
    const plain = 'eyJhbGciOiJIUzI1NiJ9.refresh-token-de-prueba.firma';
    const cipherText = cipher.encrypt(plain);

    expect(cipher.decrypt(cipherText)).toBe(plain);
  });

  it('produce un ciphertext distinto cada vez para el mismo texto plano (IV aleatorio)', () => {
    const plain = 'mismo-refresh-token';

    const a = cipher.encrypt(plain);
    const b = cipher.encrypt(plain);

    expect(a).not.toBe(b);
    expect(cipher.decrypt(a)).toBe(plain);
    expect(cipher.decrypt(b)).toBe(plain);
  });

  it('el ciphertext nunca contiene el texto plano en claro', () => {
    const plain = 'refresh-token-secreto-reconocible';

    expect(cipher.encrypt(plain)).not.toContain(plain);
  });

  it('rechaza un ciphertext manipulado (auth tag de GCM)', () => {
    const cipherText = cipher.encrypt('token-original');
    const bytes = Buffer.from(cipherText, 'base64');
    bytes[bytes.length - 1] ^= 0xff; // corrompe el último byte del texto cifrado
    const tampered = bytes.toString('base64');

    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('rechaza un ciphertext arbitrario que no vino de encrypt()', () => {
    expect(() => cipher.decrypt(Buffer.from('no-es-un-ciphertext-valido').toString('base64'))).toThrow();
  });

  it('falla explícitamente si falta TELEGRAM_TOKEN_ENC_KEY', () => {
    // Mockea getConfig directamente en vez de tocar process.env: env.ts vuelve a
    // llamar dotenv.config() en cada loadConfig(), que repuebla cualquier variable
    // borrada si sigue presente en el .env local — hace que borrar la env var no
    // sea confiable para este caso. Mockear el módulo aísla la guarda propia de
    // TokenCipherService de la de env.ts.
    jest.resetModules();
    jest.doMock('../../../src/infrastructure/config/env', () => ({
      getConfig: () => ({ telegram: { tokenEncKey: undefined } }),
    }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TokenCipherService: FreshService } = require('../../../src/infrastructure/services/TokenCipherService');
      expect(() => new FreshService().encrypt('x')).toThrow(/TELEGRAM_TOKEN_ENC_KEY/);
    } finally {
      jest.dontMock('../../../src/infrastructure/config/env');
      jest.resetModules();
    }
  });
});
