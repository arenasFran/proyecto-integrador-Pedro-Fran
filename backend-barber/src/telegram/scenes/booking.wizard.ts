import { Scenes, Markup } from 'telegraf';
import { EMAIL_REGEX } from '../../domain/constants/validation';
import * as backendClient from '../services/backendClient';
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

export const guestBookingWizard = new Scenes.WizardScene<WizardCtx>(
  GUEST_BOOKING_SCENE_ID,

  // 0: inicio
  async (ctx) => {
    getState(ctx);
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

  // 4: email -> lista de servicios
  async (ctx) => {
    const text = getTextInput(ctx);
    if (!text || !EMAIL_REGEX.test(text)) {
      await ctx.reply('Ese email no parece válido. Probá de nuevo.');
      return;
    }
    getState(ctx).clientEmail = text;

    const { services } = await backendClient.getServices();
    if (services.length === 0) {
      await ctx.reply('No hay servicios disponibles en este momento. Probá más tarde.');
      return ctx.scene.leave();
    }
    const keyboard = Markup.inlineKeyboard(
      chunk(
        services.map((s) => Markup.button.callback(`${s.name} ($${s.price})`, `svc:${s.id}`)),
        2
      )
    );
    await ctx.reply('Elegí un servicio:', keyboard);
    return ctx.wizard.next();
  },

  // 5: servicio -> lista de barberos
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

    const { barbers } = await backendClient.getBarbersPublic();
    if (barbers.length === 0) {
      await ctx.reply('No hay barberos disponibles en este momento. Probá más tarde.');
      return ctx.scene.leave();
    }
    const keyboard = Markup.inlineKeyboard(
      chunk(
        barbers.map((b) => Markup.button.callback(`${b.name} ${b.lastname}`, `brb:${b.id}`)),
        2
      )
    );
    await ctx.reply('Elegí un barbero:', keyboard);
    return ctx.wizard.next();
  },

  // 6: barbero -> fechas
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

    await ctx.reply('Elegí un día:', nextDaysKeyboard());
    return ctx.wizard.next();
  },

  // 7: fecha -> horarios
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (!data?.startsWith('date:')) {
      await ctx.reply('Elegí un día de la lista de arriba.');
      return;
    }
    await ctx.answerCbQuery();
    const date = data.slice('date:'.length);
    const state = getState(ctx);
    const result = await backendClient.getSlots(state.barberId as string, date);

    if (result.slots.length === 0) {
      await ctx.reply((result.reason && REASON_MESSAGES[result.reason]) || 'No hay horarios disponibles ese día.');
      await ctx.reply('Elegí otro día:', nextDaysKeyboard());
      return;
    }

    state.date = date;
    const keyboard = Markup.inlineKeyboard(
      chunk(
        result.slots.map((time) => Markup.button.callback(time, `time:${time}`)),
        3
      )
    );
    await ctx.reply(`Horarios disponibles para el ${date}:`, keyboard);
    return ctx.wizard.next();
  },

  // 8: horario -> confirmación
  async (ctx) => {
    const data = getCallbackData(ctx);
    if (!data?.startsWith('time:')) {
      await ctx.reply('Elegí un horario de la lista de arriba.');
      return;
    }
    await ctx.answerCbQuery();
    const state = getState(ctx);
    state.startTime = data.slice('time:'.length);

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
    return ctx.wizard.next();
  },

  // 9: confirmación final
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
      await backendClient.createGuestAppointment({
        barberId: state.barberId as string,
        serviceId: state.serviceId as string,
        date: state.date as string,
        startTime: state.startTime as string,
        clientName: state.clientName as string,
        clientLastname: state.clientLastname as string,
        clientPhone: state.clientPhone as string,
        clientEmail: state.clientEmail as string,
      });
      await ctx.reply('¡Listo! Tu turno quedó reservado. 💈');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await ctx.reply(`No pudimos reservar el turno: ${message}. Probá de nuevo con /reservar.`);
    }
    return ctx.scene.leave();
  }
);

guestBookingWizard.command('cancelar', async (ctx) => {
  await ctx.reply('Reserva cancelada.');
  return ctx.scene.leave();
});
