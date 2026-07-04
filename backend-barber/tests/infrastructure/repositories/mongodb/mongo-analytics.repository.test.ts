import mongoose from 'mongoose';
import { MongoAnalyticsRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoAnalyticsRepository';
import { Barber } from '../../../../src/infrastructure/repositories/mongodb/models/barber.model';
import AppointmentModel from '../../../../src/infrastructure/repositories/mongodb/models/appointment.model';

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
  });

  describe('getOverview', () => {
    it('calcula totales y métricas dentro del rango de fechas', async () => {
      const result = await repository.getOverview(DESDE, HASTA);

      expect(result.totalReservas).toBe(7);
      expect(result.duracionTotalMinutos).toBe(165);
      expect(result.ingresosTotales).toBe(1580);
      expect(result.nuevosClientes).toBe(4);
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
