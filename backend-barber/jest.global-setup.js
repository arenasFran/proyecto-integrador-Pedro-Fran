require('dotenv/config');
const mongoose = require('mongoose');

module.exports = async () => {
  const externalUri = process.env.MONGO_URI;

  if (!externalUri) {
    // Assume mongodb-memory-server will be used by the per-worker setup.
    process.env.MONGO_READY = 'true';
    return;
  }

  try {
    await mongoose.connect(externalUri);
    process.env.MONGO_READY = 'true';
  } catch (error) {
    process.env.MONGO_READY = 'false';
    console.warn('Mongo no disponible en globalSetup, se omiten tests de integracion.', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};
