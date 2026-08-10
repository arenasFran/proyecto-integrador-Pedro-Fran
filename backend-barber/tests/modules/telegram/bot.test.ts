jest.mock('../../../src/telegram/services/backendClient');
jest.mock('../../../src/telegram/services/gemini.service');
jest.mock('../../../src/telegram/services/accountLink.service');
jest.mock('../../../src/telegram/handlers/commonCommands');

// buildTokenService (importado transitivamente por accountLink.service, cargado por
// booking.wizard.ts) necesita un config real y completo al cargar el módulo, así que en
// vez de reemplazar getConfig por un mock vacío, se envuelve la implementación real y
// solo se pisan los campos puntuales que cada test necesita (botToken, gemini.enabled).
jest.mock('../../../src/infrastructure/config/env', () => {
  const actual = jest.requireActual('../../../src/infrastructure/config/env');
  return { ...actual, getConfig: jest.fn(actual.getConfig) };
});

import { Telegram } from 'telegraf';
import { createBot } from '../../../src/telegram/bot';
import { GUEST_BOOKING_SCENE_ID } from '../../../src/telegram/scenes/booking.wizard';
import * as backendClient from '../../../src/telegram/services/backendClient';
import * as geminiService from '../../../src/telegram/services/gemini.service';
import { getSessionForTelegramId, linkTelegramAccount } from '../../../src/telegram/services/accountLink.service';
import {
  handleProductosCommand,
  handleBarberosCommand,
  handleMisTurnosCommand,
  handleCancelarCommand,
  handleAyudaCommand,
} from '../../../src/telegram/handlers/commonCommands';
import { getConfig } from '../../../src/infrastructure/config/env';

const mockedBackendClient = backendClient as jest.Mocked<typeof backendClient>;
const mockedGemini = geminiService as jest.Mocked<typeof geminiService>;
const mockedGetSession = getSessionForTelegramId as jest.Mock;
const mockedLinkAccount = linkTelegramAccount as jest.Mock;
const mockedGetConfig = getConfig as jest.Mock;
const mockedHandleProductos = handleProductosCommand as jest.Mock;
const mockedHandleBarberos = handleBarberosCommand as jest.Mock;
const mockedHandleMisTurnos = handleMisTurnosCommand as jest.Mock;
const mockedHandleCancelar = handleCancelarCommand as jest.Mock;
const mockedHandleAyuda = handleAyudaCommand as jest.Mock;

const realConfig = jest.requireActual('../../../src/infrastructure/config/env').getConfig();
function setConfig(overrides: Record<string, unknown> = {}) {
  mockedGetConfig.mockReturnValue({ ...realConfig, telegram: { ...realConfig.telegram, botToken: 'test-token' }, gemini: { ...realConfig.gemini, enabled: false }, ...overrides });
}

function makeUpdate(message: Record<string, unknown>) {
  return { update_id: Date.now() + Math.random(), message: { message_id: 1, date: 0, chat: { id: 555, type: 'private' }, from: { id: 555, is_bot: false, first_name: 'Test' }, ...message } };
}

function makeCallbackUpdate(data: string) {
  return {
    update_id: Date.now() + Math.random(),
    callback_query: {
      id: 'cb-1',
      from: { id: 555, is_bot: false, first_name: 'Test' },
      message: { message_id: 1, date: 0, chat: { id: 555, type: 'private' }, text: 'x' },
      chat_instance: 'inst-1',
      data,
    },
  };
}

