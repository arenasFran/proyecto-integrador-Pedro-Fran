jest.mock('../../../src/telegram/services/backendClient');
jest.mock('../../../src/telegram/services/gemini.service');
jest.mock('../../../src/telegram/services/accountLink.service');
jest.mock('../../../src/telegram/handlers/commonCommands');

// buildTokenService (importado transitivamente por accountLink.service) necesita un
// config real y completo al cargar el módulo, así que en vez de reemplazar getConfig
// por un mock vacío, se envuelve la implementación real y solo se pisa `gemini.enabled`
// cuando un test lo necesita (setGeminiEnabled más abajo).
jest.mock('../../../src/infrastructure/config/env', () => {
  const actual = jest.requireActual('../../../src/infrastructure/config/env');
  return { ...actual, getConfig: jest.fn(actual.getConfig) };
});

import { Context, Telegram } from 'telegraf';
import { guestBookingWizard } from '../../../src/telegram/scenes/booking.wizard';
import * as backendClient from '../../../src/telegram/services/backendClient';
import * as geminiService from '../../../src/telegram/services/gemini.service';
import { getSessionForTelegramId } from '../../../src/telegram/services/accountLink.service';
import {
  handleProductosCommand,
  handleBarberosCommand,
  handleMisTurnosCommand,
} from '../../../src/telegram/handlers/commonCommands';
import { getConfig } from '../../../src/infrastructure/config/env';

const mockedBackendClient = backendClient as jest.Mocked<typeof backendClient>;
const mockedGemini = geminiService as jest.Mocked<typeof geminiService>;
const mockedGetSession = getSessionForTelegramId as jest.Mock;
const mockedGetConfig = getConfig as jest.Mock;
const realConfig = jest.requireActual('../../../src/infrastructure/config/env').getConfig();
function setGeminiEnabled(enabled: boolean) {
  mockedGetConfig.mockReturnValue({ ...realConfig, gemini: { ...realConfig.gemini, enabled } });
}
const mockedHandleProductos = handleProductosCommand as jest.Mock;
const mockedHandleBarberos = handleBarberosCommand as jest.Mock;
const mockedHandleMisTurnos = handleMisTurnosCommand as jest.Mock;

const steps = guestBookingWizard.steps as unknown as Array<(ctx: any) => any>;

function makeCtx(overrides: Record<string, unknown> = {}): any {
  return {
    reply: jest.fn(),
    answerCbQuery: jest.fn(),
    wizard: { state: { booking: {} }, next: jest.fn(), selectStep: jest.fn() },
    scene: { leave: jest.fn(), enter: jest.fn(), state: {}, session: {} },
    from: { id: 555 },
    ...overrides,
  };
}

const makeService = (overrides: Partial<{ id: string; name: string; price: number }> = {}) => ({
  id: overrides.id ?? 'svc-1',
  name: overrides.name ?? 'Corte de pelo',
  price: overrides.price ?? 500,
});

const makeBarber = (overrides: Partial<{ id: string; name: string; lastname: string }> = {}) => ({
  id: overrides.id ?? 'barber-1',
  name: overrides.name ?? 'Santiago',
  lastname: overrides.lastname ?? 'Pérez',
});

