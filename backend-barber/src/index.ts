import 'dotenv/config';
import { validateEnv, getConfig } from './infrastructure/config/env';

validateEnv();
const config = getConfig();

import { connectDB } from './infrastructure/config/db';
import { seedAdmin, seedBarbers } from './infrastructure/scripts/seed';
import { seedServices } from './infrastructure/scripts/seedServices';
import { MongoMembershipRepository } from './infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoAppointmentRepository } from './infrastructure/repositories/mongodb/MongoAppointmentRepository';

const EXPIRATION_CHECK_MS = 24 * 60 * 60 * 1000;
const PENDING_PAYMENT_CHECK_MS = 5 * 60 * 1000;
const PENDING_PAYMENT_TIMEOUT_MIN = 30;

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedBarbers();
  await seedServices();

  const membershipRepo = new MongoMembershipRepository();
  const appointmentRepo = new MongoAppointmentRepository();
  let running = false;
  let pendingPaymentRunning = false;

  const expireJob = async () => {
    if (running) return;
    running = true;
    try {
      const count = await membershipRepo.expireExpiredMemberships();
      if (count > 0) {
        console.log(`[MembershipExpiration] ${count} membresía(s) expirada(s)`);
      }
    } catch (err) {
      console.error('[MembershipExpiration] Error al expirar membresías:', err);
    } finally {
      running = false;
    }
  };

  const cancelPendingPaymentAppointments = async () => {
    if (pendingPaymentRunning) return;
    pendingPaymentRunning = true;
    try {
      const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MIN * 60 * 1000);
      const cancelled = await appointmentRepo.cancelPendingPaymentsOlderThan(cutoff);
      if (cancelled > 0) {
        console.log(`[PendingPaymentCancel] ${cancelled} turno(s) cancelado(s) por pago pendiente > ${PENDING_PAYMENT_TIMEOUT_MIN} min`);
      }
    } catch (err) {
      console.error('[PendingPaymentCancel] Error:', err);
    } finally {
      pendingPaymentRunning = false;
    }
  };

  await expireJob();
  setInterval(expireJob, EXPIRATION_CHECK_MS);

  await cancelPendingPaymentAppointments();
  setInterval(cancelPendingPaymentAppointments, PENDING_PAYMENT_CHECK_MS);

  const { default: app } = await import('./app');

  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });
};

startServer();
