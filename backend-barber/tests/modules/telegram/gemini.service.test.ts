// Debe fijarse ANTES de importar el servicio: env.ts cachea la config en el primer
// getConfig(), y sin API key `callGemini` corta corto sin llegar a tocar fetch.
process.env.GEMINI_API_KEY = 'test-gemini-key';

import {
  extractBookingIntent,
  classifyGeneralIntent,
  matchService,
  matchBarber,
} from '../../../src/telegram/services/gemini.service';
import type { ServiceDTO, BarberDTO } from '../../../src/telegram/services/backendClient';

function mockGeminiRawText(text: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  }) as unknown as typeof fetch;
}

describe('gemini.service — matchService / matchBarber', () => {
  const services: ServiceDTO[] = [
    { id: 'svc-1', name: 'Corte Clásico', price: 400 },
    { id: 'svc-2', name: 'Corte y Barba', price: 600 },
  ];
  const barbers: BarberDTO[] = [
    { id: 'brb-1', name: 'Santiago', lastname: 'Pérez' },
    { id: 'brb-2', name: 'Lucía', lastname: 'Gómez' },
  ];

  it('matchService encuentra por nombre exacto ignorando acentos y mayusculas', () => {
    expect(matchService('corte clasico', services)?.id).toBe('svc-1');
  });

  it('matchService encuentra por coincidencia parcial', () => {
    expect(matchService('barba', services)?.id).toBe('svc-2');
  });

  it('matchService devuelve undefined si no hay ningun servicio parecido', () => {
    expect(matchService('manicura', services)).toBeUndefined();
    expect(matchService(null, services)).toBeUndefined();
  });

  it('matchBarber encuentra por nombre completo ignorando acentos', () => {
    expect(matchBarber('santiago perez', barbers)?.id).toBe('brb-1');
  });

  it('matchBarber encuentra solo con el nombre o apellido', () => {
    expect(matchBarber('Lucía', barbers)?.id).toBe('brb-2');
    expect(matchBarber('Gomez', barbers)?.id).toBe('brb-2');
  });
});

describe('gemini.service — validacion de la respuesta del modelo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extractBookingIntent devuelve null si Gemini responde JSON invalido', async () => {
    mockGeminiRawText('esto no es json{');

    const result = await extractBookingIntent(
      'quiero un corte',
      { services: [], barbers: [], todayISO: '2026-07-29' },
      101
    );

    expect(result).toBeNull();
  });

  it('extractBookingIntent devuelve null si el JSON no cumple el shape esperado', async () => {
    mockGeminiRawText(JSON.stringify({ intent: 'crear_turno' }));

    const result = await extractBookingIntent(
      'quiero un corte',
      { services: [], barbers: [], todayISO: '2026-07-29' },
      102
    );

    expect(result).toBeNull();
  });

  it('extractBookingIntent pasa el resultado si el JSON cumple el shape', async () => {
    const valid = {
      intent: 'crear_turno',
      servicio: 'Corte Clásico',
      barbero: null,
      fecha: null,
      hora: null,
      campos_faltantes: ['barbero', 'fecha', 'hora'],
      confianza_baja: false,
    };
    mockGeminiRawText(JSON.stringify(valid));

    const result = await extractBookingIntent(
      'quiero un corte clasico',
      { services: [], barbers: [], todayISO: '2026-07-29' },
      103
    );

    expect(result).toEqual(valid);
  });

  it('classifyGeneralIntent devuelve null si el intent no esta en el enum permitido', async () => {
    mockGeminiRawText(JSON.stringify({ intent: 'algo_inventado', confianza_baja: false }));

    const result = await classifyGeneralIntent('mensaje ambiguo', 104);

    expect(result).toBeNull();
  });
});

describe('gemini.service — límite de mensajes libres por telegramId', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('permite hasta 8 mensajes en la ventana y bloquea el 9no sin llamar a fetch', async () => {
    const valid = { intent: 'productos', confianza_baja: false };
    mockGeminiRawText(JSON.stringify(valid));
    const telegramId = 201;

    for (let i = 0; i < 8; i++) {
      const result = await classifyGeneralIntent('mensaje libre', telegramId);
      expect(result).toEqual(valid);
    }
    expect(global.fetch).toHaveBeenCalledTimes(8);

    const blocked = await classifyGeneralIntent('mensaje libre de más', telegramId);
    expect(blocked).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(8);
  });

  it('no comparte el límite entre distintos telegramId', async () => {
    const valid = { intent: 'productos', confianza_baja: false };
    mockGeminiRawText(JSON.stringify(valid));

    for (let i = 0; i < 8; i++) {
      await classifyGeneralIntent('mensaje libre', 202);
    }
    expect(await classifyGeneralIntent('mensaje libre', 202)).toBeNull();

    const otroUsuario = await classifyGeneralIntent('mensaje libre', 203);
    expect(otroUsuario).toEqual(valid);
  });

  it('sin telegramId (edge case defensivo) nunca bloquea', async () => {
    const valid = { intent: 'productos', confianza_baja: false };
    mockGeminiRawText(JSON.stringify(valid));

    for (let i = 0; i < 20; i++) {
      const result = await classifyGeneralIntent('mensaje libre', undefined);
      expect(result).toEqual(valid);
    }
  });
});
