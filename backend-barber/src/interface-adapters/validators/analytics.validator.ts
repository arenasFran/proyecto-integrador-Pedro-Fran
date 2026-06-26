import Joi from 'joi';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const overviewQuerySchema = Joi.object({
  preset: Joi.string().valid('hoy', 'ayer', 'semana', 'mes', 'anio'),
  desde: Joi.string().pattern(ISO_DATE),
  hasta: Joi.string().pattern(ISO_DATE),
}).custom((value, helpers) => {
  if (!value.preset && (!value.desde || !value.hasta)) {
    return helpers.message({ custom: 'Debe proporcionar preset o desde/hasta.' });
  }
  if (value.preset && (value.desde || value.hasta)) {
    return helpers.message({ custom: 'No combine preset con desde/hasta.' });
  }
  if (value.desde && value.hasta && value.desde > value.hasta) {
    return helpers.message({ custom: '"desde" no puede ser posterior a "hasta".' });
  }
  if (value.desde && value.hasta) {
    const diffMs = new Date(value.hasta).getTime() - new Date(value.desde).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 731) {
      return helpers.message({ custom: 'El rango máximo permitido es de 2 años.' });
    }
  }
  return value;
});

export const distribucionQuerySchema = Joi.object({
  desde: Joi.string().pattern(ISO_DATE).required(),
  hasta: Joi.string().pattern(ISO_DATE).required(),
}).custom((value, helpers) => {
  if (value.desde > value.hasta) {
    return helpers.message({ custom: '"desde" no puede ser posterior a "hasta".' });
  }
  const diffMs = new Date(value.hasta).getTime() - new Date(value.desde).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 731) {
    return helpers.message({ custom: 'El rango máximo permitido es de 2 años.' });
  }
  return value;
});

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

export const reservasGananciasQuerySchema = Joi.object({
  desde: Joi.string().pattern(ISO_DATE).required(),
  hasta: Joi.string().pattern(ISO_DATE).required(),
  granularidad: Joi.string().valid('diario', 'semanal', 'mensual', 'anual').default('diario'),
  barberId: Joi.string().pattern(OBJECT_ID),
  serviceId: Joi.string(),
  status: Joi.string(),
}).custom((value, helpers) => {
  if (value.desde > value.hasta) {
    return helpers.message({ custom: '"desde" no puede ser posterior a "hasta".' });
  }
  const diffMs = new Date(value.hasta).getTime() - new Date(value.desde).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 731) {
    return helpers.message({ custom: 'El rango máximo permitido es de 2 años.' });
  }
  return value;
});

const CURRENT_YEAR = new Date().getFullYear();

export const heatmapQuerySchema = Joi.object({
  anio: Joi.number().integer().min(2020).max(CURRENT_YEAR + 1),
  ultimoAnio: Joi.boolean(),
}).custom((value, helpers) => {
  if (!value.ultimoAnio && !value.anio) {
    return helpers.message({ custom: 'Debe proporcionar "anio" o "ultimoAnio".' });
  }
  if (value.ultimoAnio && value.anio) {
    return helpers.message({ custom: 'No combine "anio" con "ultimoAnio".' });
  }
  return value;
});
