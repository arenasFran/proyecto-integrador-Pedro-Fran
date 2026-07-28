import { Scenes, Markup } from 'telegraf';
import { EMAIL_REGEX, TIME_REGEX } from '../../domain/constants/validation';
import { getConfig } from '../../infrastructure/config/env';
import * as backendClient from '../services/backendClient';
import * as geminiService from '../services/gemini.service';
import { getSessionForTelegramId } from '../services/accountLink.service';
import {
  handleProductosCommand,
  handleBarberosCommand,
  handleMisTurnosCommand,
  handleAyudaCommand,
} from '../handlers/commonCommands';
import type { GuestBookingState } from '../types/bookingState';

export const GUEST_BOOKING_SCENE_ID = 'guest-booking-wizard';

type WizardCtx = Scenes.WizardContext;

function getState(ctx: WizardCtx): GuestBookingState {
  const state = ctx.wizard.state as { booking?: GuestBookingState };
  if (!state.booking) state.booking = {};
  return state.booking;
}

function getTextInput(ctx: WizardCtx): string | undefined {
  const message = ctx.message as { text?: string } | undefined;
  const text = message?.text?.trim();
  return text || undefined;
}

function getCallbackData(ctx: WizardCtx): string | undefined {
  const query = ctx.callbackQuery as { data?: string } | undefined;
  return query?.data;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function nextDaysKeyboard(days = 7) {
  const buttons = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('es-UY', { weekday: 'short', day: '2-digit', month: '2-digit' });
    buttons.push(Markup.button.callback(label, `date:${iso}`));
  }
  return Markup.inlineKeyboard(chunk(buttons, 3));
}

