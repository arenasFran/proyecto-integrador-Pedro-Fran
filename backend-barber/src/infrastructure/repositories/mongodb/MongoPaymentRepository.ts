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
          mpStatusDetail: data.mpStatusDetail,
          mpPaymentMethodId: data.mpPaymentMethodId,
          mpPaymentTypeId: data.mpPaymentTypeId,
          mpInstallments: data.mpInstallments,
          mpTotalPaidAmount: data.mpTotalPaidAmount,
          mpNetReceivedAmount: data.mpNetReceivedAmount,
          mpFeeAmount: data.mpFeeAmount,
          mpCardLastFourDigits: data.mpCardLastFourDigits,
          mpCardIssuerId: data.mpCardIssuerId,
          mpDateApproved: data.mpDateApproved,
          mpOperationType: data.mpOperationType,
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

  async updateMpPreferenceId(id: string, mpPreferenceId: string): Promise<void> {
    await PaymentModel.findByIdAndUpdate(id, {
      $set: { mpPreferenceId, updatedAt: new Date() },
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

  async cancelOrphanPendingPayments(cutoff: Date): Promise<number> {
    const result = await PaymentModel.updateMany(
      {
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

  async findAll(filter?: { type?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Payment[]; total: number; page: number; totalPages: number; limit: number }> {
    const query: Record<string, unknown> = {};
    if (filter?.type) query.type = filter.type;
    if (filter?.status) query.status = filter.status;

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      PaymentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PaymentModel.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.toDomain(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
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
      mpStatusDetail: doc.mpStatusDetail ?? undefined,
      mpPaymentMethodId: doc.mpPaymentMethodId ?? undefined,
      mpPaymentTypeId: doc.mpPaymentTypeId ?? undefined,
      mpInstallments: doc.mpInstallments ?? undefined,
      mpTotalPaidAmount: doc.mpTotalPaidAmount ?? undefined,
      mpNetReceivedAmount: doc.mpNetReceivedAmount ?? undefined,
      mpFeeAmount: doc.mpFeeAmount ?? undefined,
      mpCardLastFourDigits: doc.mpCardLastFourDigits ?? undefined,
      mpCardIssuerId: doc.mpCardIssuerId ?? undefined,
      mpDateApproved: doc.mpDateApproved ?? undefined,
      mpOperationType: doc.mpOperationType ?? undefined,
    });
  }
}
