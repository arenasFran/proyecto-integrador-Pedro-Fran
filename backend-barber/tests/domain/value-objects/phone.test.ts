import { Phone } from '../../../src/domain/value-objects/Phone';

describe('Phone', () => {
  describe('normalize', () => {
    it('debe limpiar espacios, guiones y parentesis', () => {
      expect(Phone.normalize(' 099 123-456 ')).toBe('+59899123456');
    });

    it('debe reemplazar 00 por +', () => {
      expect(Phone.normalize('0059899123456')).toBe('+59899123456');
    });

    it('debe agregar +598 si empieza con 0', () => {
      expect(Phone.normalize('099123456')).toBe('+59899123456');
    });

    it('debe dejar intacto si ya tiene +', () => {
      expect(Phone.normalize('+59899123456')).toBe('+59899123456');
    });

    it('debe manejar numero local sin 0 inicial', () => {
      expect(Phone.normalize('99123456')).toBe('99123456');
    });

    it('debe limpiar parentesis', () => {
      expect(Phone.normalize('(+598) 99 123-456')).toBe('+59899123456');
    });
  });

  describe('create', () => {
    it('debe normalizar y crear phone valido', () => {
      const phone = Phone.create(' 099 123-456 ');
      expect(phone.getValue()).toBe('+59899123456');
    });

    it('debe fallar si esta vacio', () => {
      expect(() => Phone.create(' ')).toThrow('Teléfono inválido');
    });

    it('debe fallar si el formato es invalido', () => {
      expect(() => Phone.create('abc')).toThrow('Teléfono inválido');
    });

    it('debe fallar si es muy corto', () => {
      expect(() => Phone.create('123')).toThrow('Teléfono inválido');
    });
  });
});
