import mongoose from 'mongoose';
import { PaymentModel, IPaymentDocument } from './models/payment.model';
import { Payment } from '../../../domain/entities/Payment';

export class MongoPaymentRepository {
  async findById(id: string, session?: mongoose.ClientSession): Promise<Payment | null> {
    const query = PaymentModel.findById(id);
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
  }

  async findByMpPreferenceId(mpPreferenceId: string, session?: mongoose.ClientSession): Promise<Payment | null> {
    const query = PaymentModel.findOne({ mpPreferenceId });
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
  }

  async findByMpPaymentId(mpPaymentId: string, session?: mongoose.ClientSession): Promise<Payment | null> {
    const query = PaymentModel.findOne({ mpPaymentId });
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
  }

  async findByReference(referenceId: string, type: string, session?: mongoose.ClientSession): Promise<Payment | null> {
    const query = PaymentModel.findOne({ referenceId, type });
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
  }

  async findByUser(userId: string, session?: mongoose.ClientSession): Promise<Payment[]> {
    const query = PaymentModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
    if (session) query.session(session);
    const docs = await query;
    return docs.map((d) => this.toDomain(d));
  }

  async save(payment: Payment, session?: mongoose.ClientSession): Promise<Payment> {
    const data = payment.toPrimitives();

    if (data.id) {
      await PaymentModel.findByIdAndUpdate(data.id, {
        $set: {
          status: data.status,
          mpPaymentId: data.mpPaymentId,
          mpPreferenceId: data.mpPreferenceId,
          updatedAt: new Date(),
        },
      }, session ? { session } : {});
      return payment;
    }

    const [doc] = await PaymentModel.create([{
      type: data.type,
      referenceId: data.referenceId,
      status: data.status,
      mpPaymentId: data.mpPaymentId,
      mpPreferenceId: data.mpPreferenceId,
      amount: data.amount,
      currency: data.currency,
      userId: new mongoose.Types.ObjectId(data.userId),
    }], session ? { session } : {});

    const created = doc;

    return Payment.restore({
      ...data,
      id: created._id.toString(),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async cancelPendingByAppointments(cutoff: Date): Promise<number> {
    const result = await PaymentModel.updateMany(
      {
        type: 'appointment',
        status: 'pending',
        createdAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount;
  }

  private toDomain(doc: IPaymentDocument): Payment {
    return Payment.restore({
      id: doc._id.toString(),
      type: doc.type,
      referenceId: doc.referenceId,
      status: doc.status,
      mpPaymentId: doc.mpPaymentId ?? undefined,
      mpPreferenceId: doc.mpPreferenceId ?? undefined,
      amount: doc.amount,
      currency: doc.currency,
      userId: doc.userId.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
