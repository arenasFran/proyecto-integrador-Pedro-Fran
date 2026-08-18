import mongoose from 'mongoose';
import { MembershipTransactionModel, IMembershipTransactionDocument } from './models/membership-transaction.model';

export type MembershipTransactionData = {
  id: string;
  userId: string;
  membershipId: string;
  amount: number;
  paymentMethod: 'mercadopago' | 'local';
  mpPaymentId?: string;
  paymentId?: string;
  createdBy: 'client' | 'admin';
  adminId?: string;
  createdAt: Date;
};

export class MongoMembershipTransactionRepository {
  async create(data: {
    userId: string;
    membershipId: string;
    amount: number;
    paymentMethod: 'mercadopago' | 'local';
    mpPaymentId?: string;
    paymentId?: string;
    createdBy: 'client' | 'admin';
    adminId?: string;
  }, session?: mongoose.ClientSession): Promise<MembershipTransactionData> {
    const doc = await MembershipTransactionModel.create([{
      userId: new mongoose.Types.ObjectId(data.userId),
      membershipId: new mongoose.Types.ObjectId(data.membershipId),
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      mpPaymentId: data.mpPaymentId,
      paymentId: data.paymentId,
      createdBy: data.createdBy,
      adminId: data.adminId ? new mongoose.Types.ObjectId(data.adminId) : undefined,
    }], session ? { session } : {});

    const created = doc[0];
    return this.toData(created);
  }

  async findByMpPaymentId(mpPaymentId: string): Promise<MembershipTransactionData | null> {
    const doc = await MembershipTransactionModel.findOne({ mpPaymentId });
    return doc ? this.toData(doc) : null;
  }

  async findByMembershipId(membershipId: string, pagination?: { page?: number; limit?: number }): Promise<{ data: MembershipTransactionData[]; total: number }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      MembershipTransactionModel.find({ membershipId: new mongoose.Types.ObjectId(membershipId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MembershipTransactionModel.countDocuments({ membershipId: new mongoose.Types.ObjectId(membershipId) }),
    ]);

    return { data: docs.map((d) => this.toData(d)), total };
  }

  async findByUser(userId: string, filter?: {
    desde?: string;
    hasta?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MembershipTransactionData[]; total: number; page: number; totalPages: number; limit: number }> {
    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (filter?.paymentMethod) {
      query.paymentMethod = filter.paymentMethod;
    }

    if (filter?.desde || filter?.hasta) {
      const dateFilter: Record<string, Date> = {};
      if (filter.desde) dateFilter.$gte = new Date(filter.desde);
      if (filter.hasta) {
        const hastaDate = new Date(filter.hasta);
        hastaDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = hastaDate;
      }
      query.createdAt = dateFilter;
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      MembershipTransactionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      MembershipTransactionModel.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.toData(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  async findAll(filter?: {
    desde?: string;
    hasta?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MembershipTransactionData[]; total: number; page: number; totalPages: number; limit: number }> {
    const query: Record<string, unknown> = {};

    if (filter?.paymentMethod) {
      query.paymentMethod = filter.paymentMethod;
    }

    if (filter?.desde || filter?.hasta) {
      const dateFilter: Record<string, Date> = {};
      if (filter.desde) dateFilter.$gte = new Date(filter.desde);
      if (filter.hasta) {
        const hastaDate = new Date(filter.hasta);
        hastaDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = hastaDate;
      }
      query.createdAt = dateFilter;
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      MembershipTransactionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      MembershipTransactionModel.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.toData(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  private toData(doc: IMembershipTransactionDocument): MembershipTransactionData {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      membershipId: doc.membershipId.toString(),
      amount: doc.amount,
      paymentMethod: doc.paymentMethod,
      mpPaymentId: doc.mpPaymentId,
      paymentId: doc.paymentId,
      createdBy: doc.createdBy,
      adminId: doc.adminId?.toString(),
      createdAt: doc.createdAt,
    };
  }
}
