import 'dotenv/config';
import mongoose from 'mongoose';
import { PaymentModel } from '../repositories/mongodb/models/payment.model';
import { RevenueEntryModel } from '../repositories/mongodb/models/revenue-entry.model';

async function runReconciliation() {
  console.log('[RECONCILE] Iniciando reconciliación de revenue_entries...');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber';
  await mongoose.connect(mongoUri);
  console.log('[RECONCILE] Conectado a MongoDB');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const approvedPayments = await PaymentModel.find({
    status: 'approved',
    createdAt: { $gte: thirtyDaysAgo },
    $or: [
      { type: 'product_order' },
      { type: 'membership' },
      { type: 'appointment' },
    ],
  }).lean();

  console.log(`[RECONCILE] Encontrados ${approvedPayments.length} pagos aprobados en últimos 30 días`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const payment of approvedPayments) {
    try {
      let referenceId: string;
      let source: string;
      let amount: number;
      let date: Date;
      let metadata: Record<string, unknown>;

      if (payment.type === 'product_order') {
        referenceId = payment.referenceId;
        source = 'product_order';
        amount = payment.amount;
        date = payment.createdAt || new Date();
        metadata = { userId: payment.userId?.toString(), paymentId: payment._id.toString() };
      } else if (payment.type === 'membership') {
        referenceId = payment.referenceId;
        source = 'membership';
        amount = payment.amount;
        date = payment.createdAt || new Date();
        metadata = { userId: payment.userId?.toString(), paymentId: payment._id.toString() };
      } else if (payment.type === 'appointment') {
        referenceId = payment.referenceId;
        source = 'appointment';
        amount = payment.amount;
        date = payment.createdAt || new Date();
        metadata = { userId: payment.userId?.toString(), paymentId: payment._id.toString() };
      } else {
        continue;
      }

      const existingByPaymentId = await RevenueEntryModel.findOne({ 'metadata.paymentId': payment._id.toString() });
      if (existingByPaymentId) {
        skipped++;
        continue;
      }

      const existingByReference = await RevenueEntryModel.findOne({ referenceId, source });
      if (existingByReference) {
        skipped++;
        continue;
      }

      await RevenueEntryModel.create({
        source,
        amount,
        referenceId,
        date,
        paymentId: payment._id.toString(),
        metadata,
      });
      created++;
      console.log(`[RECONCILE] Creado revenue_entry: ${source} / ${referenceId} / $${amount} (payment: ${payment._id})`);
    } catch (error) {
      errors++;
      console.error(`[RECONCILE] Error procesando payment ${payment._id}:`, error);
    }
  }

  console.log(`[RECONCILE] Completado: ${created} creados, ${skipped} ya existían, ${errors} errores`);
  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

runReconciliation().catch((err) => {
  console.error('[RECONCILE] Error fatal:', err);
  process.exit(1);
});