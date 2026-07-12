import 'dotenv/config';
import { validateEnv, getConfig } from './infrastructure/config/env';

validateEnv();
const config = getConfig();

import { connectDB } from './infrastructure/config/db';
import { runFullSeed } from './infrastructure/scripts/seed-full';
import { MongoMembershipRepository } from './infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoAppointmentRepository } from './infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoPaymentRepository } from './infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MongoOrderRepository } from './infrastructure/repositories/mongodb/MongoOrderRepository';

const EXPIRATION_CHECK_MS = 24 * 60 * 60 * 1000;
const PENDING_PAYMENT_CHECK_MS = 5 * 60 * 1000;
const PENDING_PAYMENT_TIMEOUT_MIN = 30;
const PENDING_ORDER_CHECK_MS = 5 * 60 * 1000;
const PENDING_ORDER_TIMEOUT_MIN = 60;

const startServer = async () => {
  await connectDB();
  await runFullSeed();

  const membershipRepo = new MongoMembershipRepository();
  const appointmentRepo = new MongoAppointmentRepository();
  const paymentRepo = new MongoPaymentRepository();
  const orderRepo = new MongoOrderRepository();
  let running = false;
  let pendingPaymentRunning = false;
  let pendingOrderRunning = false;

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

  const cancelPendingPaymentAppointments = async () => {
    if (pendingPaymentRunning) return;
    pendingPaymentRunning = true;
    try {
      const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MIN * 60 * 1000);
      const cancelled = await appointmentRepo.cancelPendingPaymentsOlderThan(cutoff);
      if (cancelled > 0) {
        console.log(`[PendingPaymentCancel] ${cancelled} turno(s) cancelado(s) por pago pendiente > ${PENDING_PAYMENT_TIMEOUT_MIN} min`);
        await paymentRepo.cancelPendingByAppointments(cutoff);
      }
    } catch (err) {
      console.error('[PendingPaymentCancel] Error:', err);
    } finally {
      pendingPaymentRunning = false;
    }
  };

  const cancelPendingOrders = async () => {
    if (pendingOrderRunning) return;
    pendingOrderRunning = true;
    try {
      const cutoff = new Date(Date.now() - PENDING_ORDER_TIMEOUT_MIN * 60 * 1000);
      const cancelled = await orderRepo.cancelPendingOlderThan(cutoff);
      if (cancelled > 0) {
        console.log(`[PendingOrderCancel] ${cancelled} orden(es) cancelada(s) por pago pendiente > ${PENDING_ORDER_TIMEOUT_MIN} min`);
      }
    } catch (err) {
      console.error('[PendingOrderCancel] Error:', err);
    } finally {
      pendingOrderRunning = false;
    }
  };

  await expireJob();
  setInterval(expireJob, EXPIRATION_CHECK_MS);

  await cancelPendingPaymentAppointments();
  setInterval(cancelPendingPaymentAppointments, PENDING_PAYMENT_CHECK_MS);

  await cancelPendingOrders();
  setInterval(cancelPendingOrders, PENDING_ORDER_CHECK_MS);

  const { default: app } = await import('./app');

  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });
};

startServer();
