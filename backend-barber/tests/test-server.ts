import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildAuthRouter } from '../src/wiring/auth';

const PORT = Number(process.env.TEST_PORT || 3000);

let server: ReturnType<typeof appListen> | null = null;
let mongoServer: MongoMemoryServer | null = null;

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use('/auth', buildAuthRouter());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

function appListen(port: number) {
  return app.listen(port, () => {
    console.log(`Test server running on port ${port}`);
  });
}

const start = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  process.env.RESET_TOKEN_EXPIRATION_MIN = process.env.RESET_TOKEN_EXPIRATION_MIN || '60';
  process.env.TEST_2FA_CODE = process.env.TEST_2FA_CODE || '123456';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);

  server = appListen(PORT);
};

const stop = async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

start().catch((error) => {
  console.error('Error starting test server:', error);
  stop().finally(() => process.exit(1));
});

process.on('SIGINT', () => {
  stop().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  stop().finally(() => process.exit(0));
});

export { start, stop };