describe('booking.wizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setGeminiEnabled(false);
    mockedBackendClient.getServices.mockResolvedValue({ services: [makeService()] });
    mockedBackendClient.getBarbersPublic.mockResolvedValue({ barbers: [makeBarber()] });
    mockedBackendClient.acquireTempLock.mockResolvedValue({ tempLockId: 'lock-1', ownerToken: 'a'.repeat(64) });
    mockedBackendClient.releaseTempLock.mockResolvedValue(undefined as any);
  });

  describe('step 0 — inicio', () => {
    it('sin ctx.from: pide el nombre directamente', async () => {
      const ctx = makeCtx({ from: undefined });

      await steps[0](ctx);

      expect(mockedGetSession).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Vamos a reservar tu turno. ¿Cuál es tu nombre?');
      expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('sin sesión vinculada: pide el nombre', async () => {
      mockedGetSession.mockResolvedValue(null);
      const ctx = makeCtx();

      await steps[0](ctx);

      expect(mockedGetSession).toHaveBeenCalledWith(555);
      expect(ctx.reply).toHaveBeenCalledWith('Vamos a reservar tu turno. ¿Cuál es tu nombre?');
      expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('con sesión pero perfil incompleto: guarda el accessToken y igual pide el nombre', async () => {
      mockedGetSession.mockResolvedValue({ accessToken: 'tok-1' });
      mockedBackendClient.getMyProfile.mockResolvedValue({
        id: 'u1', name: 'Juan', lastname: '', email: 'j@test.com', phone: '099', kind: 'Registrado', photoUrl: null,
      });
      const ctx = makeCtx();

      await steps[0](ctx);

      expect(ctx.wizard.state.booking.accessToken).toBe('tok-1');
      expect(ctx.reply).toHaveBeenCalledWith('Vamos a reservar tu turno. ¿Cuál es tu nombre?');
    });

    it('con sesión y perfil completo: saluda y pasa al paso 5', async () => {
      mockedGetSession.mockResolvedValue({ accessToken: 'tok-1' });
      mockedBackendClient.getMyProfile.mockResolvedValue({
        id: 'u1', name: 'Juan', lastname: 'Perez', email: 'j@test.com', phone: '099111222', kind: 'Registrado', photoUrl: null,
      });
      const ctx = makeCtx();

      await steps[0](ctx);

      expect(ctx.wizard.state.booking).toMatchObject({
        clientName: 'Juan', clientLastname: 'Perez', clientPhone: '099111222', clientEmail: 'j@test.com',
      });
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('¡Hola Juan!'));
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(5);
    });

    it('con sesión, perfil completo y texto libre pendiente: procesa ese texto en vez de pedir botones', async () => {
      mockedGetSession.mockResolvedValue({ accessToken: 'tok-1' });
      mockedBackendClient.getMyProfile.mockResolvedValue({
        id: 'u1', name: 'Juan', lastname: 'Perez', email: 'j@test.com', phone: '099111222', kind: 'Registrado', photoUrl: null,
      });
      setGeminiEnabled(false);
      const ctx = makeCtx({ wizard: { state: { booking: { pendingFreeText: 'corte con Santiago' } }, next: jest.fn(), selectStep: jest.fn() } });

      await steps[0](ctx);

      // gemini deshabilitado -> processFreeText cae directo a fallbackToButtons
      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
      expect(ctx.wizard.state.booking.pendingFreeText).toBeUndefined();
    });

    it('si falla la consulta de sesión, no rompe el flujo (cae al pedido de nombre)', async () => {
      mockedGetSession.mockRejectedValue(new Error('down'));
      const ctx = makeCtx();

      await steps[0](ctx);

      expect(ctx.reply).toHaveBeenCalledWith('Vamos a reservar tu turno. ¿Cuál es tu nombre?');
      expect(ctx.wizard.next).toHaveBeenCalled();
    });
  });

  describe('step 1 — nombre', () => {
    it('rechaza texto vacío', async () => {
      const ctx = makeCtx({ message: {} });
      await steps[1](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Escribime tu nombre, por favor.');
      expect(ctx.wizard.next).not.toHaveBeenCalled();
    });

    it('guarda el nombre y pide el apellido', async () => {
      const ctx = makeCtx({ message: { text: 'Juan' } });
      await steps[1](ctx);
      expect(ctx.wizard.state.booking.clientName).toBe('Juan');
      expect(ctx.reply).toHaveBeenCalledWith('¿Y tu apellido?');
      expect(ctx.wizard.next).toHaveBeenCalled();
    });
  });

  describe('step 2 — apellido', () => {
    it('rechaza texto vacío', async () => {
      const ctx = makeCtx({ message: {} });
      await steps[2](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Escribime tu apellido, por favor.');
    });

    it('guarda el apellido y pide el teléfono', async () => {
      const ctx = makeCtx({ message: { text: 'Perez' } });
      await steps[2](ctx);
      expect(ctx.wizard.state.booking.clientLastname).toBe('Perez');
      expect(ctx.reply).toHaveBeenCalledWith('¿Tu número de teléfono?');
    });
  });

  describe('step 3 — teléfono', () => {
    it('rechaza teléfonos muy cortos', async () => {
      const ctx = makeCtx({ message: { text: '123' } });
      await steps[3](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Escribime un teléfono válido, por favor.');
      expect(ctx.wizard.next).not.toHaveBeenCalled();
    });

    it('guarda el teléfono y pide el email', async () => {
      const ctx = makeCtx({ message: { text: '099111222' } });
      await steps[3](ctx);
      expect(ctx.wizard.state.booking.clientPhone).toBe('099111222');
      expect(ctx.reply).toHaveBeenCalledWith('¿Tu email?');
    });
  });

  describe('step 4 — email', () => {
    it('rechaza emails con formato inválido', async () => {
      const ctx = makeCtx({ message: { text: 'no-es-un-email' } });
      await steps[4](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Ese email no parece válido. Probá de nuevo.');
      expect(ctx.wizard.next).not.toHaveBeenCalled();
    });

    it('guarda el email y ofrece texto libre o botones', async () => {
      const ctx = makeCtx({ message: { text: 'juan@test.com' } });
      await steps[4](ctx);
      expect(ctx.wizard.state.booking.clientEmail).toBe('juan@test.com');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Contame qué querés reservar'),
        expect.anything(),
      );
      expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('si ya había texto libre pendiente, lo procesa en vez de pedir botones', async () => {
      const ctx = makeCtx({
        message: { text: 'juan@test.com' },
        wizard: { state: { booking: { pendingFreeText: 'un corte el lunes' } }, next: jest.fn(), selectStep: jest.fn() },
      });

      await steps[4](ctx);

      expect(ctx.wizard.state.booking.clientEmail).toBe('juan@test.com');
      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
    });
  });

  describe('step 5 — resuelve texto libre o botón "usar botones"', () => {
    it('con el botón use_buttons: muestra los servicios y pasa al paso 6', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'use_buttons' } });
      await steps[5](ctx);
      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un servicio:', expect.anything());
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(6);
    });

    it('con el botón use_buttons y sin servicios: informa y sale de la escena', async () => {
      mockedBackendClient.getServices.mockResolvedValue({ services: [] });
      const ctx = makeCtx({ callbackQuery: { data: 'use_buttons' } });
      await steps[5](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('No hay servicios disponibles en este momento. Probá más tarde.');
      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('sin data ni texto: pide que escriban o toquen el botón', async () => {
      const ctx = makeCtx({});
      await steps[5](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Escribime qué querés reservar, o tocá el botón de arriba.');
    });

    it('con texto libre: lo delega a processFreeText (gemini deshabilitado -> fallback a botones)', async () => {
      const ctx = makeCtx({ message: { text: 'un corte para el martes' } });
      await steps[5](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(6);
    });
  });

  describe('step 6 — servicio -> barberos', () => {
    it('rechaza callback_data que no sea de servicio', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'otra-cosa' } });
      await steps[6](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un servicio de la lista de arriba.');
    });

    it('si el servicio ya no existe, sale de la escena', async () => {
      mockedBackendClient.getServices.mockResolvedValue({ services: [makeService({ id: 'otro-id' })] });
      const ctx = makeCtx({ callbackQuery: { data: 'svc:svc-1' } });
      await steps[6](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Ese servicio ya no está disponible. Reiniciá con /reservar.');
      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('guarda el servicio y muestra los barberos', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'svc:svc-1' } });
      await steps[6](ctx);
      expect(ctx.wizard.state.booking.serviceId).toBe('svc-1');
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un barbero:', expect.anything());
      expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('si no hay barberos disponibles, sale de la escena', async () => {
      mockedBackendClient.getBarbersPublic.mockResolvedValue({ barbers: [] });
      const ctx = makeCtx({ callbackQuery: { data: 'svc:svc-1' } });
      await steps[6](ctx);
      expect(ctx.scene.leave).toHaveBeenCalled();
    });
  });

  describe('step 7 — barbero -> fechas', () => {
    it('rechaza callback_data que no sea de barbero', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'otra-cosa' } });
      await steps[7](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un barbero de la lista de arriba.');
    });

    it('si el barbero ya no existe, sale de la escena', async () => {
      mockedBackendClient.getBarbersPublic.mockResolvedValue({ barbers: [makeBarber({ id: 'otro' })] });
      const ctx = makeCtx({ callbackQuery: { data: 'brb:barber-1' } });
      await steps[7](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Ese barbero ya no está disponible. Reiniciá con /reservar.');
      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('guarda el barbero y muestra las fechas', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'brb:barber-1' } });
      await steps[7](ctx);
      expect(ctx.wizard.state.booking.barberId).toBe('barber-1');
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un día:', expect.anything());
      expect(ctx.wizard.next).toHaveBeenCalled();
    });
  });

  describe('step 8 — fecha -> horarios', () => {
    it('rechaza callback_data que no sea de fecha', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'otra-cosa' } });
      await steps[8](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un día de la lista de arriba.');
    });

    it('sin horarios disponibles: informa el motivo y vuelve a pedir fecha (sin avanzar)', async () => {
      mockedBackendClient.getSlots.mockResolvedValue({ date: '2026-06-01', slots: [], reason: 'day-off' });
      const ctx = makeCtx({ callbackQuery: { data: 'date:2026-06-01' }, wizard: { state: { booking: { barberId: 'barber-1' } }, next: jest.fn(), selectStep: jest.fn() } });

      await steps[8](ctx);

      expect(ctx.reply).toHaveBeenCalledWith('Ese día el barbero no atiende.');
      expect(ctx.wizard.selectStep).not.toHaveBeenCalled();
    });

    it('con horarios disponibles: los muestra y pasa al paso 9', async () => {
      mockedBackendClient.getSlots.mockResolvedValue({ date: '2026-06-01', slots: ['10:00', '11:00'] });
      const ctx = makeCtx({ callbackQuery: { data: 'date:2026-06-01' }, wizard: { state: { booking: { barberId: 'barber-1' } }, next: jest.fn(), selectStep: jest.fn() } });

      await steps[8](ctx);

      expect(ctx.wizard.state.booking.date).toBe('2026-06-01');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Horarios disponibles'), expect.anything());
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(9);
    });

    it('con una hora pendiente que está disponible: confirma directo (paso 10)', async () => {
      mockedBackendClient.getSlots.mockResolvedValue({ date: '2026-06-01', slots: ['10:00', '11:00'] });
      const ctx = makeCtx({
        callbackQuery: { data: 'date:2026-06-01' },
        wizard: { state: { booking: { barberId: 'barber-1', pendingTime: '10:00', serviceName: 'Corte', barberName: 'Santiago Pérez', clientName: 'Juan', clientLastname: 'Perez', clientPhone: '099', clientEmail: 'j@test.com' } }, next: jest.fn(), selectStep: jest.fn() },
      });

      await steps[8](ctx);

      expect(ctx.wizard.state.booking.startTime).toBe('10:00');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Confirmá tu turno'), expect.anything());
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(10);
    });
  });

  describe('step 9 — horario -> confirmación', () => {
    it('rechaza callback_data que no sea de horario', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'otra-cosa' } });
      await steps[9](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un horario de la lista de arriba.');
    });

    it('guarda el horario y muestra la confirmación', async () => {
      const ctx = makeCtx({
        callbackQuery: { data: 'time:10:00' },
        wizard: { state: { booking: { serviceName: 'Corte', barberName: 'Santiago Pérez', date: '2026-06-01', clientName: 'Juan', clientLastname: 'Perez', clientPhone: '099', clientEmail: 'j@test.com' } }, next: jest.fn(), selectStep: jest.fn() },
      });

      await steps[9](ctx);

      expect(ctx.wizard.state.booking.startTime).toBe('10:00');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Confirmá tu turno'), expect.anything());
      expect(ctx.wizard.next).toHaveBeenCalled();
    });
  });

  describe('step 10 — confirmación final', () => {
    it('rechaza callback_data que no sea confirm:yes/no', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'otra-cosa' } });
      await steps[10](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Tocá uno de los botones de arriba.');
    });

    it('confirm:no cancela la reserva y sale de la escena', async () => {
      const ctx = makeCtx({ callbackQuery: { data: 'confirm:no' } });
      await steps[10](ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Reserva cancelada.');
      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('confirm:yes adquiere el temp lock, crea el turno y confirma al usuario', async () => {
      mockedBackendClient.acquireTempLock.mockResolvedValue({ tempLockId: 'lock-1', ownerToken: 'a'.repeat(64) });
      mockedBackendClient.createGuestAppointment.mockResolvedValue({ id: 'apt-1' } as any);
      const ctx = makeCtx({
        callbackQuery: { data: 'confirm:yes' },
        wizard: { state: { booking: { barberId: 'b1', serviceId: 's1', date: '2026-06-01', startTime: '10:00', clientName: 'Juan', clientLastname: 'Perez', clientPhone: '099', clientEmail: 'j@test.com' } }, next: jest.fn(), selectStep: jest.fn() },
      });

      await steps[10](ctx);

      expect(mockedBackendClient.acquireTempLock).toHaveBeenCalledWith('b1', '2026-06-01', '10:00');
      expect(mockedBackendClient.createGuestAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ barberId: 'b1', serviceId: 's1', tempLockId: 'lock-1' }),
        undefined,
      );
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('quedó reservado'));
      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('confirm:yes con accessToken: pide una sesión fresca antes de crear el turno', async () => {
      mockedGetSession.mockResolvedValue({ accessToken: 'fresh-tok' });
      mockedBackendClient.acquireTempLock.mockResolvedValue({ tempLockId: 'lock-1', ownerToken: 'a'.repeat(64) });
      mockedBackendClient.createGuestAppointment.mockResolvedValue({ id: 'apt-1' } as any);
      const ctx = makeCtx({
        callbackQuery: { data: 'confirm:yes' },
        wizard: { state: { booking: { accessToken: 'old-tok', barberId: 'b1', serviceId: 's1', date: '2026-06-01', startTime: '10:00', clientName: 'Juan', clientLastname: 'Perez', clientPhone: '099', clientEmail: 'j@test.com' } }, next: jest.fn(), selectStep: jest.fn() },
      });

      await steps[10](ctx);

      expect(mockedGetSession).toHaveBeenCalledWith(555);
      expect(mockedBackendClient.createGuestAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ tempLockId: 'lock-1' }),
        'fresh-tok',
      );
    });

    it('confirm:yes con error del backend: libera el temp lock, avisa y sale de la escena igual', async () => {
      mockedBackendClient.acquireTempLock.mockResolvedValue({ tempLockId: 'lock-1', ownerToken: 'a'.repeat(64) });
      mockedBackendClient.createGuestAppointment.mockRejectedValue(new Error('El horario ya está ocupado.'));
      const ctx = makeCtx({
        callbackQuery: { data: 'confirm:yes' },
        wizard: { state: { booking: { barberId: 'b1', serviceId: 's1', date: '2026-06-01', startTime: '10:00', clientName: 'Juan', clientLastname: 'Perez', clientPhone: '099', clientEmail: 'j@test.com' } }, next: jest.fn(), selectStep: jest.fn() },
      });

      await steps[10](ctx);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('El horario ya está ocupado.'));
      expect(mockedBackendClient.releaseTempLock).toHaveBeenCalledWith('lock-1', 'a'.repeat(64));
      expect(ctx.scene.leave).toHaveBeenCalled();
    });
  });

  describe('procesamiento de texto libre (Gemini) — vía step 5', () => {
    beforeEach(() => {
      setGeminiEnabled(true);
    });

    it('si Gemini no devuelve nada válido, cae a botones', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue(null);
      const ctx = makeCtx({ message: { text: 'che quiero un corte' } });

      await steps[5](ctx);

      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
    });

    it('si el intent no es crear_turno, cae a botones', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'saludo', servicio: null, barbero: null, fecha: null, hora: null, campos_faltantes: [], confianza_baja: false,
      });
      const ctx = makeCtx({ message: { text: 'hola' } });

      await steps[5](ctx);

      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
    });

    it('si no matchea nada (ni servicio, ni barbero, ni fecha, ni hora), cae a botones', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: null, barbero: null, fecha: null, hora: null, campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(undefined);
      mockedGemini.matchBarber.mockReturnValue(undefined);
      const ctx = makeCtx({ message: { text: 'quiero algo' } });

      await steps[5](ctx);

      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
    });

    it('matchea servicio y barbero pero falta la fecha: pide fecha y avisa qué entendió', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: 'Corte', barbero: 'Santiago', fecha: null, hora: null, campos_faltantes: ['fecha'], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(makeService());
      mockedGemini.matchBarber.mockReturnValue(makeBarber());
      const ctx = makeCtx({ message: { text: 'corte con santiago' } });

      await steps[5](ctx);

      expect(ctx.wizard.state.booking.serviceId).toBe('svc-1');
      expect(ctx.wizard.state.booking.barberId).toBe('barber-1');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Entendí esto de tu mensaje'));
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un día:', expect.anything());
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(8);
    });

    it('matchea servicio pero no barbero: pide elegir barbero con botones', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: 'Corte', barbero: null, fecha: null, hora: null, campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(makeService());
      mockedGemini.matchBarber.mockReturnValue(undefined);
      const ctx = makeCtx({ message: { text: 'quiero un corte' } });

      await steps[5](ctx);

      expect(ctx.wizard.state.booking.serviceId).toBe('svc-1');
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un barbero:', expect.anything());
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(7);
    });

    it('matchea servicio pero no barbero, y no hay barberos disponibles: sale de la escena', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: 'Corte', barbero: null, fecha: null, hora: null, campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(makeService());
      mockedGemini.matchBarber.mockReturnValue(undefined);
      mockedBackendClient.getBarbersPublic.mockResolvedValue({ barbers: [] });
      const ctx = makeCtx({ message: { text: 'quiero un corte' } });

      await steps[5](ctx);

      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('no matchea servicio: pide elegir servicio con botones', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: null, barbero: 'Santiago', fecha: null, hora: null, campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(undefined);
      mockedGemini.matchBarber.mockReturnValue(makeBarber());
      const ctx = makeCtx({ message: { text: 'con santiago' } });

      await steps[5](ctx);

      expect(ctx.reply).toHaveBeenCalledWith('Elegí un servicio:', expect.anything());
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(6);
    });

    it('descarta una fecha con formato inválido o ya pasada', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: 'Corte', barbero: 'Santiago', fecha: '2000-01-01', hora: null, campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(makeService());
      mockedGemini.matchBarber.mockReturnValue(makeBarber());
      const ctx = makeCtx({ message: { text: 'corte con santiago el 2000-01-01' } });

      await steps[5](ctx);

      expect(ctx.wizard.state.booking.date).toBeUndefined();
      expect(ctx.reply).toHaveBeenCalledWith('Elegí un día:', expect.anything());
    });

    it('matchea servicio, barbero y fecha: consulta horarios y avanza (sin hora pendiente)', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: 'Corte', barbero: 'Santiago', fecha: '2030-06-15', hora: null, campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(makeService());
      mockedGemini.matchBarber.mockReturnValue(makeBarber());
      mockedBackendClient.getSlots.mockResolvedValue({ date: '2030-06-15', slots: ['10:00'] });
      const ctx = makeCtx({ message: { text: 'corte con santiago el 15/06' } });

      await steps[5](ctx);

      expect(mockedBackendClient.getSlots).toHaveBeenCalledWith('barber-1', '2030-06-15');
      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(9);
    });

    it('con hora pendiente disponible: confirma directo (paso 10)', async () => {
      mockedGemini.extractBookingIntent.mockResolvedValue({
        intent: 'crear_turno', servicio: 'Corte', barbero: 'Santiago', fecha: '2030-06-15', hora: '10:00', campos_faltantes: [], confianza_baja: false,
      });
      mockedGemini.matchService.mockReturnValue(makeService());
      mockedGemini.matchBarber.mockReturnValue(makeBarber());
      mockedBackendClient.getSlots.mockResolvedValue({ date: '2030-06-15', slots: ['10:00', '11:00'] });
      const ctx = makeCtx({ message: { text: 'corte con santiago el 15/06 a las 10' } });

      await steps[5](ctx);

      expect(ctx.wizard.selectStep).toHaveBeenCalledWith(10);
    });
  });

  describe('handlers registrados fuera de los steps (comando /cancelar y clasificación de texto libre)', () => {
    // Composer.compose valida `ctx instanceof Context` en cuanto hay más de un middleware
    // en la cadena (que es el caso acá: .command(), .on('text'), y el paso activo del
    // wizard). Un objeto plano no alcanza; hace falta una instancia real de Context.
    function makeRealCtx(message: Record<string, unknown>, sceneOverrides: Record<string, unknown> = {}) {
      const telegram = new Telegram('test-token');
      jest.spyOn(telegram, 'callApi').mockResolvedValue(true as any);
      const botInfo = { id: 1, is_bot: true, first_name: 'Bot', username: 'test_bot' } as any;
      const update = { update_id: 1, message: { message_id: 1, date: 0, chat: { id: 555, type: 'private' }, from: { id: 555, is_bot: false, first_name: 'Test' }, ...message } };
      const ctx = new Context(update as any, telegram, botInfo) as any;
      ctx.reply = jest.fn();
      ctx.answerCbQuery = jest.fn();
      ctx.scene = { leave: jest.fn(), enter: jest.fn(), state: {}, session: {}, ...sceneOverrides };
      return ctx;
    }

    it('/cancelar sale de la escena avisando al usuario', async () => {
      const ctx = makeRealCtx({ text: '/cancelar', entities: [{ offset: 0, length: 9, type: 'bot_command' }] });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Se canceló la reserva'));
      expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('con gemini deshabilitado, el texto libre no clasificado cae al paso activo del wizard (no se pierde)', async () => {
      setGeminiEnabled(false);
      const ctx = makeRealCtx({ text: 'un corte para el lunes' }, { state: { booking: {} }, session: { cursor: 5 } });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(mockedGemini.classifyGeneralIntent).not.toHaveBeenCalled();
      // paso 5 con gemini deshabilitado delega a processFreeText -> fallback a botones
      expect(ctx.reply).toHaveBeenCalledWith('No te entendí bien, elijamos con botones.');
    });

    it('con gemini habilitado y clasificación "productos": resuelve el comando ahí mismo sin tocar el estado de la reserva', async () => {
      setGeminiEnabled(true);
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'productos', confianza_baja: false });
      const ctx = makeRealCtx({ text: 'mostrame los productos' }, { state: { booking: {} }, session: { cursor: 5 } });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(mockedHandleProductos).toHaveBeenCalledWith(ctx);
    });

    it('con gemini habilitado y clasificación "barberos": resuelve el comando ahí mismo', async () => {
      setGeminiEnabled(true);
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'barberos', confianza_baja: false });
      const ctx = makeRealCtx({ text: 'quienes son los barberos' }, { state: { booking: {} }, session: { cursor: 5 } });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(mockedHandleBarberos).toHaveBeenCalledWith(ctx);
    });

    it('con gemini habilitado y clasificación "misturnos": resuelve el comando ahí mismo', async () => {
      setGeminiEnabled(true);
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'misturnos', confianza_baja: false });
      const ctx = makeRealCtx({ text: 'quiero ver mis turnos' }, { state: { booking: {} }, session: { cursor: 5 } });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(mockedHandleMisTurnos).toHaveBeenCalledWith(ctx);
    });

    it('con una intención que no maneja (ej. "reservar"), deja pasar el mensaje al paso activo', async () => {
      setGeminiEnabled(true);
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'reservar', confianza_baja: false });
      const ctx = makeRealCtx({ text: 'quiero reservar un turno nuevo' }, { state: { booking: {} }, session: { cursor: 1 } });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(ctx.wizard.state.booking.clientName).toBe('quiero reservar un turno nuevo');
    });

    it('con clasificación de baja confianza, deja pasar el mensaje al paso activo', async () => {
      setGeminiEnabled(true);
      mockedGemini.classifyGeneralIntent.mockResolvedValue({ intent: 'barberos', confianza_baja: true });
      const ctx = makeRealCtx({ text: 'algo ambiguo' }, { state: { booking: {} }, session: { cursor: 1 } });

      await guestBookingWizard.middleware()(ctx, jest.fn());

      expect(mockedHandleBarberos).not.toHaveBeenCalled();
      // paso 1 (nombre) corre con ese mismo texto como si fuera la respuesta esperada
      expect(ctx.wizard.state.booking.clientName).toBe('algo ambiguo');
    });
  });
});
