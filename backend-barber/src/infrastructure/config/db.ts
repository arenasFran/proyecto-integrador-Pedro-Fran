import mongoose from 'mongoose';
import { getConfig } from './env';

export const connectDB = async () => {
  try {
    const config = getConfig();
    const conn = await mongoose.connect(config.mongoUri);

    console.log(`Mongo conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error conectando a Mongo:', error);
    process.exit(1);
  }
};
