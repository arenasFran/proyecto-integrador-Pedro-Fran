import { calendarAppointmentQuerySchema } from '../../../src/interface-adapters/validators/appointment.validator';

describe('calendarAppointmentQuerySchema', () => {
  it('acepta un rango válido', () => {
    const { error, value } = calendarAppointmentQuerySchema.validate({
      dateFrom: '2026-11-09',
      dateTo: '2026-11-22',
      includeBarber: 'true',
      includeClient: 'true',
    });

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      dateFrom: '2026-11-09',
      dateTo: '2026-11-22',
    });
  });

  it('exige dateFrom y dateTo', () => {
    expect(calendarAppointmentQuerySchema.validate({ dateTo: '2026-11-22' }).error).toBeDefined();
    expect(calendarAppointmentQuerySchema.validate({ dateFrom: '2026-11-09' }).error).toBeDefined();
  });

  it('rechaza dateTo anterior a dateFrom', () => {
    const { error } = calendarAppointmentQuerySchema.validate({
      dateFrom: '2026-11-22',
      dateTo: '2026-11-09',
    });

    expect(error?.message).toMatch(/dateTo no puede ser anterior a dateFrom/);
  });

  it('rechaza un rango mayor a 31 días', () => {
    const { error } = calendarAppointmentQuerySchema.validate({
      dateFrom: '2026-01-01',
      dateTo: '2026-02-15',
    });

    expect(error?.message).toMatch(/no puede superar los 31 días/);
  });

  it('acepta exactamente 31 días de diferencia', () => {
    const { error } = calendarAppointmentQuerySchema.validate({
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    });

    expect(error).toBeUndefined();
  });

  it('rechaza un barberId con formato inválido', () => {
    const { error } = calendarAppointmentQuerySchema.validate({
      dateFrom: '2026-11-09',
      dateTo: '2026-11-22',
      barberId: 'no-es-un-object-id',
    });

    expect(error).toBeDefined();
  });

  it('rechaza fechas con formato inválido', () => {
    const { error } = calendarAppointmentQuerySchema.validate({
      dateFrom: '09/11/2026',
      dateTo: '2026-11-22',
    });

    expect(error).toBeDefined();
  });
});
