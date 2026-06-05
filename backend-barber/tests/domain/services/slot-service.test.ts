import { SlotService } from '../../../src/domain/services/SlotService';
import { BarberSchedule } from '../../../src/domain/entities/Barber';

const createScheduleDay = (overrides?: Partial<BarberSchedule['monday']>) => ({
  startTime: '09:00',
  endTime: '18:00',
  breaks: [],
  ...overrides,
});

const createSchedule = (dayOverrides?: Partial<BarberSchedule['monday']>): BarberSchedule => ({
  monday: createScheduleDay(dayOverrides),
  tuesday: createScheduleDay(dayOverrides),
  wednesday: createScheduleDay(dayOverrides),
  thursday: createScheduleDay(dayOverrides),
  friday: createScheduleDay(dayOverrides),
  saturday: createScheduleDay(dayOverrides),
  sunday: createScheduleDay(dayOverrides),
});

describe('SlotService', () => {
  let service: SlotService;

  beforeEach(() => {
    service = new SlotService();
  });

  describe('isValidDate', () => {
    it('debe aceptar formato YYYY-MM-DD', () => {
      expect(service.isValidDate('2026-06-15')).toBe(true);
    });

    it('debe rechazar formato invalido', () => {
      expect(service.isValidDate('2024/01/01')).toBe(false);
      expect(service.isValidDate('01-01-2024')).toBe(false);
      expect(service.isValidDate('not-a-date')).toBe(false);
    });
  });

  describe('execute', () => {
    it('debe devolver slots segun el horario', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const result = service.execute('2099-01-05', schedule, 30);

      expect(result.slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('debe excluir slots en breaks', () => {
      const schedule = createSchedule({
        startTime: '09:00',
        endTime: '11:00',
        breaks: [{ startTime: '10:00', endTime: '10:30' }],
      });
      const result = service.execute('2099-01-05', schedule, 30);

      expect(result.slots).toEqual(['09:00', '09:30', '10:30']);
    });

    it('debe respetar slotDuration configurable', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const result = service.execute('2099-01-05', schedule, 60);

      expect(result.slots).toEqual(['09:00', '10:00']);
    });

    it('debe devolver array vacio si no hay horario', () => {
      const schedule = createSchedule({ startTime: null, endTime: null });
      const result = service.execute('2099-01-05', schedule, 30);

      expect(result.slots).toEqual([]);
    });

    it('debe devolver array vacio si startTime >= endTime', () => {
      const schedule = createSchedule({ startTime: '12:00', endTime: '09:00' });
      const result = service.execute('2099-01-05', schedule, 30);

      expect(result.slots).toEqual([]);
    });

    it('debe usar slotDuration por defecto si el valor es invalido', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '10:00' });
      const result = service.execute('2099-01-05', schedule, 0);

      expect(result.slots).toEqual(['09:00', '09:30']);
    });

    it('debe excluir breaks mal formados', () => {
      const schedule = createSchedule({
        startTime: '09:00',
        endTime: '11:00',
        breaks: [
          { startTime: '10:00', endTime: '10:30' },
          { startTime: '', endTime: '' },
        ],
      });
      const result = service.execute('2099-01-05', schedule, 30);

      expect(result.slots).toEqual(['09:00', '09:30', '10:30']);
    });

    it('debe incluir la fecha en el resultado', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '10:00' });
      const result = service.execute('2099-06-15', schedule, 30);

      expect(result.date).toBe('2099-06-15');
    });

    it('debe excluir slots ocupados por turnos no cancelados', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const occupiedSlots = [
        { startTime: '09:30', endTime: '10:00', status: 'Pendiente' },
        { startTime: '10:00', endTime: '10:30', status: 'Confirmado' },
      ];
      const result = service.execute('2099-01-05', schedule, 30, occupiedSlots);

      expect(result.slots).toEqual(['09:00', '10:30']);
    });

    it('debe ignorar turnos cancelados al filtrar slots ocupados', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const occupiedSlots = [
        { startTime: '09:30', endTime: '10:00', status: 'Cancelado' },
      ];
      const result = service.execute('2099-01-05', schedule, 30, occupiedSlots);

      expect(result.slots).toContain('09:30');
    });

    it('debe filtrar slots por duracion del servicio existente', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const occupiedSlots = [
        { startTime: '09:00', endTime: '09:50', status: 'Pendiente' },
      ];
      const result = service.execute('2099-01-05', schedule, 30, occupiedSlots);

      expect(result.slots).not.toContain('09:00');
      expect(result.slots).not.toContain('09:30');
      expect(result.slots).toContain('10:00');
    });

    it('debe devolver slots sin cambios si no se pasan occupiedSlots', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const result = service.execute('2099-01-05', schedule, 30);

      expect(result.slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('debe devolver slots sin cambios si occupiedSlots esta vacio', () => {
      const schedule = createSchedule({ startTime: '09:00', endTime: '11:00' });
      const result = service.execute('2099-01-05', schedule, 30, []);

      expect(result.slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });
  });
});
