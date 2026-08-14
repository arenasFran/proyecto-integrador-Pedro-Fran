module.exports = async () => {
  // Cada worker levanta su propia mongodb-memory-server en jest.setup.ts.
  // Nunca se usa el MONGO_URI de .env para tests, así que la disponibilidad
  // no depende de ningún servidor externo.
  if (process.env.MONGO_READY !== 'false') {
    process.env.MONGO_READY = 'true';
  }
};
