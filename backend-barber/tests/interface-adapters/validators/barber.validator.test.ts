import {
  createBarberSchema,
  updateBarberSchema,
  barberIdParamSchema,
  slotsQuerySchema,
  scheduleSchema,
} from '../../../src/interface-adapters/validators/barber.validator';

const validSchedule = {
  monday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  tuesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  wednesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  thursday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  friday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  saturday: { startTime: '10:00', endTime: '14:00', breaks: [] },
  sunday: { startTime: null, endTime: null, breaks: [] },
};

const validCreateBarber = {
  email: 'barber@example.com',
  password: 'pass123',
  name: 'Carlos',
  lastname: 'Lopez',
  phone: '1234567890',
  services: ['Corte', 'Barba'],
  age: 30,
  photoUrl: 'https://example.com/photo.jpg',
  slotDuration: 30,
  maxAdvanceDays: 30,
  schedule: validSchedule,
};

const validUpdateBarber = {
  name: 'Carlos Updated',
  phone: '0987654321',
};

describe('scheduleSchema', () => {
  it('debe aceptar un schedule valido con dia libre (start/end null)', () => {
    const { error } = scheduleSchema.validate(validSchedule);
    expect(error).toBeUndefined();
  });

  it('debe aceptar un schedule con breaks', () => {
    const payload = {
      ...validSchedule,
      monday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
    };
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it('debe rechazar si startTime y endTime no estan ambos definidos', () => {
    const payload = {
      ...validSchedule,
      monday: { startTime: '09:00', endTime: null, breaks: [] },
    };
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar si startTime es mayor o igual a endTime', () => {
    const payload = {
      ...validSchedule,
      monday: { startTime: '18:00', endTime: '09:00', breaks: [] },
    };
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar un dia que falta', () => {
    const { monday, ...payload } = validSchedule;
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar break con startTime >= endTime', () => {
    const payload = {
      ...validSchedule,
      monday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '14:00', endTime: '13:00' }] },
    };
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar time malformado en startTime', () => {
    const payload = {
      ...validSchedule,
      monday: { startTime: '25:00', endTime: '18:00', breaks: [] },
    };
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar time malformado en endTime', () => {
    const payload = {
      ...validSchedule,
      monday: { startTime: '09:00', endTime: '9:00', breaks: [] },
    };
    const { error } = scheduleSchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('createBarberSchema', () => {
  it('debe aceptar un payload valido con todos los campos', () => {
    const { error } = createBarberSchema.validate(validCreateBarber);
    expect(error).toBeUndefined();
  });

  it('debe aceptar sin servicios, age, photoUrl (opcionales)', () => {
    const { services, age, photoUrl, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it('debe aceptar con valores por defecto (slotDuration, maxAdvanceDays)', () => {
    const { slotDuration, maxAdvanceDays, ...payload } = validCreateBarber;
    const { value } = createBarberSchema.validate(payload);
    expect(value.slotDuration).toBe(30);
    expect(value.maxAdvanceDays).toBe(30);
  });

  it('debe rechazar email invalido', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { email, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar password menor a 6 caracteres', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, password: '12345' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password ausente', () => {
    const { password, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar name menor a 3 caracteres', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, name: 'Ca' });
    expect(error).toBeDefined();
  });

  it('debe rechazar name ausente', () => {
    const { name, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar lastname menor a 3 caracteres', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, lastname: 'Lo' });
    expect(error).toBeDefined();
  });

  it('debe rechazar lastname ausente', () => {
    const { lastname, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar phone ausente', () => {
    const { phone, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar age negativo', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, age: -1 });
    expect(error).toBeDefined();
  });

  it('debe rechazar age no entero', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, age: 30.5 });
    expect(error).toBeDefined();
  });

  it('debe rechazar photoUrl no valida', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, photoUrl: 'no-es-url' });
    expect(error).toBeDefined();
  });

  it('debe rechazar slotDuration menor a 1', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, slotDuration: 0 });
    expect(error).toBeDefined();
  });

  it('debe rechazar maxAdvanceDays menor a 1', () => {
    const { error } = createBarberSchema.validate({ ...validCreateBarber, maxAdvanceDays: 0 });
    expect(error).toBeDefined();
  });

  it('debe rechazar schedule ausente', () => {
    const { schedule, ...payload } = validCreateBarber;
    const { error } = createBarberSchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('updateBarberSchema', () => {
  it('debe aceptar un payload valido con campos parciales', () => {
    const { error } = updateBarberSchema.validate(validUpdateBarber);
    expect(error).toBeUndefined();
  });

  it('debe aceptar actualizar solo un campo', () => {
    const { error } = updateBarberSchema.validate({ phone: '111111' });
    expect(error).toBeUndefined();
  });

  it('debe aceptar actualizar email con formato valido', () => {
    const { error } = updateBarberSchema.validate({ email: 'nuevo@example.com' });
    expect(error).toBeUndefined();
  });

  it('debe rechazar payload vacio (min(1))', () => {
    const { error } = updateBarberSchema.validate({});
    expect(error).toBeDefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = updateBarberSchema.validate({ email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password menor a 6 caracteres', () => {
    const { error } = updateBarberSchema.validate({ password: '12345' });
    expect(error).toBeDefined();
  });

  it('debe rechazar name menor a 3 caracteres', () => {
    const { error } = updateBarberSchema.validate({ name: 'Ca' });
    expect(error).toBeDefined();
  });

  it('debe rechazar lastname menor a 3 caracteres', () => {
    const { error } = updateBarberSchema.validate({ lastname: 'Lo' });
    expect(error).toBeDefined();
  });

  it('debe aceptar age null', () => {
    const { error } = updateBarberSchema.validate({ age: null });
    expect(error).toBeUndefined();
  });

  it('debe rechazar age negativo', () => {
    const { error } = updateBarberSchema.validate({ age: -1 });
    expect(error).toBeDefined();
  });

  it('debe aceptar photoUrl null', () => {
    const { error } = updateBarberSchema.validate({ photoUrl: null });
    expect(error).toBeUndefined();
  });

  it('debe rechazar photoUrl no valida', () => {
    const { error } = updateBarberSchema.validate({ photoUrl: 'no-es-url' });
    expect(error).toBeDefined();
  });

  it('debe aceptar isActive booleano', () => {
    const { error } = updateBarberSchema.validate({ isActive: false });
    expect(error).toBeUndefined();
  });

  it('debe rechazar slotDuration menor a 1', () => {
    const { error } = updateBarberSchema.validate({ slotDuration: 0 });
    expect(error).toBeDefined();
  });

  it('debe rechazar maxAdvanceDays menor a 1', () => {
    const { error } = updateBarberSchema.validate({ maxAdvanceDays: 0 });
    expect(error).toBeDefined();
  });
});

describe('barberIdParamSchema', () => {
  it('debe aceptar un id valido', () => {
    const { error } = barberIdParamSchema.validate({ id: 'abc-123' });
    expect(error).toBeUndefined();
  });

  it('debe rechazar id ausente', () => {
    const { error } = barberIdParamSchema.validate({});
    expect(error).toBeDefined();
  });

  it('debe rechazar id vacio', () => {
    const { error } = barberIdParamSchema.validate({ id: '' });
    expect(error).toBeDefined();
  });
});

describe('slotsQuerySchema', () => {
  it('debe aceptar una fecha valida yyyy-mm-dd', () => {
    const { error } = slotsQuerySchema.validate({ date: '2026-06-15' });
    expect(error).toBeUndefined();
  });

  it('debe rechazar formato invalido', () => {
    const { error } = slotsQuerySchema.validate({ date: '15-06-2026' });
    expect(error).toBeDefined();
  });

  it('debe rechazar date ausente', () => {
    const { error } = slotsQuerySchema.validate({});
    expect(error).toBeDefined();
  });

  it('debe rechazar date vacio', () => {
    const { error } = slotsQuerySchema.validate({ date: '' });
    expect(error).toBeDefined();
  });
});