const REASON_MESSAGES: Record<string, string> = {
  'day-off': 'Ese día el barbero no atiende.',
  'already-past': 'Ese día/horario ya pasó.',
  'fully-booked': 'Ese día ya no tiene horarios libres.',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function renderServiceOptions(ctx: WizardCtx): Promise<'ok' | 'empty'> {
  const { services } = await backendClient.getServices();
  if (services.length === 0) {
    await ctx.reply('No hay servicios disponibles en este momento. Probá más tarde.');
    return 'empty';
  }
  const keyboard = Markup.inlineKeyboard(
    chunk(services.map((s) => Markup.button.callback(`${s.name} ($${s.price})`, `svc:${s.id}`)), 2)
  );
  await ctx.reply('Elegí un servicio:', keyboard);
  return 'ok';
}

async function renderBarberOptions(ctx: WizardCtx): Promise<'ok' | 'empty'> {
  const { barbers } = await backendClient.getBarbersPublic();
  if (barbers.length === 0) {
    await ctx.reply('No hay barberos disponibles en este momento. Probá más tarde.');
    return 'empty';
  }
  const keyboard = Markup.inlineKeyboard(
    chunk(barbers.map((b) => Markup.button.callback(`${b.name} ${b.lastname}`, `brb:${b.id}`)), 2)
  );
  await ctx.reply('Elegí un barbero:', keyboard);
  return 'ok';
}

async function renderDateOptions(ctx: WizardCtx): Promise<void> {
  await ctx.reply('Elegí un día:', nextDaysKeyboard());
}

async function renderTimeOptions(
  ctx: WizardCtx,
  barberId: string,
  date: string,
  preferredTime?: string
): Promise<'confirmed' | 'ok' | 'retry-date'> {
  const result = await backendClient.getSlots(barberId, date);
  if (result.slots.length === 0) {
    await ctx.reply((result.reason && REASON_MESSAGES[result.reason]) || 'No hay horarios disponibles ese día.');
    await renderDateOptions(ctx);
    return 'retry-date';
  }
  const state = getState(ctx);
  state.date = date;

  if (preferredTime && result.slots.includes(preferredTime)) {
    state.startTime = preferredTime;
    await renderConfirmation(ctx);
    return 'confirmed';
  }

  const keyboard = Markup.inlineKeyboard(
    chunk(result.slots.map((time) => Markup.button.callback(time, `time:${time}`)), 3)
  );
  await ctx.reply(`Horarios disponibles para el ${date}:`, keyboard);
  return 'ok';
}

async function renderConfirmation(ctx: WizardCtx): Promise<void> {
  const state = getState(ctx);
  await ctx.reply(
    'Confirmá tu turno:\n\n' +
      `Servicio: ${state.serviceName}\n` +
      `Barbero: ${state.barberName}\n` +
      `Fecha: ${state.date} ${state.startTime}\n` +
      `Nombre: ${state.clientName} ${state.clientLastname}\n` +
      `Teléfono: ${state.clientPhone}\n` +
      `Email: ${state.clientEmail}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Confirmar', 'confirm:yes'), Markup.button.callback('Cancelar', 'confirm:no')],
    ])
  );
}

export const guestBookingWizard = new Scenes.WizardScene<WizardCtx>(
  GUEST_BOOKING_SCENE_ID,

  // 0: inicio
  async (ctx) => {
    const state = getState(ctx);

    try {
      const telegramId = ctx.from?.id;
      const authSession = telegramId ? await getSessionForTelegramId(telegramId) : null;
      if (authSession) {
        const profile = await backendClient.getMyProfile(authSession.accessToken);
        if (profile.name && profile.lastname && profile.phone && profile.email) {
          state.accessToken = authSession.accessToken;
          state.clientName = profile.name;
          state.clientLastname = profile.lastname;
          state.clientPhone = profile.phone;
          state.clientEmail = profile.email;

          await ctx.reply(`¡Hola ${profile.name}! Vamos a reservar tu turno.`);
          await ctx.reply(
            'Contame qué querés reservar (ej: "corte con Santiago el lunes a las 15") o tocá el botón de abajo.',
            Markup.inlineKeyboard([[Markup.button.callback('Prefiero elegir con botones', 'use_buttons')]])
          );
          return ctx.wizard.selectStep(5);
        }
        state.accessToken = authSession.accessToken;
      }
    } catch (error) {
      console.error('[TelegramBot] Error chequeando vínculo de cuenta:', error);
    }

    await ctx.reply('Vamos a reservar tu turno. ¿Cuál es tu nombre?');
    return ctx.wizard.next();
  },

  // 1: nombre -> pide apellido
  async (ctx) => {
    const text = getTextInput(ctx);
    if (!text) {
      await ctx.reply('Escribime tu nombre, por favor.');
      return;
    }
    getState(ctx).clientName = text;
    await ctx.reply('¿Y tu apellido?');
    return ctx.wizard.next();
  },

  // 2: apellido -> pide teléfono
  async (ctx) => {
    const text = getTextInput(ctx);
    if (!text) {
      await ctx.reply('Escribime tu apellido, por favor.');
      return;
    }
    getState(ctx).clientLastname = text;
    await ctx.reply('¿Tu número de teléfono?');
    return ctx.wizard.next();
  },

  // 3: teléfono -> pide email
  async (ctx) => {
    const text = getTextInput(ctx);
    if (!text || text.length < 7) {
      await ctx.reply('Escribime un teléfono válido, por favor.');
      return;
    }
    getState(ctx).clientPhone = text;
    await ctx.reply('¿Tu email?');
    return ctx.wizard.next();
  },

  // 4: email -> invita a texto libre o botones
  async (ctx) => {
    const text = getTextInput(ctx);
    if (!text || !EMAIL_REGEX.test(text)) {
      await ctx.reply('Ese email no parece válido. Probá de nuevo.');
      return;
    }
    getState(ctx).clientEmail = text;

    await ctx.reply(
      'Contame qué querés reservar (ej: "corte con Santiago el lunes a las 15") o tocá el botón de abajo.',
      Markup.inlineKeyboard([[Markup.button.callback('Prefiero elegir con botones', 'use_buttons')]])
    );
    return ctx.wizard.next();
  },

  // 5: resuelve texto libre (Gemini) o botón "usar botones"
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (data === 'use_buttons') {
      await ctx.answerCbQuery();
      const result = await renderServiceOptions(ctx);
      if (result === 'empty') return ctx.scene.leave();
      return ctx.wizard.selectStep(6);
    }

    const text = getTextInput(ctx);
    if (!text) {
      await ctx.reply('Escribime qué querés reservar, o tocá el botón de arriba.');
      return;
    }

    const fallbackToButtons = async () => {
      await ctx.reply('No te entendí bien, elijamos con botones.');
      const result = await renderServiceOptions(ctx);
      if (result === 'empty') return ctx.scene.leave();
      return ctx.wizard.selectStep(6);
    };

    if (!getConfig().gemini.enabled) return fallbackToButtons();

    const { services } = await backendClient.getServices();
    const { barbers } = await backendClient.getBarbersPublic();
    const parsed = await geminiService.extractBookingIntent(text, {
      services,
      barbers,
      todayISO: todayISO(),
    });

    if (!parsed || parsed.confianza_baja || parsed.intent !== 'crear_turno') {
      return fallbackToButtons();
    }

    const state = getState(ctx);
    const service = geminiService.matchService(parsed.servicio, services);
    const barber = geminiService.matchBarber(parsed.barbero, barbers);
    const validDate = Boolean(parsed.fecha) && /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha as string) && (parsed.fecha as string) >= todayISO();
    const validTimeFormat = Boolean(parsed.hora) && TIME_REGEX.test(parsed.hora as string);

    if (service) {
      state.serviceId = service.id;
      state.serviceName = service.name;
    }
    if (barber) {
      state.barberId = barber.id;
      state.barberName = `${barber.name} ${barber.lastname}`;
    }
    if (validDate) state.date = parsed.fecha as string;
    if (validTimeFormat) state.pendingTime = parsed.hora as string;

    if (!state.serviceId) {
      const result = await renderServiceOptions(ctx);
      if (result === 'empty') return ctx.scene.leave();
      return ctx.wizard.selectStep(6);
    }
    if (!state.barberId) {
      const result = await renderBarberOptions(ctx);
      if (result === 'empty') return ctx.scene.leave();
      return ctx.wizard.selectStep(7);
    }
    if (!state.date) {
      await renderDateOptions(ctx);
      return ctx.wizard.selectStep(8);
    }

    const result = await renderTimeOptions(ctx, state.barberId as string, state.date as string, state.pendingTime);
    if (result === 'retry-date') return ctx.wizard.selectStep(8);
    return ctx.wizard.selectStep(result === 'confirmed' ? 10 : 9);
  },

  // 6: servicio -> lista de barberos
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (!data?.startsWith('svc:')) {
      await ctx.reply('Elegí un servicio de la lista de arriba.');
      return;
    }
    await ctx.answerCbQuery();
    const serviceId = data.slice('svc:'.length);
    const { services } = await backendClient.getServices();
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      await ctx.reply('Ese servicio ya no está disponible. Reiniciá con /reservar.');
      return ctx.scene.leave();
    }
    const state = getState(ctx);
    state.serviceId = service.id;
    state.serviceName = service.name;

    const result = await renderBarberOptions(ctx);
    if (result === 'empty') return ctx.scene.leave();
    return ctx.wizard.next();
  },

  // 7: barbero -> fechas
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (!data?.startsWith('brb:')) {
      await ctx.reply('Elegí un barbero de la lista de arriba.');
      return;
    }
    await ctx.answerCbQuery();
    const barberId = data.slice('brb:'.length);
    const { barbers } = await backendClient.getBarbersPublic();
    const barber = barbers.find((b) => b.id === barberId);
    if (!barber) {
      await ctx.reply('Ese barbero ya no está disponible. Reiniciá con /reservar.');
      return ctx.scene.leave();
    }
    const state = getState(ctx);
    state.barberId = barber.id;
    state.barberName = `${barber.name} ${barber.lastname}`;

    await renderDateOptions(ctx);
    return ctx.wizard.next();
  },

  // 8: fecha -> horarios
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (!data?.startsWith('date:')) {
      await ctx.reply('Elegí un día de la lista de arriba.');
      return;
    }
    await ctx.answerCbQuery();
    const date = data.slice('date:'.length);
    const state = getState(ctx);
    const result = await renderTimeOptions(ctx, state.barberId as string, date, state.pendingTime);
    if (result === 'retry-date') return;
    return ctx.wizard.selectStep(result === 'confirmed' ? 10 : 9);
  },

  // 9: horario -> confirmación
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (!data?.startsWith('time:')) {
      await ctx.reply('Elegí un horario de la lista de arriba.');
      return;
    }
    await ctx.answerCbQuery();
    const state = getState(ctx);
    state.startTime = data.slice('time:'.length);

    await renderConfirmation(ctx);
    return ctx.wizard.next();
  },

  // 10: confirmación final
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (data !== 'confirm:yes' && data !== 'confirm:no') {
      await ctx.reply('Tocá uno de los botones de arriba.');
      return;
    }
    await ctx.answerCbQuery();

    if (data === 'confirm:no') {
      await ctx.reply('Reserva cancelada.');
      return ctx.scene.leave();
    }

    const state = getState(ctx);
    try {
      // El accessToken capturado al principio del wizard puede haber expirado (dura 15 min).
      // Se pide una sesión fresca recién acá, justo antes de crear el turno.
      const freshAccessToken = state.accessToken && ctx.from
        ? (await getSessionForTelegramId(ctx.from.id))?.accessToken
        : undefined;

      await backendClient.createGuestAppointment(
        {
          barberId: state.barberId as string,
          serviceId: state.serviceId as string,
          date: state.date as string,
          startTime: state.startTime as string,
          clientName: state.clientName as string,
          clientLastname: state.clientLastname as string,
          clientPhone: state.clientPhone as string,
          clientEmail: state.clientEmail as string,
        },
        freshAccessToken
      );
      await ctx.reply('¡Listo! Tu turno quedó reservado. 💈');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await ctx.reply(`No pudimos reservar el turno: ${message}. Probá de nuevo con /reservar.`);
    }
    return ctx.scene.leave();
  }
);

guestBookingWizard.command('cancelar', async (ctx) => {
  await ctx.reply(
    'Se canceló la reserva que estabas armando. Escribí /reservar para empezar de nuevo, o /cancelar fuera de este flujo si querés cancelar un turno ya confirmado.'
  );
  return ctx.scene.leave();
});

// Comandos informativos: no deben quedar "atrapados" por el paso actual del wizard
// (antes, cualquier texto/comando que no fuera la respuesta esperada por el paso activo
// se perdía silenciosamente, dando la sensación de que el bot ignoraba al usuario).
guestBookingWizard.command('productos', handleProductosCommand);
guestBookingWizard.command('barberos', handleBarberosCommand);
guestBookingWizard.command('misturnos', handleMisTurnosCommand);
guestBookingWizard.command('ayuda', handleAyudaCommand);

// Mismo escape que los comandos de arriba, pero para lenguaje natural ("mostrame los
// barberos") en medio de una reserva. Corre antes que el paso actual del wizard: si
// Gemini detecta con confianza una intención informativa (productos/barberos/misturnos)
// la resuelve ahí mismo sin tocar el estado de la reserva; para cualquier otro caso
// (incluida la descripción libre del turno en el paso 5) deja pasar el mensaje sin tocarlo.
guestBookingWizard.on('text', async (ctx, next) => {
  const text = getTextInput(ctx);
  if (!text || text.startsWith('/')) return next();
  if (!getConfig().gemini.enabled) return next();

  const classification = await geminiService.classifyGeneralIntent(text);
  if (!classification || classification.confianza_baja) return next();

  switch (classification.intent) {
    case 'productos':
      return handleProductosCommand(ctx);
    case 'barberos':
      return handleBarberosCommand(ctx);
    case 'misturnos':
      return handleMisTurnosCommand(ctx);
    default:
      return next();
  }
});
