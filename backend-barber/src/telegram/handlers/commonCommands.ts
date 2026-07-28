import { Scenes, Markup } from 'telegraf';
import { getProducts, getMyAppointments } from '../services/backendClient';
import { getSessionForTelegramId } from '../services/accountLink.service';

type BotContext = Scenes.WizardContext;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function handleProductosCommand(ctx: BotContext) {
  try {
    const { products } = await getProducts();
    if (products.length === 0) {
      return ctx.reply('No hay productos disponibles en este momento.');
    }
    const lines = products.map((p) => `• ${p.name} — $${p.price} (stock: ${p.stock})`);
    await ctx.reply(`Productos disponibles:\n\n${lines.join('\n')}`);
  } catch (error) {
    console.error('[TelegramBot] Error /productos:', error);
    await ctx.reply('No pude obtener los productos ahora mismo. Probá de nuevo más tarde.');
  }
}

export async function handleMisTurnosCommand(ctx: BotContext) {
  try {
    const session = await getSessionForTelegramId(ctx.from!.id);
    if (!session) {
      return ctx.reply("Todavía no vinculaste tu cuenta. Andá a tu perfil en la web y tocá 'Conectar Telegram'.");
    }

    const { appointments } = await getMyAppointments(session.accessToken, {
      dateFrom: todayISO(),
      sortBy: 'date',
      sortDir: 'asc',
      limit: 20,
    });
    const relevant = appointments.filter((a) => !['Cancelado', 'Completado'].includes(a.status));

    if (relevant.length === 0) {
      return ctx.reply('No tenés turnos próximos.');
    }

    const lines = relevant.map(
      (a) => `• ${a.serviceName} con ${a.barberName || 'barbero sin asignar'} — ${a.date} ${a.startTime} (${a.status})`
    );
    await ctx.reply(`Tus turnos:\n\n${lines.join('\n')}`);
  } catch (error) {
    console.error('[TelegramBot] Error /misturnos:', error);
    await ctx.reply('No pude obtener tus turnos ahora mismo. Probá de nuevo más tarde.');
  }
}

export async function handleCancelarCommand(ctx: BotContext) {
  try {
    const session = await getSessionForTelegramId(ctx.from!.id);
    if (!session) {
      return ctx.reply("Todavía no vinculaste tu cuenta. Andá a tu perfil en la web y tocá 'Conectar Telegram'.");
    }

    const { appointments } = await getMyAppointments(session.accessToken, {
      dateFrom: todayISO(),
      sortBy: 'date',
      sortDir: 'asc',
      limit: 20,
    });
    const cancellable = appointments.filter((a) => !['Cancelado', 'Completado'].includes(a.status));

    if (cancellable.length === 0) {
      return ctx.reply('No tenés turnos para cancelar.');
    }

    const keyboard = Markup.inlineKeyboard(
      cancellable.map((a) => [
        Markup.button.callback(`${a.date} ${a.startTime} — ${a.serviceName}`, `cancel_apt:${a.id}`),
      ])
    );
    await ctx.reply('Elegí el turno que querés cancelar:', keyboard);
  } catch (error) {
    console.error('[TelegramBot] Error /cancelar:', error);
    await ctx.reply('No pude obtener tus turnos ahora mismo. Probá de nuevo más tarde.');
  }
}

export async function handleAyudaCommand(ctx: BotContext) {
  await ctx.reply(
    'Puedo ayudarte a reservar un turno con /reservar, consultar productos con /productos, ver tus turnos con /misturnos y cancelar uno con /cancelar. Si tenés cuenta en la web, vinculala desde tu perfil para que te reconozca.'
  );
}
