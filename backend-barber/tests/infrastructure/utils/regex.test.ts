import { escapeRegex } from '../../../src/infrastructure/utils/regex';

describe('escapeRegex', () => {
  it('escapa caracteres especiales de regex', () => {
    expect(escapeRegex('corte (de pelo)')).toBe('corte \\(de pelo\\)');
    expect(escapeRegex('producto$')).toBe('producto\\$');
    expect(escapeRegex('a+b')).toBe('a\\+b');
    expect(escapeRegex('foo.*bar')).toBe('foo\\.\\*bar');
    expect(escapeRegex('test[0-9]')).toBe('test\\[0-9\\]');
    expect(escapeRegex('foo|bar')).toBe('foo\\|bar');
    expect(escapeRegex('a{2,}')).toBe('a\\{2,\\}');
  });

  it('trata el input como texto literal — no causa backtracking exponencial', () => {
    const malicious = '(a+)+$';
    const escaped = escapeRegex(malicious);
    expect(escaped).toBe('\\(a\\+\\)\\+\\$');
  });

  it('no modifica strings sin caracteres especiales', () => {
    expect(escapeRegex('corte de pelo')).toBe('corte de pelo');
    expect(escapeRegex('12345')).toBe('12345');
    expect(escapeRegex('')).toBe('');
  });
});
