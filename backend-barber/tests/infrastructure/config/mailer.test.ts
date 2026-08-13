const sendMailMock = jest.fn();
const createTransportMock = jest.fn().mockReturnValue({ sendMail: sendMailMock });
const getTestMessageUrlMock = jest.fn();

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: (...args: unknown[]) => createTransportMock(...args),
    getTestMessageUrl: (...args: unknown[]) => getTestMessageUrlMock(...args),
  },
}));

const getConfigMock = jest.fn();
jest.mock('../../../src/infrastructure/config/env', () => ({
  getConfig: (...args: unknown[]) => getConfigMock(...args),
}));

const baseConfig = (overrides: Record<string, unknown> = {}) => ({
  smtp: { host: 'smtp.test', port: 587, secure: false, user: undefined, pass: undefined, from: 'noreply@test.com' },
  emailProvider: 'brevo',
  ...overrides,
});

// El transporter de nodemailer es un singleton a nivel de módulo (se crea una sola vez,
// en el primer sendMail), así que cada test resetea el registro de módulos de Jest y
// vuelve a requerir mailer.ts para poder controlar con qué config se construye.
describe('mailer.sendMail', () => {
  beforeEach(() => {
    jest.resetModules();
    sendMailMock.mockReset();
    createTransportMock.mockClear();
    getTestMessageUrlMock.mockReset();
    getConfigMock.mockReset();
  });

  it('debe crear el transporter sin auth si smtp.user no está configurado', async () => {
    getConfigMock.mockReturnValue(baseConfig());
    sendMailMock.mockResolvedValue({ messageId: '1' });
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'x@test.com', subject: 'Hola', html: '<p>hi</p>' });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.test', port: 587, secure: false, auth: undefined }),
    );
  });

  it('debe crear el transporter con auth si smtp.user está configurado', async () => {
    getConfigMock.mockReturnValue(baseConfig({ smtp: { host: 'smtp.test', port: 587, secure: false, user: 'bot@test.com', pass: 'secret', from: 'noreply@test.com' } }));
    sendMailMock.mockResolvedValue({ messageId: '1' });
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'x@test.com', subject: 'Hola' });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'bot@test.com', pass: 'secret' } }),
    );
  });

  it('debe usar smtp.from cuando no se especifica un remitente', async () => {
    getConfigMock.mockReturnValue(baseConfig());
    sendMailMock.mockResolvedValue({ messageId: '1' });
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'x@test.com', subject: 'Hola' });

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ from: 'noreply@test.com', to: 'x@test.com', subject: 'Hola' }));
  });

  it('debe usar el remitente explícito si se provee', async () => {
    getConfigMock.mockReturnValue(baseConfig());
    sendMailMock.mockResolvedValue({ messageId: '1' });
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ from: 'otro@test.com', to: 'x@test.com', subject: 'Hola' });

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ from: 'otro@test.com' }));
  });

  it('debe loguear el preview de Ethereal cuando emailProvider es ethereal', async () => {
    getConfigMock.mockReturnValue(baseConfig({ emailProvider: 'ethereal' }));
    sendMailMock.mockResolvedValue({ messageId: '1' });
    getTestMessageUrlMock.mockReturnValue('https://ethereal.email/preview/1');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'x@test.com', subject: 'Hola' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('https://ethereal.email/preview/1'));
    consoleSpy.mockRestore();
  });

  it('no debe intentar loguear el preview si getTestMessageUrl no devuelve nada', async () => {
    getConfigMock.mockReturnValue(baseConfig({ emailProvider: 'ethereal' }));
    sendMailMock.mockResolvedValue({ messageId: '1' });
    getTestMessageUrlMock.mockReturnValue(false);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'x@test.com', subject: 'Hola' });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('no debe consultar getTestMessageUrl si emailProvider no es ethereal', async () => {
    getConfigMock.mockReturnValue(baseConfig({ emailProvider: 'brevo' }));
    sendMailMock.mockResolvedValue({ messageId: '1' });
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'x@test.com', subject: 'Hola' });

    expect(getTestMessageUrlMock).not.toHaveBeenCalled();
  });

  it('debe reutilizar el mismo transporter entre llamadas sucesivas', async () => {
    getConfigMock.mockReturnValue(baseConfig());
    sendMailMock.mockResolvedValue({ messageId: '1' });
    const { sendMail } = require('../../../src/infrastructure/config/mailer') as { sendMail: (args: any) => Promise<any> };

    await sendMail({ to: 'a@test.com', subject: 'Uno' });
    await sendMail({ to: 'b@test.com', subject: 'Dos' });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });
});
