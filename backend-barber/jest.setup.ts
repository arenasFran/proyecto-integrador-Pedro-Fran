import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;
let mongoReady = false;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  process.env.RESET_TOKEN_EXPIRATION_MIN =
    process.env.RESET_TOKEN_EXPIRATION_MIN || '60';

  const externalUri = process.env.MONGO_URI;

  try {
    if (externalUri) {
      await mongoose.connect(externalUri);
      mongoReady = true;
    } else {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      process.env.MONGO_URI = uri;
      await mongoose.connect(uri);
      mongoReady = true;
    }
  } catch (error) {
    mongoReady = false;
    console.warn('Mongo no disponible, se omiten tests de integracion.', error);
  }

  (global as any).__MONGO_READY__ = mongoReady;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  if (!mongoReady || mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
