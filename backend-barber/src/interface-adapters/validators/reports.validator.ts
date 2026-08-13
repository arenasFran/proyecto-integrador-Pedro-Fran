import Joi from 'joi';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const rangeSchema = Joi.object({
  desde: Joi.string().pattern(ISO_DATE),
  hasta: Joi.string().pattern(ISO_DATE),
  status: Joi.string().trim().max(30),
}).custom((value, helpers) => {
  if (value.desde && value.hasta && value.desde > value.hasta) {
    return helpers.message({ custom: '"desde" no puede ser posterior a "hasta".' });
  }
  return value;
});

export const ordersReportQuerySchema = rangeSchema;
export const salesReportQuerySchema = rangeSchema.options({ allowUnknown: false }).fork(['status'], (schema) => schema.forbidden());
export const membershipsReportQuerySchema = rangeSchema;
