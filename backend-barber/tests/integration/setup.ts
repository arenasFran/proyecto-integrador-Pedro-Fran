import 'dotenv/config';

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.JWT_PARTIAL_SECRET = process.env.JWT_PARTIAL_SECRET || 'test-partial-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.RESET_TOKEN_EXPIRATION_MIN = process.env.RESET_TOKEN_EXPIRATION_MIN || '60';
process.env.TELEGRAM_TOKEN_ENC_KEY = process.env.TELEGRAM_TOKEN_ENC_KEY || 'a'.repeat(64);
process.env.REFRESH_HASH_SECRET = process.env.REFRESH_HASH_SECRET || 'test-refresh-hash-secret';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test-api-key';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test-api-secret';
process.env.RATE_LIMIT_APPOINTMENT_CREATE_MAX = process.env.RATE_LIMIT_APPOINTMENT_CREATE_MAX || '1000';
process.env.RATE_LIMIT_API_MAX = process.env.RATE_LIMIT_API_MAX || '10000';
process.env.RATE_LIMIT_ORDER_MAX = process.env.RATE_LIMIT_ORDER_MAX || '10000';
process.env.RATE_LIMIT_CART_MAX = process.env.RATE_LIMIT_CART_MAX || '10000';
process.env.RATE_LIMIT_UPLOAD_MAX = process.env.RATE_LIMIT_UPLOAD_MAX || '10000';

import mongoose from 'mongoose';

const clearAllCollections = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

beforeAll(async () => {
  const uri = process.env.INTEGRATION_MONGO_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('INTEGRATION_MONGO_URI no definida — el global-setup debe levantar mongodb-memory-server.');
  }
  if (uri.includes('mongodb.net') || uri.includes('mongodb+srv://')) {
    throw new Error(`Refusando conectarse a un cluster real: ${uri}`);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(async () => {
  await clearAllCollections();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
