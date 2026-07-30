import 'dotenv/config';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret!';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.RESET_TOKEN_EXPIRATION_MIN = process.env.RESET_TOKEN_EXPIRATION_MIN || '60';
// mongodb-memory-server descarga el binario 5.0.x por default, que en distros
// recientes (sin libssl1.1, ej. Arch/CachyOS) no arranca. 7.0.x no depende de esa lib.
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.14';

import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongoServer: MongoMemoryReplSet | null = null;
let mongoReady = false;

const clearAllCollections = async () => {
  if (!mongoReady || mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

// Los tests SIEMPRE corren contra una base en memoria, nunca contra el MONGO_URI
// real de .env: un cluster de desarrollo compartido no es un entorno de test
// descartable, y clearAllCollections() borraría sus datos después de cada test.
// Usa un replica set (no server standalone) porque varios use-cases corren
// transacciones Mongo (session.startTransaction()), que requieren replica set.
beforeAll(async () => {
  if (process.env.MONGO_READY === 'false') {
    mongoReady = false;
    return;
  }

  try {
    mongoServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri);
    // mongoose crea los índices (incluidos los unique) en segundo plano al conectar,
    // sin esperar esa promesa: sin este await, un test puede insertar un duplicado
    // antes de que el índice único termine de construirse y no ver el error esperado.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    mongoReady = true;
  } catch (error) {
    mongoReady = false;
    console.warn('Mongo en memoria no disponible, se omiten tests de integracion.', error);
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(clearAllCollections);

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