describe('bot.ts — createBot', () => {
  let callApiMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setConfig();
    mockedBackendClient.getServices.mockResolvedValue({ services: [] });
    mockedBackendClient.getBarbersPublic.mockResolvedValue({ barbers: [] });
    mockedGetSession.mockResolvedValue(null);
    callApiMock = jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async (method: string) => {
      if (method === 'getMe') return { id: 1, is_bot: true, first_name: 'Bot', username: 'test_bot' } as any;
      return true as any;
    }) as unknown as jest.Mock;
  });

  afterEach(() => {
    callApiMock.mockRestore();
  });

  it('lanza un error si no hay TELEGRAM_BOT_TOKEN configurado', () => {
    setConfig({ telegram: { ...realConfig.telegram, botToken: undefined } });
    expect(() => createBot()).toThrow('TELEGRAM_BOT_TOKEN no configurado.');
  });

  describe('/start', () => {
    it('sin payload: saluda y ofrece elegir entre invitado/cuenta', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/start', entities: [{ offset: 0, length: 6, type: 'bot_command' }] }) as any);

      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('¿Tenés cuenta en la web?') });
    });

    it('con payload válido: vincula la cuenta y confirma', async () => {
      mockedLinkAccount.mockResolvedValue({ message: 'ok' });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/start link-token-123', entities: [{ offset: 0, length: 6, type: 'bot_command' }] }) as any);

      expect(mockedLinkAccount).toHaveBeenCalledWith('link-token-123', 555);
      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('quedó vinculada') });
    });

    it('con payload inválido: informa el error de vinculación', async () => {
      mockedLinkAccount.mockRejectedValue(new Error('Token inválido o expirado.'));
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/start bad-token', entities: [{ offset: 0, length: 6, type: 'bot_command' }] }) as any);

      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('Token inválido o expirado.') });
    });
  });

  describe('acciones (botones inline)', () => {
    it('guest_start: responde el callback y entra a la escena de reserva de invitado', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeCallbackUpdate('guest_start') as any);

      expect(callApiMock.mock.calls.some((c) => c[0] === 'answerCallbackQuery')).toBe(true);
      // al entrar a la escena, corre el paso 0 del wizard (sin sesión vinculada -> pide el nombre)
      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('¿Cuál es tu nombre?') });
    });

    it('account_start: responde el callback e informa cómo vincular la cuenta', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeCallbackUpdate('account_start') as any);

      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining("Conectar Telegram") });
    });

    describe('cancel_apt:<id>', () => {
      it('sin sesión vinculada: pide vincular la cuenta', async () => {
        mockedGetSession.mockResolvedValue(null);
        const bot = createBot();
        await bot.handleUpdate(makeCallbackUpdate('cancel_apt:apt-1') as any);

        const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
        expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining("Conectar Telegram") });
      });

      it('con sesión: cancela el turno y confirma', async () => {
        mockedGetSession.mockResolvedValue({ accessToken: 'tok-1' });
        mockedBackendClient.cancelAppointmentAsUser.mockResolvedValue({ message: 'Turno cancelado.' } as any);
        const bot = createBot();
        await bot.handleUpdate(makeCallbackUpdate('cancel_apt:apt-1') as any);

        expect(mockedBackendClient.cancelAppointmentAsUser).toHaveBeenCalledWith('tok-1', 'apt-1');
        const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
        expect(sendMessageCall?.[1]).toMatchObject({ text: 'Turno cancelado.' });
      });

      it('si falla la cancelación: informa el error', async () => {
        mockedGetSession.mockResolvedValue({ accessToken: 'tok-1' });
        mockedBackendClient.cancelAppointmentAsUser.mockRejectedValue(new Error('Turno no encontrado.'));
        const bot = createBot();
        await bot.handleUpdate(makeCallbackUpdate('cancel_apt:apt-1') as any);

        const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
        expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('Turno no encontrado.') });
      });
    });
  });

  describe('comandos', () => {
    it('/reservar entra a la escena de reserva', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/reservar', entities: [{ offset: 0, length: 9, type: 'bot_command' }] }) as any);

      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('¿Cuál es tu nombre?') });
    });

    it('/misturnos delega en el handler compartido', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/misturnos', entities: [{ offset: 0, length: 10, type: 'bot_command' }] }) as any);
      expect(mockedHandleMisTurnos).toHaveBeenCalled();
    });

    it('/cancelar delega en el handler compartido', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/cancelar', entities: [{ offset: 0, length: 9, type: 'bot_command' }] }) as any);
      expect(mockedHandleCancelar).toHaveBeenCalled();
    });

    it('/ayuda delega en el handler compartido', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/ayuda', entities: [{ offset: 0, length: 6, type: 'bot_command' }] }) as any);
      expect(mockedHandleAyuda).toHaveBeenCalled();
    });

    it('/productos delega en el handler compartido', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/productos', entities: [{ offset: 0, length: 10, type: 'bot_command' }] }) as any);
      expect(mockedHandleProductos).toHaveBeenCalled();
    });

    it('/barberos delega en el handler compartido', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/barberos', entities: [{ offset: 0, length: 9, type: 'bot_command' }] }) as any);
      expect(mockedHandleBarberos).toHaveBeenCalled();
    });
  });

  describe('texto libre', () => {
    it('un comando no registrado no dispara ninguna respuesta', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/comando-desconocido', entities: [{ offset: 0, length: 20, type: 'bot_command' }] }) as any);
      expect(callApiMock.mock.calls.find((c) => c[0] === 'sendMessage')).toBeUndefined();
    });

    it('reconoce un saludo suelto sin llamar a Gemini', async () => {
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'hola' }) as any);

      expect(mockedGemini.classifyGeneralIntent).not.toHaveBeenCalled();
      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('¿En qué te ayudo?') });
    });

    it('con gemini deshabilitado, no clasifica el texto libre', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: false } });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'quiero un corte de pelo' }) as any);

      expect(mockedGemini.classifyGeneralIntent).not.toHaveBeenCalled();
    });

    it('con gemini habilitado, clasifica y delega en /productos', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'productos', confianza_baja: false });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'qué productos tienen' }) as any);

      expect(mockedHandleProductos).toHaveBeenCalled();
    });

    it('con gemini habilitado, clasifica y delega en /barberos', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'barberos', confianza_baja: false });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'quienes son los barberos' }) as any);

      expect(mockedHandleBarberos).toHaveBeenCalled();
    });

    it('con gemini habilitado, clasifica y delega en /misturnos', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'misturnos', confianza_baja: false });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'quiero ver mis turnos' }) as any);

      expect(mockedHandleMisTurnos).toHaveBeenCalled();
    });

    it('con gemini habilitado, clasifica y delega en /cancelar', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'cancelar', confianza_baja: false });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'quiero cancelar un turno' }) as any);

      expect(mockedHandleCancelar).toHaveBeenCalled();
    });

    it('con clasificación "reservar": entra a la escena arrastrando el texto original', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'reservar', confianza_baja: false });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'quiero reservar un corte para el lunes' }) as any);

      // al entrar a la escena con pendingFreeText, el paso 0 intenta procesarlo como texto libre
      // (sin sesión vinculada, cae directo a pedir nombre igual que un guest normal)
      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('¿Cuál es tu nombre?') });
    });

    it('con clasificación de baja confianza, no hace nada', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'productos', confianza_baja: true });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'algo ambiguo' }) as any);

      expect(mockedHandleProductos).not.toHaveBeenCalled();
      expect(callApiMock.mock.calls.find((c) => c[0] === 'sendMessage')).toBeUndefined();
    });

    it('con intent "otro", no hace nada', async () => {
      setConfig({ gemini: { ...realConfig.gemini, enabled: true } });
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'otro', confianza_baja: false });
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: 'cualquier cosa' }) as any);

      expect(callApiMock.mock.calls.find((c) => c[0] === 'sendMessage')).toBeUndefined();
    });
  });

  describe('bot.catch — manejo global de errores', () => {
    it('si un handler revienta, responde con el mensaje de error genérico', async () => {
      mockedHandleMisTurnos.mockRejectedValue(new Error('boom'));
      const bot = createBot();
      await bot.handleUpdate(makeUpdate({ text: '/misturnos', entities: [{ offset: 0, length: 10, type: 'bot_command' }] }) as any);

      const sendMessageCall = callApiMock.mock.calls.find((c) => c[0] === 'sendMessage');
      expect(sendMessageCall?.[1]).toMatchObject({ text: expect.stringContaining('algo salió mal') });
    });
  });
});
