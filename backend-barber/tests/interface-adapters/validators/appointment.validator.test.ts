import mongoose from 'mongoose';
import { createAppointmentSchema } from '../../../src/interface-adapters/validators/appointment.validator';

const validPayload = {
  barberId: 'barber-1',
  serviceId: new mongoose.Types.ObjectId().toString(),
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

  describe('startTime', () => {
    it.each([
      '00:00',
      '09:30',
      '23:59',
    ])('debe aceptar hora valida %s', (time) => {
      const { error } = createAppointmentSchema.validate({
        ...validPayload,
        startTime: time,
      });
      expect(error).toBeUndefined();
    });

    it.each([
      ['24:00', 'hora > 23'],
      ['12:60', 'minutos > 59'],
      ['9:30', 'sin cero inicial'],
      ['1:5', 'formato corto'],
      ['abc', 'no numerico'],
      ['99:99', 'todo invalido'],
      ['', 'vacio'],
    ])('debe rechazar hora invalida %s (%s)', (time) => {
      const { error } = createAppointmentSchema.validate({
        ...validPayload,
        startTime: time,
      });
      expect(error).toBeDefined();
    });
  });
});
