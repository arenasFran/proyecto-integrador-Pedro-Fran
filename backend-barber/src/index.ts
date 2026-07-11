import 'dotenv/config';
import { validateEnv, getConfig } from './infrastructure/config/env';

validateEnv();
const config = getConfig();

import { connectDB } from './infrastructure/config/db';
import { seedAdmin, seedBarbers } from './infrastructure/scripts/seed';
import { seedServices } from './infrastructure/scripts/seedServices';
import { MongoMembershipRepository } from './infrastructure/repositories/mongodb/MongoMembershipRepository';

const EXPIRATION_CHECK_MS = 24 * 60 * 60 * 1000;

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedBarbers();
  await seedServices();

  const membershipRepo = new MongoMembershipRepository();
  let running = false;

  const expireJob = async () => {
    if (running) return;
    running = true;
    try {
      const result = await membershipRepo.expireExpiredMemberships();
      if (result.expired > 0 || result.renewed > 0) {
        console.log(`[MembershipExpiration] ${result.expired} expirada(s), ${result.renewed} renovada(s)`);
      }
    } catch (err) {
      console.error('[MembershipExpiration] Error al procesar membresías:', err);
    } finally {
      running = false;
    }
  };

  await expireJob();
  setInterval(expireJob, EXPIRATION_CHECK_MS);

  const { default: app } = await import('./app');

  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });
};

startServer();
