import { isGreeting } from '../../../src/telegram/bot';

describe('bot.ts — isGreeting', () => {
  it.each(['hola', 'Hola', 'HOLA!', 'holaa', 'buenas', 'buenos dias', 'buenas tardes', 'buen dia', 'hey', 'que tal', 'qué tal', 'holis'])(
    'reconoce "%s" como saludo',
    (text) => {
      expect(isGreeting(text)).toBe(true);
    }
  );

  it.each([
    'hola quiero reservar un turno',
    'quiero un corte',
    'hola, cuanto sale el corte de pelo',
    'buenas, tienen productos',
    '',
    'holaquetal',
  ])('no confunde "%s" con un saludo suelto', (text) => {
    expect(isGreeting(text)).toBe(false);
  });
});
