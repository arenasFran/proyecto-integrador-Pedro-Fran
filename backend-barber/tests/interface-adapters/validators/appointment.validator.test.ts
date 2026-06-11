import { createAppointmentSchema } from '../../../src/interface-adapters/validators/appointment.validator';

const validPayload = {
  barberId: 'barber-1',
  serviceId: 'svc-1',
  date: '2099-01-01',
  startTime: '10:00',
  clientName: 'Juan',
  clientLastname: 'Perez',
  clientEmail: 'juan@test.com',
};

describe('createAppointmentSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = createAppointmentSchema.validate(validPayload);
    expect(error).toBeUndefined();
  });

  it('debe rechazar email malformado', () => {
    const { error } = createAppointmentSchema.validate({
      ...validPayload,
      clientEmail: 'no-es-un-email',
    });
    expect(error).toBeDefined();
  });

  it('debe rechazar email vacio', () => {
    const { error } = createAppointmentSchema.validate({
      ...validPayload,
      clientEmail: '',
    });
    expect(error).toBeDefined();
  });

  it('debe rechazar email sin TLD', () => {
    const { error } = createAppointmentSchema.validate({
      ...validPayload,
      clientEmail: 'user@dominio',
    });
    expect(error).toBeDefined();
  });

  it('debe rechazar email sin parte local', () => {
    const { error } = createAppointmentSchema.validate({
      ...validPayload,
      clientEmail: '@dominio.com',
    });
    expect(error).toBeDefined();
  });

  it('debe rechazar email con dominio empezando con punto', () => {
    const { error } = createAppointmentSchema.validate({
      ...validPayload,
      clientEmail: 'user@.com',
    });
    expect(error).toBeDefined();
  });

  it('debe rechazar clientName vacio', () => {
    const { error } = createAppointmentSchema.validate({
      ...validPayload,
      clientName: '',
    });
    expect(error).toBeDefined();
  });

  it('debe rechazar clientName ausente', () => {
    const { clientName, ...payload } = validPayload;
    const { error } = createAppointmentSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar clientEmail ausente', () => {
    const { clientEmail, ...payload } = validPayload;
    const { error } = createAppointmentSchema.validate(payload);
    expect(error).toBeDefined();
  });
});
