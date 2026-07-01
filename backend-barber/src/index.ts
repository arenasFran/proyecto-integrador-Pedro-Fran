import 'dotenv/config';
import { validateEnv, getConfig } from './infrastructure/config/env';

validateEnv();
const config = getConfig();

import { connectDB } from './infrastructure/config/db';
import { seedAdmin, seedBarbers } from './infrastructure/scripts/seed';
import { seedServices } from './infrastructure/scripts/seedServices';

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedBarbers();
  await seedServices();

  const { default: app } = await import('./app');

  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });
};

startServer();
