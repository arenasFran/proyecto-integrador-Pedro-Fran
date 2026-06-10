import 'dotenv/config';
import { loadConfig } from '../src/infrastructure/config/env';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.RESET_TOKEN_EXPIRATION_MIN = process.env.RESET_TOKEN_EXPIRATION_MIN || '60';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

loadConfig();

import cors from 'cors';
import express from 'express';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Admin } from '../src/infrastructure/repositories/mongodb/models/barber.model';
import { FakeEmailService } from '../src/infrastructure/services/FakeEmailService';
import { buildAuthRouter } from '../src/wiring/auth';
import { buildBarberRouter } from '../src/wiring/barber';

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
app.use('/auth', buildAuthRouter({ emailService: new FakeEmailService() }));
app.use('/api/barbers', buildBarberRouter());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/__test/two-factor-code', (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ error: 'Email query param required' });
  }
  const code = FakeEmailService.getCode(email);
  if (!code) {
    return res.status(404).json({ error: 'Code not found for email', email });
  }
  res.json({ code });
});

function appListen(port: number) {
  return app.listen(port, () => {
    console.log(`Test server running on port ${port}`);
  });
}

const start = async () => {
  process.env.TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
  process.env.TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';
  process.env.TEST_ADMIN_NAME = process.env.TEST_ADMIN_NAME || 'Admin';
  process.env.TEST_ADMIN_LASTNAME = process.env.TEST_ADMIN_LASTNAME || 'Barber';
  process.env.TEST_ADMIN_PHONE = process.env.TEST_ADMIN_PHONE || '099000000';

  const externalUri = process.env.MONGO_URI;

 if (externalUri) {
    await mongoose.connect(externalUri, { dbName: 'backend-barber-test' });
  } else {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri);
  }

  const passwordHash = await bcrypt.hash(process.env.TEST_ADMIN_PASSWORD, 10);
  await Admin.deleteMany({
    $or: [
      { email: process.env.TEST_ADMIN_EMAIL },
      { phone: process.env.TEST_ADMIN_PHONE },
    ],
  });
  const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
  await Admin.create({
    email: process.env.TEST_ADMIN_EMAIL,
    password: passwordHash,
    name: process.env.TEST_ADMIN_NAME,
    lastname: process.env.TEST_ADMIN_LASTNAME,
    phone: process.env.TEST_ADMIN_PHONE,
    slotDuration: 30,
    schedule: {
      monday: createEmptyDay(),
      tuesday: createEmptyDay(),
      wednesday: createEmptyDay(),
      thursday: createEmptyDay(),
      friday: createEmptyDay(),
      saturday: createEmptyDay(),
      sunday: createEmptyDay(),
    },
  });

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
