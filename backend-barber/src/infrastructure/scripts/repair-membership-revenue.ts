import 'dotenv/config';
import mongoose from 'mongoose';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';
import { RevenueEntryModel } from '../repositories/mongodb/models/revenue-entry.model';

async function runRepair() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber';
  await mongoose.connect(mongoUri);

  try {
    const membershipAppointments = await AppointmentModel.find(
      { paymentMethod: 'memberPass' },
      { _id: 1 },
    ).lean();
    const referenceIds = membershipAppointments.map((appointment) => appointment._id.toString());
    const filter = { source: 'appointment', referenceId: { $in: referenceIds } };
    const affected = await RevenueEntryModel.find(filter, { _id: 1, referenceId: 1, amount: 1 }).lean();

    console.log(`[REPAIR] Ingresos de turnos memberPass encontrados: ${affected.length}`);
    for (const entry of affected) {
      console.log(`[REPAIR] ${entry.referenceId} - $${entry.amount}`);
    }

    if (process.argv.includes('--apply') && affected.length > 0) {
      const result = await RevenueEntryModel.deleteMany(filter);
      console.log(`[REPAIR] Eliminados: ${result.deletedCount}`);
    } else if (!process.argv.includes('--apply')) {
      console.log('[REPAIR] Simulacion: usar --apply para eliminar estos registros.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

runRepair().catch((error) => {
  console.error('[REPAIR] Error reparando ingresos de membresia:', error);
  process.exitCode = 1;
});
