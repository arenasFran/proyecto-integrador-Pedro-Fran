import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('debe formatear una fecha simple YYYY-MM-DD', () => {
    expect(formatDate('2026-07-10')).toBe('10/07/2026');
  });

  it('debe formatear un timestamp ISO completo tomando solo la parte de fecha', () => {
    expect(formatDate('2026-07-10T22:50:18.000Z')).toBe('10/07/2026');
  });

  it('debe devolver string vacío si es null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('debe devolver el string original si no tiene el formato esperado', () => {
    expect(formatDate('no-es-una-fecha')).toBe('no-es-una-fecha');
  });
});
