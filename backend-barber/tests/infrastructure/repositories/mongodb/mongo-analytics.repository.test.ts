import mongoose from 'mongoose';
import { MongoAnalyticsRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoAnalyticsRepository';
import { Barber } from '../../../../src/infrastructure/repositories/mongodb/models/barber.model';
import AppointmentModel from '../../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import { Client, RegisteredClient, UnregisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';

// ObjectId cuyo timestamp embebido es el instante dado (segundos de resolución).
const oidAt = (iso: string) => mongoose.Types.ObjectId.createFromTime(Math.floor(new Date(iso).getTime() / 1000));

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const DESDE = '2025-06-01';
const HASTA = '2025-06-30';

describeIfMongo('MongoAnalyticsRepository', () => {
  let repository: MongoAnalyticsRepository;
  let barber1Id: mongoose.Types.ObjectId;
  let barber2Id: mongoose.Types.ObjectId;
  let regId1: mongoose.Types.ObjectId;
  let regId2: mongoose.Types.ObjectId;
  let regId3: mongoose.Types.ObjectId;

  beforeEach(async () => {
    repository = new MongoAnalyticsRepository();

    const b1 = await Barber.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'carlos@test.com',
      password: 'hash',
      name: 'Carlos',
      lastname: 'Lopez',
      phone: '111111',
    });
    barber1Id = b1._id as mongoose.Types.ObjectId;

    const b2 = await Barber.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'pedro@test.com',
      password: 'hash',
      name: 'Pedro',
      lastname: 'Garcia',
      phone: '222222',
    });
    barber2Id = b2._id as mongoose.Types.ObjectId;

    regId1 = new mongoose.Types.ObjectId();
    regId2 = new mongoose.Types.ObjectId();
    regId3 = new mongoose.Types.ObjectId();

    const makeAppointment = (overrides: {
      date: string;
      barberId: mongoose.Types.ObjectId;
      status: string;
      servicePrice?: number;
      serviceDuration?: number;
      clientId?: mongoose.Types.ObjectId;
      clientPhone?: string;
    }) => ({
      barberId: overrides.barberId,
      clientId: overrides.clientId,
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: overrides.clientPhone ?? (overrides.clientId ? undefined : '099333333'),
      clientEmail: 'cliente@test.com',
      serviceId: 'svc-1',
      serviceName: 'Corte',
      servicePrice: overrides.servicePrice ?? 490,
      serviceDuration: overrides.serviceDuration ?? 30,
      date: overrides.date,
      startTime: '10:00',
      endTime: '10:30',
      status: overrides.status,
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      statusHistory: [{ status: overrides.status, timestamp: new Date(), actor: 'system' }],
    });

    await AppointmentModel.create(makeAppointment({
      date: '2025-05-20', barberId: barber1Id, status: 'Confirmado', clientId: regId1,
    }));

    await AppointmentModel.create(makeAppointment({
      date: '2025-06-05', barberId: barber1Id, status: 'Completado', clientId: regId1,
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-05', barberId: barber2Id, status: 'Confirmado', clientId: regId2,
    }));

    await AppointmentModel.create(makeAppointment({
      date: '2025-06-10', barberId: barber1Id, status: 'Completado', servicePrice: 600, serviceDuration: 45, clientPhone: 'p1',
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-10', barberId: barber2Id, status: 'Cancelado', clientId: regId1,
    }));

    await AppointmentModel.create(makeAppointment({
      date: '2025-06-15', barberId: barber1Id, status: 'NoShow', clientId: regId3,
    }));

    await AppointmentModel.create(makeAppointment({
      date: '2025-06-20', barberId: barber2Id, status: 'Completado', clientPhone: 'p1',
    }));

    await AppointmentModel.create(makeAppointment({
      date: '2025-06-25', barberId: barber1Id, status: 'Confirmado', clientPhone: 'p2',
    }));

    await AppointmentModel.create(makeAppointment({
      date: '2025-07-05', barberId: barber1Id, status: 'Completado', clientId: regId1,
    }));

    // Clientes registrados/anónimos con fecha de alta embebida en el _id
    await RegisteredClient.create({
      _id: oidAt('2025-05-20T10:00:00Z'),
      name: 'Ana', lastname: 'Vieja', email: 'ana@test.com', password: 'hash',
    });
    await RegisteredClient.create({
      _id: oidAt('2025-06-05T10:00:00Z'),
      name: 'Juan', lastname: 'Perez', email: 'juan@test.com', password: 'hash',
      photoUrl: 'https://example.com/juan.jpg',
    });
    await UnregisteredClient.create({
      _id: oidAt('2025-06-10T12:00:00Z'),
      name: 'Luis', lastname: 'Gomez', phone: 'p1',
    });
    await UnregisteredClient.create({
      _id: oidAt('2025-06-30T15:00:00Z'),
      name: 'Marta', lastname: 'Diaz', phone: 'p2',
    });
    await RegisteredClient.create({
      _id: oidAt('2025-07-02T09:00:00Z'),
      name: 'Pia', lastname: 'Futura', email: 'pia@test.com', password: 'hash',
    });
  });

  describe('getOverview', () => {
    it('calcula totales y métricas dentro del rango de fechas', async () => {
      const result = await repository.getOverview(DESDE, HASTA);

      expect(result.totalReservas).toBe(7);
      expect(result.duracionTotalMinutos).toBe(165);
      expect(result.ingresosTotales).toBe(1580);
      expect(result.nuevosClientes).toBe(3);
      expect(result.estadisticasPorEstado).toEqual({
        confirmado: 2,
        completado: 3,
        cancelado: 1,
        noshow: 1,
      });
    });

    it('devuelve ceros para rango sin datos', async () => {
      const result = await repository.getOverview('2030-01-01', '2030-01-31');

      expect(result.totalReservas).toBe(0);
      expect(result.duracionTotalMinutos).toBe(0);
      expect(result.ingresosTotales).toBe(0);
      expect(result.nuevosClientes).toBe(0);
      expect(result.estadisticasPorEstado).toEqual({
        confirmado: 0,
        completado: 0,
        cancelado: 0,
        noshow: 0,
      });
    });
  });

  describe('getHeatmap', () => {
    it('agrupa por fecha para el año solicitado', async () => {
      const result = await repository.getHeatmap({ year: 2025 });

      expect(result.length).toBe(7);
      expect(result[0]).toEqual({ fecha: '2025-05-20', cantidad: 1 });
      expect(result[1]).toEqual({ fecha: '2025-06-05', cantidad: 2 });
      expect(result[2]).toEqual({ fecha: '2025-06-10', cantidad: 2 });
      expect(result[3]).toEqual({ fecha: '2025-06-15', cantidad: 1 });
      expect(result[4]).toEqual({ fecha: '2025-06-20', cantidad: 1 });
      expect(result[5]).toEqual({ fecha: '2025-06-25', cantidad: 1 });
      expect(result[6]).toEqual({ fecha: '2025-07-05', cantidad: 1 });
    });

    it('devuelve array vacío para año sin datos', async () => {
      const result = await repository.getHeatmap({ year: 2020 });
      expect(result).toEqual([]);
    });
  });

  describe('getDistribucion', () => {
    it('agrupa por barbero con nombres desde el lookup', async () => {
      const result = await repository.getDistribucion(DESDE, HASTA);

      expect(result).toHaveLength(2);
      expect(result[0].nombre).toBe('Carlos Lopez');
      expect(result[0].cantidad).toBe(4);
      expect(result[0].ingresos).toBe(1090);
      expect(result[1].nombre).toBe('Pedro Garcia');
      expect(result[1].cantidad).toBe(3);
      expect(result[1].ingresos).toBe(490);
    });

    it('devuelve array vacío para rango sin datos', async () => {
      const result = await repository.getDistribucion('2030-01-01', '2030-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('getReservasGanancias', () => {
    it('agrupa por día con granularidad diaria', async () => {
      const result = await repository.getReservasGanancias({
        desde: DESDE,
        hasta: HASTA,
        granularidad: 'diario',
      });

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ periodo: '2025-06-05', cantidadReservas: 2, ganancias: 490 });
      expect(result[1]).toEqual({ periodo: '2025-06-10', cantidadReservas: 2, ganancias: 600 });
      expect(result[2]).toEqual({ periodo: '2025-06-15', cantidadReservas: 1, ganancias: 0 });
      expect(result[3]).toEqual({ periodo: '2025-06-20', cantidadReservas: 1, ganancias: 490 });
      expect(result[4]).toEqual({ periodo: '2025-06-25', cantidadReservas: 1, ganancias: 0 });
    });

    it('agrupa por mes con granularidad mensual', async () => {
      const result = await repository.getReservasGanancias({
        desde: DESDE,
        hasta: HASTA,
        granularidad: 'mensual',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ periodo: '2025-06', cantidadReservas: 7, ganancias: 1580 });
    });

    it('filtra por status en lowercase', async () => {
      const result = await repository.getReservasGanancias({
        desde: DESDE,
        hasta: HASTA,
        granularidad: 'diario',
        status: 'completado',
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ periodo: '2025-06-05', cantidadReservas: 1, ganancias: 490 });
      expect(result[1]).toEqual({ periodo: '2025-06-10', cantidadReservas: 1, ganancias: 600 });
      expect(result[2]).toEqual({ periodo: '2025-06-20', cantidadReservas: 1, ganancias: 490 });
    });

    it('filtra por barberId', async () => {
      const result = await repository.getReservasGanancias({
        desde: DESDE,
        hasta: HASTA,
        granularidad: 'diario',
        barberId: barber1Id.toString(),
      });

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ periodo: '2025-06-05', cantidadReservas: 1, ganancias: 490 });
      expect(result[1]).toEqual({ periodo: '2025-06-10', cantidadReservas: 1, ganancias: 600 });
      expect(result[2]).toEqual({ periodo: '2025-06-15', cantidadReservas: 1, ganancias: 0 });
      expect(result[3]).toEqual({ periodo: '2025-06-25', cantidadReservas: 1, ganancias: 0 });
    });

    it('devuelve array vacío para rango sin datos', async () => {
      const result = await repository.getReservasGanancias({
        desde: '2030-01-01',
        hasta: '2030-01-31',
        granularidad: 'diario',
      });

      expect(result).toEqual([]);
    });
  });

  describe('getHorasDistribution', () => {
    it('agrupa por hora extrayendo los 2 primeros caracteres de startTime', async () => {
      const result = await repository.getHorasDistribution(DESDE, HASTA);

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ hora: 10, cantidad: 7 });
    });

    it('filtra por barberId', async () => {
      const result = await repository.getHorasDistribution(DESDE, HASTA, barber1Id.toString());

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({ hora: 10, cantidad: 4 });
    });

    it('devuelve array vacío para rango sin datos', async () => {
      const result = await repository.getHorasDistribution('2030-01-01', '2030-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('getDiasSemanaDistribution', () => {
    it('agrupa por día de la semana con nombre en español (solo días con datos)', async () => {
      const result = await repository.getDiasSemanaDistribution(DESDE, HASTA);

      expect(result.length).toBe(5);
      const jueves = result.find(r => r.diaNombre === 'Jueves');
      expect(jueves).toBeDefined();
      expect(jueves!.cantidad).toBe(2);
      const martes = result.find(r => r.diaNombre === 'Martes');
      expect(martes).toBeDefined();
      expect(martes!.cantidad).toBe(2);
    });

    it('filtra por barberId', async () => {
      const result = await repository.getDiasSemanaDistribution(DESDE, HASTA, barber1Id.toString());

      expect(result.length).toBe(4);
      const jueves = result.find(r => r.diaNombre === 'Jueves');
      expect(jueves!.cantidad).toBe(1);
    });

    it('devuelve array vacío para rango sin datos', async () => {
      const result = await repository.getDiasSemanaDistribution('2030-01-01', '2030-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('getClientesRecurrentes', () => {
    it('calcula tasa de retorno con clientes que tienen 2+ visitas', async () => {
      const result = await repository.getClientesRecurrentes(DESDE, HASTA);

      expect(result.totalClientes).toBe(5);
      expect(result.recurrentes).toBe(2);
      expect(result.tasaRetorno).toBe(40);
      expect(result.nuevos).toBe(5);
    });

    it('devuelve ceros para rango sin datos', async () => {
      const result = await repository.getClientesRecurrentes('2030-01-01', '2030-01-31');

      expect(result.totalClientes).toBe(0);
      expect(result.recurrentes).toBe(0);
      expect(result.tasaRetorno).toBe(0);
      expect(result.nuevos).toBe(0);
    });
  });

  describe('getClientesList', () => {
    it('lista todos los clientes dados de alta hasta el fin del rango, con estadísticas del período', async () => {
      const result = await repository.getClientesList(DESDE, HASTA);

      // Pia (alta 2025-07-02) queda fuera; los demás aparecen aunque no tengan turnos
      expect(result).toHaveLength(4);

      expect(result[0]).toMatchObject({
        clientName: 'Marta', kind: 'NoRegistrado', totalVisits: 1, totalSpent: 0,
        firstVisit: '2025-06-25', lastVisit: '2025-06-25',
      });
      expect(result[0].key.startsWith('anon_')).toBe(true);

      expect(result[1]).toMatchObject({
        clientName: 'Luis', kind: 'NoRegistrado', totalVisits: 2, totalSpent: 1090,
        firstVisit: '2025-06-10', lastVisit: '2025-06-20',
      });

      // Registrados sin turnos: aparecen con 0 actividad
      expect(result[2]).toMatchObject({
        clientName: 'Juan', kind: 'Registrado', totalVisits: 0, totalSpent: 0,
        firstVisit: null, lastVisit: null,
      });
      expect(result[2].key.startsWith('reg_')).toBe(true);
      expect(result[3]).toMatchObject({ clientName: 'Ana', kind: 'Registrado', totalVisits: 0 });
    });

    it('incluye clientPhotoUrl cuando el cliente tiene foto, y null cuando no', async () => {
      const result = await repository.getClientesList(DESDE, HASTA);

      const juan = result.find((c) => c.clientName === 'Juan');
      const ana = result.find((c) => c.clientName === 'Ana');
      expect(juan?.clientPhotoUrl).toBe('https://example.com/juan.jpg');
      expect(ana?.clientPhotoUrl).toBeNull();
    });

    it('no incluye actividad fuera del rango en las estadísticas', async () => {
      const result = await repository.getClientesList('2025-06-01', '2025-06-15');

      const luis = result.find(c => c.clientName === 'Luis');
      expect(luis).toMatchObject({ totalVisits: 1, totalSpent: 600, lastVisit: '2025-06-10' });
    });
  });

  describe('getClientAppointments', () => {
    it('resuelve la clave anon_<id> trayendo turnos legacy vinculados por teléfono', async () => {
      const luis = await Client.findOne({ phone: 'p1' });
      const result = await repository.getClientAppointments(`anon_${luis!._id}`);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-06-20');
      expect(result[1].date).toBe('2025-06-10');
    });

    it('mantiene compatibilidad con la clave legacy anon_<telefono>', async () => {
      const result = await repository.getClientAppointments('anon_p1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getNuevosClientes', () => {
    it('lista clientes dados de alta en el rango, ordenados por fecha descendente', async () => {
      const result = await repository.getNuevosClientes(DESDE, HASTA);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ name: 'Marta', lastname: 'Diaz', phone: 'p2', kind: 'NoRegistrado' });
      expect(result[1]).toMatchObject({ name: 'Luis', lastname: 'Gomez', phone: 'p1', kind: 'NoRegistrado' });
      expect(result[2]).toMatchObject({ name: 'Juan', lastname: 'Perez', email: 'juan@test.com', kind: 'Registrado' });
    });

    it('incluye altas del último día del rango (fin de día)', async () => {
      const result = await repository.getNuevosClientes(DESDE, '2025-06-30');

      expect(result.some(c => c.name === 'Marta')).toBe(true);
    });

    it('devuelve array vacío para rango sin altas', async () => {
      const result = await repository.getNuevosClientes('2030-01-01', '2030-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('getIngresosPorServicio', () => {
    it('agrupa ingresos por serviceName ordenado descendente', async () => {
      const result = await repository.getIngresosPorServicio(DESDE, HASTA);

      expect(result.length).toBe(1);
      expect(result[0].serviceName).toBe('Corte');
      expect(result[0].cantidad).toBe(7);
      expect(result[0].ingresos).toBe(1580);
    });

    it('devuelve array vacío para rango sin datos', async () => {
      const result = await repository.getIngresosPorServicio('2030-01-01', '2030-01-31');
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableYears', () => {
    it('devuelve años únicos ordenados descendentemente', async () => {
      const result = await repository.getAvailableYears();

      expect(result).toEqual([2025]);
    });

    it('devuelve varios años ordenados descendentemente', async () => {
      await AppointmentModel.create({
        barberId: barber1Id,
        clientName: 'Test',
        clientLastname: 'Test',
        clientPhone: '099999999',
        serviceId: 'svc-1',
        serviceName: 'Corte',
        servicePrice: 490,
        serviceDuration: 30,
        date: '2026-03-15',
        startTime: '10:00',
        endTime: '10:30',
        status: 'Completado',
        paymentStatus: 'Pagado',
        paymentMethod: 'local',
        statusHistory: [{ status: 'Completado', timestamp: new Date(), actor: 'system' }],
      });

      const result = await repository.getAvailableYears();

      expect(result).toEqual([2026, 2025]);
    });

    it('no incluye años sin datos', async () => {
      const result = await repository.getAvailableYears();

      expect(result).not.toContain(2024);
      expect(result).not.toContain(2030);
    });
  });
});
