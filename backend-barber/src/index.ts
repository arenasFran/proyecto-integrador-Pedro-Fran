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
import { MongoUserRepository } from './infrastructure/repositories/mongodb/MongoUserRepository';
import { NodemailerEmailService } from './infrastructure/services/NodemailerEmailService';

const EXPIRATION_CHECK_MS = 24 * 60 * 60 * 1000;
const PENDING_PAYMENT_CHECK_MS = 5 * 60 * 1000;
const PENDING_PAYMENT_TIMEOUT_MIN = 30;
const PENDING_ORDER_CHECK_MS = 5 * 60 * 1000;
const PENDING_ORDER_TIMEOUT_MIN = 60;
const ORPHAN_PAYMENT_CHECK_MS = 60 * 60 * 1000;
const ORPHAN_PAYMENT_TIMEOUT_HOURS = 24;

const startServer = async () => {
  await connectDB();
  await runFullSeed();

  const membershipRepo = new MongoMembershipRepository();
  const appointmentRepo = new MongoAppointmentRepository();
  const paymentRepo = new MongoPaymentRepository();
  const orderRepo = new MongoOrderRepository();
  const userRepo = new MongoUserRepository();
  let running = false;
  let pendingPaymentRunning = false;
  let pendingOrderRunning = false;
  let orphanPaymentRunning = false;

  const expireJob = async () => {
    if (running) return;
    running = true;
    try {
      const expired = await membershipRepo.expireExpiredMemberships();
      if (expired > 0) {
        console.log(`[MembershipExpiration] ${expired} expirada(s)`);
      }

      const expiringSoon = await membershipRepo.findExpiringSoon(3);
      if (expiringSoon.length > 0) {
        const emailService = new NodemailerEmailService();
        const userIds = expiringSoon.map((m) => m.userId);
        const userMap = await userRepo.findByIds(userIds);

        let notified = 0;
        for (const membership of expiringSoon) {
          const user = userMap.get(membership.userId);
          const email = user?.email;
          if (!email) continue;

          const daysLeft = Math.max(0, Math.ceil((membership.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          try {
            await emailService.sendMail({
              to: email,
              subject: 'Tu membresía está por vencer - Barbería SA',
              html: `<p>Hola ${user.name},</p>
<p>Tu membresía vence en <strong>${daysLeft} día(s)</strong> (${membership.endDate.toLocaleDateString('es-UY')}).</p>
<p>Renovala para seguir disfrutando de los beneficios.</p>`,
            });
            notified++;
          } catch {
            // continue with next membership
          }
        }
        if (notified > 0) {
          console.log(`[MembershipExpiration] ${notified} notificaciones de expiración enviadas`);
        }
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

  const cancelOrphanPendingPayments = async () => {
    if (orphanPaymentRunning) return;
    orphanPaymentRunning = true;
    try {
      const cutoff = new Date(Date.now() - ORPHAN_PAYMENT_TIMEOUT_HOURS * 60 * 60 * 1000);
      const cancelled = await paymentRepo.cancelOrphanPendingPayments(cutoff);
      if (cancelled > 0) {
        console.log(`[OrphanPaymentCancel] ${cancelled} pago(s) huérfano(s) cancelado(s) por antigüedad > ${ORPHAN_PAYMENT_TIMEOUT_HOURS}h`);
      }
    } catch (err) {
      console.error('[OrphanPaymentCancel] Error:', err);
    } finally {
      orphanPaymentRunning = false;
    }
  };

  await expireJob();
  setInterval(expireJob, EXPIRATION_CHECK_MS);

  await cancelPendingPaymentAppointments();
  setInterval(cancelPendingPaymentAppointments, PENDING_PAYMENT_CHECK_MS);

  await cancelPendingOrders();
  setInterval(cancelPendingOrders, PENDING_ORDER_CHECK_MS);

  await cancelOrphanPendingPayments();
  setInterval(cancelOrphanPendingPayments, ORPHAN_PAYMENT_CHECK_MS);

  const { default: app } = await import('./app');

  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });
};

startServer();
