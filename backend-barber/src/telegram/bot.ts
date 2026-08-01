import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { getConfig } from '../infrastructure/config/env';
import { guestBookingWizard, GUEST_BOOKING_SCENE_ID } from './scenes/booking.wizard';
import { cancelAppointmentAsUser } from './services/backendClient';
import { linkTelegramAccount, getSessionForTelegramId } from './services/accountLink.service';
import { classifyGeneralIntent } from './services/gemini.service';
import {
  handleProductosCommand,
  handleBarberosCommand,
  handleMisTurnosCommand,
  handleCancelarCommand,
  handleAyudaCommand,
} from './handlers/commonCommands';

type BotContext = Scenes.WizardContext;

export function createBot(): Telegraf<BotContext> {
  const { botToken } = getConfig().telegram;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN no configurado.');
  }

  const bot = new Telegraf<BotContext>(botToken);
  const stage = new Scenes.Stage<BotContext>([guestBookingWizard]);

  bot.use(session());
  bot.use(stage.middleware());

  bot.start(async (ctx) => {
    const linkToken = ctx.startPayload;
    if (linkToken) {
      try {
        await linkTelegramAccount(linkToken, ctx.from.id);
        await ctx.reply('¡Listo! Tu cuenta quedó vinculada. Ya podés usar /reservar, /misturnos y /cancelar.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        await ctx.reply(`No pudimos vincular tu cuenta: ${message}`);
      }
      return;
    }

    await ctx.reply(
      'Hola! Soy el bot de Barbería SA. ¿Tenés cuenta en la web?',
      Markup.inlineKeyboard([
        [Markup.button.callback('No tengo cuenta', 'guest_start')],
        [Markup.button.callback('Tengo cuenta', 'account_start')],
      ])
    );
  });

  bot.action('guest_start', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter(GUEST_BOOKING_SCENE_ID);
  });

  bot.action('account_start', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "Si ya vinculaste tu cuenta, escribí /reservar y te reconozco automáticamente. Si todavía no la vinculaste: entrá a la web, logueate, y en tu perfil tocá 'Conectar Telegram'."
    );
  });

  bot.command('reservar', (ctx) => ctx.scene.enter(GUEST_BOOKING_SCENE_ID));

  bot.command('misturnos', handleMisTurnosCommand);

  bot.command('cancelar', handleCancelarCommand);

  bot.action(/^cancel_apt:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const appointmentId = ctx.match[1];
    try {
      const session = await getSessionForTelegramId(ctx.from.id);
      if (!session) {
        return ctx.reply("Todavía no vinculaste tu cuenta. Andá a tu perfil en la web y tocá 'Conectar Telegram'.");
      }
      const result = await cancelAppointmentAsUser(session.accessToken, appointmentId);
      await ctx.reply(result.message || 'Turno cancelado correctamente.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await ctx.reply(`No pudimos cancelar el turno: ${message}`);
    }
  });

  bot.command('ayuda', handleAyudaCommand);

  bot.command('productos', handleProductosCommand);

  bot.command('barberos', handleBarberosCommand);

  bot.on('text', async (ctx) => {
    const text = (ctx.message as { text?: string })?.text;
    if (!text || text.startsWith('/')) return;
    if (!getConfig().gemini.enabled) return;

    const classification = await classifyGeneralIntent(text, ctx.from?.id);
    if (!classification || classification.confianza_baja || classification.intent === 'otro') return;

    switch (classification.intent) {
      case 'productos':
        return handleProductosCommand(ctx);
      case 'barberos':
        return handleBarberosCommand(ctx);
      case 'misturnos':
        return handleMisTurnosCommand(ctx);
      case 'cancelar':
        return handleCancelarCommand(ctx);
      case 'reservar':
        return ctx.scene.enter(GUEST_BOOKING_SCENE_ID, { booking: { pendingFreeText: text } });
    }
  });

  bot.catch((err, ctx) => {
    console.error('[TelegramBot] Error no manejado:', err);
    ctx.reply('Uy, algo salió mal. Probá de nuevo con /start.').catch(() => {});
  });

  return bot;
}

export async function launchBot(): Promise<void> {
  const bot = createBot();
  await bot.launch();
  console.log('[TelegramBot] Bot iniciado en modo polling.');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
