import {
  getServices,
  getBarbersPublic,
  getProducts,
  getSlots,
  createGuestAppointment,
  acquireTempLock,
  releaseTempLock,
  getMyProfile,
  getMyAppointments,
  cancelAppointmentAsUser,
} from '../../../src/telegram/services/backendClient';

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
  return global.fetch as jest.Mock;
}

describe('backendClient — construcción de requests', () => {
  afterEach(() => jest.restoreAllMocks());

  it('arma la URL como apiBaseUrl + path', async () => {
    const fetchMock = mockFetchOnce(200, { services: [] });

    await getServices();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/services$/),
      expect.any(Object)
    );
  });

  it('getBarbersPublic pega a /barbers/public', async () => {
    const fetchMock = mockFetchOnce(200, { barbers: [] });

    await getBarbersPublic();

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/barbers\/public$/);
  });

  it('getProducts pega a /products?status=active', async () => {
    const fetchMock = mockFetchOnce(200, { products: [] });

    await getProducts();

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/products\?status=active$/);
  });

  it('getSlots incluye barberId y date en la URL', async () => {
    const fetchMock = mockFetchOnce(200, { date: '2026-08-01', slots: [] });

    await getSlots('brb-1', '2026-08-01');

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/barbers\/brb-1\/slots\?date=2026-08-01$/);
  });

  it('devuelve el body parseado cuando la respuesta es ok', async () => {
    mockFetchOnce(200, { services: [{ id: '1', name: 'Corte', price: 400 }] });

    const result = await getServices();

    expect(result).toEqual({ services: [{ id: '1', name: 'Corte', price: 400 }] });
  });

  it('lanza el mensaje de error del body cuando la respuesta no es ok', async () => {
    mockFetchOnce(400, { error: 'Servicio no encontrado' });

    await expect(getServices()).rejects.toThrow('Servicio no encontrado');
  });

  it('lanza un mensaje genérico si la respuesta no-ok no trae body.error', async () => {
    mockFetchOnce(500, {});

    await expect(getServices()).rejects.toThrow(/Error 500/);
  });

  it('no revienta si el body de una respuesta no-ok no es JSON válido', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('body vacío');
      },
    }) as unknown as typeof fetch;

    await expect(getServices()).rejects.toThrow(/Error 502/);
  });
});

describe('backendClient — autenticación', () => {
  afterEach(() => jest.restoreAllMocks());

  it('getMyProfile manda el Bearer token', async () => {
    const fetchMock = mockFetchOnce(200, { id: '1' });

    await getMyProfile('token-123');

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('cancelAppointmentAsUser manda PATCH con Bearer token y reason en el body', async () => {
    const fetchMock = mockFetchOnce(200, { message: 'ok' });

    await cancelAppointmentAsUser('token-123', 'apt-1', 'no puedo ir');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/appointments\/apt-1\/cancel$/);
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'no puedo ir' });
  });

  it('createGuestAppointment no manda Authorization si no hay accessToken (invitado)', async () => {
    const fetchMock = mockFetchOnce(200, {});

    await createGuestAppointment({
      barberId: 'b1',
      serviceId: 's1',
      date: '2026-08-01',
      startTime: '10:00',
      clientName: 'Ana',
      clientLastname: 'Pérez',
      clientPhone: '099111111',
      clientEmail: 'ana@test.com',
      tempLockId: 'lock-1',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string).tempLockId).toBe('lock-1');
  });

  it('createGuestAppointment manda Authorization si hay accessToken (usuario vinculado)', async () => {
    const fetchMock = mockFetchOnce(200, {});

    await createGuestAppointment(
      {
        barberId: 'b1',
        serviceId: 's1',
        date: '2026-08-01',
        startTime: '10:00',
        clientName: 'Ana',
        clientLastname: 'Pérez',
        clientPhone: '099111111',
        clientEmail: 'ana@test.com',
        tempLockId: 'lock-1',
      },
      'token-456'
    );

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-456');
  });

  it('acquireTempLock pega a POST /appointments/temp-lock con barberId/date/startTime', async () => {
    const fetchMock = mockFetchOnce(201, { tempLockId: 'lock-1', ownerToken: 'a'.repeat(64) });

    const result = await acquireTempLock('b1', '2026-08-01', '10:00');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/appointments\/temp-lock$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ barberId: 'b1', date: '2026-08-01', startTime: '10:00' });
    expect(result).toEqual({ tempLockId: 'lock-1', ownerToken: 'a'.repeat(64) });
  });

  it('releaseTempLock pega a DELETE /appointments/temp-lock/:id con ownerToken', async () => {
    const fetchMock = mockFetchOnce(200, { message: 'TempLock liberado' });

    await releaseTempLock('lock-1', 'a'.repeat(64));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/appointments\/temp-lock\/lock-1$/);
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ ownerToken: 'a'.repeat(64) });
  });
});

describe('backendClient — getMyAppointments (query params)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('siempre incluye includeBarber=true', async () => {
    const fetchMock = mockFetchOnce(200, { appointments: [], total: 0 });

    await getMyAppointments('token');

    expect(fetchMock.mock.calls[0][0]).toContain('includeBarber=true');
  });

  it('agrega dateFrom, sortBy, sortDir y limit solo cuando se pasan', async () => {
    const fetchMock = mockFetchOnce(200, { appointments: [], total: 0 });

    await getMyAppointments('token', { dateFrom: '2026-08-01', sortBy: 'date', sortDir: 'asc', limit: 20 });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('dateFrom=2026-08-01');
    expect(url).toContain('sortBy=date');
    expect(url).toContain('sortDir=asc');
    expect(url).toContain('limit=20');
  });

  it('no agrega parámetros opcionales si no se pasan', async () => {
    const fetchMock = mockFetchOnce(200, { appointments: [], total: 0 });

    await getMyAppointments('token');

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain('dateFrom');
    expect(url).not.toContain('sortBy');
    expect(url).not.toContain('limit');
  });
});
