import { resolvePreset } from '../../../src/interface-adapters/controllers/analytics/AnalyticsController';

type RestoreFn = () => void;

function mockDateNow(isoString: string): RestoreFn {
  const OriginalDate = global.Date;
  const fixed = new OriginalDate(isoString);

  class MockDate extends OriginalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(fixed.getTime());
      } else {
        super(...(args as ConstructorParameters<typeof OriginalDate>));
      }
    }
  }

  global.Date = MockDate as unknown as typeof Date;
  return () => { global.Date = OriginalDate; };
}

describe('resolvePreset', () => {
  describe('hoy', () => {
    it('devuelve el día actual como desde y hasta', () => {
      const restore = mockDateNow('2025-06-15T10:30:00.000Z');
      const result = resolvePreset('hoy');
      expect(result).toEqual({ desde: '2025-06-15', hasta: '2025-06-15T23:59:59.999Z' });
      restore();
    });
  });

  describe('ayer', () => {
    it('devuelve el día anterior', () => {
      const restore = mockDateNow('2025-06-15T10:30:00.000Z');
      const result = resolvePreset('ayer');
      expect(result).toEqual({ desde: '2025-06-14', hasta: '2025-06-14T23:59:59.999Z' });
      restore();
    });

    it('cruza el límite de mes correctamente', () => {
      const restore = mockDateNow('2025-03-01T10:30:00.000Z');
      const result = resolvePreset('ayer');
      expect(result).toEqual({ desde: '2025-02-28', hasta: '2025-02-28T23:59:59.999Z' });
      restore();
    });
  });

  describe('semana', () => {
    it('lunes -> semana del lunes al domingo', () => {
      const restore = mockDateNow('2025-06-16T10:30:00.000Z');
      const result = resolvePreset('semana');
      expect(result).toEqual({ desde: '2025-06-16', hasta: '2025-06-22T23:59:59.999Z' });
      restore();
    });

    it('domingo -> semana del lunes anterior al domingo actual', () => {
      const restore = mockDateNow('2025-06-15T10:30:00.000Z');
      const result = resolvePreset('semana');
      expect(result).toEqual({ desde: '2025-06-09', hasta: '2025-06-15T23:59:59.999Z' });
      restore();
    });

    it('miércoles -> semana del lunes al domingo', () => {
      const restore = mockDateNow('2025-06-18T10:30:00.000Z');
      const result = resolvePreset('semana');
      expect(result).toEqual({ desde: '2025-06-16', hasta: '2025-06-22T23:59:59.999Z' });
      restore();
    });
  });

  describe('mes', () => {
    it('devuelve el mes actual completo', () => {
      const restore = mockDateNow('2025-06-15T10:30:00.000Z');
      const result = resolvePreset('mes');
      expect(result).toEqual({ desde: '2025-06-01', hasta: '2025-06-30T23:59:59.999Z' });
      restore();
    });

    it('febrero no bisiesto', () => {
      const restore = mockDateNow('2025-02-15T10:30:00.000Z');
      const result = resolvePreset('mes');
      expect(result).toEqual({ desde: '2025-02-01', hasta: '2025-02-28T23:59:59.999Z' });
      restore();
    });

    it('febrero bisiesto', () => {
      const restore = mockDateNow('2024-02-15T10:30:00.000Z');
      const result = resolvePreset('mes');
      expect(result).toEqual({ desde: '2024-02-01', hasta: '2024-02-29T23:59:59.999Z' });
      restore();
    });
  });

  describe('year', () => {
    it('devuelve el año actual completo', () => {
      const restore = mockDateNow('2025-06-15T10:30:00.000Z');
      const result = resolvePreset('year');
      expect(result).toEqual({ desde: '2025-01-01', hasta: '2025-12-31T23:59:59.999Z' });
      restore();
    });
  });

  describe('default', () => {
    it('devuelve strings vacíos para preset desconocido', () => {
      const restore = mockDateNow('2025-06-15T10:30:00.000Z');
      const result = resolvePreset('invalido');
      expect(result).toEqual({ desde: '', hasta: '' });
      restore();
    });
  });
});
