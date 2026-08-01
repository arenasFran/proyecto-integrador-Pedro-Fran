jest.mock('../../../src/telegram/services/backendClient');
jest.mock('../../../src/telegram/services/accountLink.service');

import {
  handleProductosCommand,
  handleBarberosCommand,
  handleMisTurnosCommand,
  handleCancelarCommand,
  handleAyudaCommand,
} from '../../../src/telegram/handlers/commonCommands';
import * as backendClient from '../../../src/telegram/services/backendClient';
import { getSessionForTelegramId } from '../../../src/telegram/services/accountLink.service';

const mockedBackendClient = backendClient as jest.Mocked<typeof backendClient>;
const mockedGetSession = getSessionForTelegramId as jest.Mock;

function makeCtx() {
  return { reply: jest.fn(), from: { id: 555 } } as any;
}

describe('commonCommands — /productos', () => {
  afterEach(() => jest.clearAllMocks());

  it('avisa cuando no hay productos', async () => {
    mockedBackendClient.getProducts.mockResolvedValue({ products: [] });
    const ctx = makeCtx();

    await handleProductosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No hay productos disponibles en este momento.');
  });

  it('lista los productos con precio y stock', async () => {
    mockedBackendClient.getProducts.mockResolvedValue({
      products: [{ id: '1', name: 'Cera', price: 300, stock: 5, category: 'cuidado' }],
    });
    const ctx = makeCtx();

    await handleProductosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Cera — $300 (stock: 5)'));
  });

  it('responde con un mensaje de error si el backend falla', async () => {
    mockedBackendClient.getProducts.mockRejectedValue(new Error('caído'));
    const ctx = makeCtx();

    await handleProductosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No pude obtener los productos ahora mismo. Probá de nuevo más tarde.');
  });
});

describe('commonCommands — /barberos', () => {
  afterEach(() => jest.clearAllMocks());

  it('avisa cuando no hay barberos', async () => {
    mockedBackendClient.getBarbersPublic.mockResolvedValue({ barbers: [] });
    const ctx = makeCtx();

    await handleBarberosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No hay barberos disponibles en este momento.');
  });

  it('lista los barberos', async () => {
    mockedBackendClient.getBarbersPublic.mockResolvedValue({
      barbers: [{ id: '1', name: 'Santiago', lastname: 'Pérez' }],
    });
    const ctx = makeCtx();

    await handleBarberosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Santiago Pérez'));
  });
});

describe('commonCommands — /misturnos', () => {
  afterEach(() => jest.clearAllMocks());

  it('pide vincular la cuenta si no hay sesión', async () => {
    mockedGetSession.mockResolvedValue(null);
    const ctx = makeCtx();

    await handleMisTurnosCommand(ctx);

    expect(mockedGetSession).toHaveBeenCalledWith(555);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("Conectar Telegram"));
    expect(mockedBackendClient.getMyAppointments).not.toHaveBeenCalled();
  });

  it('excluye turnos cancelados y completados de "tus turnos"', async () => {
    mockedGetSession.mockResolvedValue({ accessToken: 'tok' });
    mockedBackendClient.getMyAppointments.mockResolvedValue({
      appointments: [
        { id: '1', serviceName: 'Corte', barberName: 'Santiago', date: '2026-08-01', startTime: '10:00', status: 'Pendiente' },
        { id: '2', serviceName: 'Barba', barberName: 'Lucía', date: '2026-08-02', startTime: '11:00', status: 'Cancelado' },
        { id: '3', serviceName: 'Corte', barberName: 'Lucía', date: '2026-08-03', startTime: '12:00', status: 'Completado' },
      ],
      total: 3,
    });
    const ctx = makeCtx();

    await handleMisTurnosCommand(ctx);

    const [message] = ctx.reply.mock.calls[0];
    expect(message).toContain('Corte con Santiago');
    expect(message).not.toContain('Barba con Lucía');
    expect(message).not.toContain('12:00');
  });

  it('avisa cuando no quedan turnos próximos tras filtrar', async () => {
    mockedGetSession.mockResolvedValue({ accessToken: 'tok' });
    mockedBackendClient.getMyAppointments.mockResolvedValue({
      appointments: [{ id: '1', serviceName: 'Corte', date: '2026-08-01', startTime: '10:00', status: 'Cancelado' }],
      total: 1,
    });
    const ctx = makeCtx();

    await handleMisTurnosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No tenés turnos próximos.');
  });

  it('responde con un mensaje de error si el backend falla', async () => {
    mockedGetSession.mockResolvedValue({ accessToken: 'tok' });
    mockedBackendClient.getMyAppointments.mockRejectedValue(new Error('caído'));
    const ctx = makeCtx();

    await handleMisTurnosCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No pude obtener tus turnos ahora mismo. Probá de nuevo más tarde.');
  });
});

describe('commonCommands — /cancelar', () => {
  afterEach(() => jest.clearAllMocks());

  it('pide vincular la cuenta si no hay sesión', async () => {
    mockedGetSession.mockResolvedValue(null);
    const ctx = makeCtx();

    await handleCancelarCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("Conectar Telegram"));
  });

  it('avisa cuando no hay turnos cancelables', async () => {
    mockedGetSession.mockResolvedValue({ accessToken: 'tok' });
    mockedBackendClient.getMyAppointments.mockResolvedValue({ appointments: [], total: 0 });
    const ctx = makeCtx();

    await handleCancelarCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('No tenés turnos para cancelar.');
  });

  it('ofrece botones con el id del turno para cancelar', async () => {
    mockedGetSession.mockResolvedValue({ accessToken: 'tok' });
    mockedBackendClient.getMyAppointments.mockResolvedValue({
      appointments: [{ id: 'apt-1', serviceName: 'Corte', date: '2026-08-01', startTime: '10:00', status: 'Pendiente' }],
      total: 1,
    });
    const ctx = makeCtx();

    await handleCancelarCommand(ctx);

    const [message, keyboard] = ctx.reply.mock.calls[0];
    expect(message).toBe('Elegí el turno que querés cancelar:');
    expect(JSON.stringify(keyboard)).toContain('cancel_apt:apt-1');
  });
});

describe('commonCommands — /ayuda', () => {
  it('responde con la lista de comandos disponibles', async () => {
    const ctx = makeCtx();

    await handleAyudaCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('/reservar'));
  });
});
