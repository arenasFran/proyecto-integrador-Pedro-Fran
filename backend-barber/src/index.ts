import 'dotenv/config';
import { validateEnv, getConfig } from './infrastructure/config/env';

validateEnv();
const config = getConfig();

import { connectDB } from './infrastructure/config/db';
import { runFullSeed } from './infrastructure/scripts/seed-full';
import { MongoMembershipRepository } from './infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoAppointmentRepository } from './infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoPaymentRepository } from './infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MongoUserRepository } from './infrastructure/repositories/mongodb/MongoUserRepository';
import { NodemailerEmailService } from './infrastructure/services/NodemailerEmailService';
import { createJob } from './infrastructure/jobs/jobRunner';

const startServer = async () => {
  await connectDB();
  await runFullSeed();

  const membershipRepo = new MongoMembershipRepository();
  const appointmentRepo = new MongoAppointmentRepository();
  const paymentRepo = new MongoPaymentRepository();
  const userRepo = new MongoUserRepository();

  createJob('expire-memberships', async () => {
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
  }, 24 * 60 * 60 * 1000);

  createJob('cancel-pending-appointments', async () => {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const cancelled = await appointmentRepo.cancelPendingPaymentsOlderThan(cutoff);
    if (cancelled > 0) {
      console.log(`[PendingPaymentCancel] ${cancelled} turno(s) cancelado(s) por pago pendiente > 30 min`);
      await paymentRepo.cancelPendingByAppointments(cutoff);
    }
  }, 5 * 60 * 1000);

  createJob('cancel-orphan-payments', async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cancelled = await paymentRepo.cancelOrphanPendingPayments(cutoff);
    if (cancelled > 0) {
      console.log(`[OrphanPaymentCancel] ${cancelled} pago(s) huérfano(s) cancelado(s) por antigüedad > 24h`);
    }
  }, 60 * 60 * 1000);

  const { default: app } = await import('./app');

  app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });
};

startServer();
