import mongoose from 'mongoose';
import { MembershipModel, IMembershipDocument } from './models/membership.model';
import { Membership } from '../../../domain/entities/Membership';
import { Barber } from './models/barber.model';
import { RegisteredClient } from './models/client.model';
import { MEMBERSHIP_DEFAULTS } from '../../../domain/types/membership';

export class MongoMembershipRepository {
  async findActiveByUser(userId: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const query = MembershipModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 });
    if (session) query.session(session);
    const doc = await query;

    return doc ? this.toDomain(doc) : null;
  }

  async findPendingByUser(userId: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const query = MembershipModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending',
    }).sort({ createdAt: -1 });
    if (session) query.session(session);
    const doc = await query;

    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const query = MembershipModel.findById(id);
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
  }

  async findByPreapprovalId(preapprovalId: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const query = MembershipModel.findOne({ mpPreapprovalId: preapprovalId });
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
  }

  async findAllWithPreapprovalId(): Promise<Membership[]> {
    const docs = await MembershipModel.find({
      mpPreapprovalId: { $exists: true, $ne: null },
      status: 'cancelled',
    }).lean();
    return docs.map((d) => this.toDomain(d as IMembershipDocument));
  }

  async findAll(filter?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ data: Membership[]; total: number; page: number; totalPages: number; limit: number }> {
    const query: Record<string, unknown> = {};
    if (filter?.status) query.status = filter.status;

    if (filter?.search) {
      const escaped = filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' };
      const [barberDocs, clientDocs] = await Promise.all([
        Barber.find({ $or: [{ name: regex }, { lastname: regex }, { email: regex }] }, { _id: 1 }).lean(),
        RegisteredClient.find({ $or: [{ name: regex }, { lastname: regex }, { email: regex }] }, { _id: 1 }).lean(),
      ]);
      const matchingIds = [...barberDocs, ...clientDocs].map(d => d._id.toString());
      if (matchingIds.length === 0) {
        return { data: [], total: 0, page: filter.page ?? 1, totalPages: 0, limit: filter.limit ?? 20 };
      }
      query.userId = { $in: matchingIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      MembershipModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      MembershipModel.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.toDomain(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  async findByUser(userId: string, session?: mongoose.ClientSession): Promise<Membership[]> {
    const query = MembershipModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
    if (session) query.session(session);
    const docs = await query;

    return docs.map((d) => this.toDomain(d));
  }

  async save(membership: Membership, session?: mongoose.ClientSession): Promise<Membership> {
    const data = membership.toPrimitives();

    if (data.id) {
      await MembershipModel.findByIdAndUpdate(data.id, {
        $set: {
          status: data.status,
          couponsUsed: data.couponsUsed,
          endDate: data.endDate,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt,
          paymentMethod: data.paymentMethod,
          paymentId: data.paymentId,
          updatedAt: new Date(),
        },
      }, session ? { session } : {});
      return membership;
    }
    const doc = await MembershipModel.create([{
      userId: new mongoose.Types.ObjectId(data.userId),
      status: data.status,
      price: data.price,
      startDate: data.startDate,
      endDate: data.endDate,
      couponsTotal: data.couponsTotal,
      couponsUsed: data.couponsUsed,
      productDiscount: data.productDiscount,
      durationDays: data.durationDays,
      billingCycle: data.billingCycle,
      createdBy: data.createdBy,
      adminId: data.adminId ? new mongoose.Types.ObjectId(data.adminId) : undefined,
      mpPreapprovalId: data.mpPreapprovalId,
      paymentMethod: data.paymentMethod,
      paymentId: data.paymentId,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt,
    }], session ? { session } : {});
    const created = doc[0];

    return Membership.restore({
      ...data,
      id: created._id.toString(),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async incrementCouponsUsed(id: string, delta: number, session?: mongoose.ClientSession): Promise<Membership | null> {
    const filter: Record<string, unknown> = { _id: id };
    if (delta > 0) {
      filter.$expr = { $lt: ['$couponsUsed', '$couponsTotal'] };
    }
    const doc = await MembershipModel.findOneAndUpdate(
      filter,
      [{ $set: { couponsUsed: { $max: [0, { $add: ['$couponsUsed', delta] }] }, updatedAt: '$$NOW' } }],
      { returnDocument: 'after', session, updatePipeline: true }
    );
    return doc ? this.toDomain(doc) : null;
  }

  async atomicConsumeCoupon(id: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    return this.incrementCouponsUsed(id, 1, session);
  }

  async atomicRestoreCoupon(id: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    return this.incrementCouponsUsed(id, -1, session);
  }

  async addCouponsTotal(id: string, count: number, session?: mongoose.ClientSession): Promise<Membership | null> {
    if (count <= 0) return null;
    const doc = await MembershipModel.findOneAndUpdate(
      { _id: id },
      { $inc: { couponsTotal: count }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after', session }
    );
    return doc ? this.toDomain(doc) : null;
  }

  async findCouponAppointments(membershipId: string): Promise<any[]> {
    const { default: AppointmentModel } = await import('./models/appointment.model');
    return AppointmentModel.find({
      membershipId: new mongoose.Types.ObjectId(membershipId),
      paymentMethod: 'memberPass',
    }).sort({ date: -1, startTime: -1 }).lean();
  }

  async hasActiveMembership(userId: string): Promise<boolean> {
    const now = new Date();
    const count = await MembershipModel.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      endDate: { $gte: now },
    });
    return count > 0;
  }

  async approvePending(id: string, approvedBy: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + MEMBERSHIP_DEFAULTS.durationDays);

    const doc = await MembershipModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'active',
          endDate,
          approvedBy,
          approvedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: 'after', session }
    );
    return doc ? this.toDomain(doc) : null;
  }

  async expireExpiredMemberships(): Promise<number> {
    const result = await MembershipModel.updateMany(
      {
        status: 'active',
        endDate: { $lt: new Date() },
      },
      {
        $set: { status: 'expired' as const, updatedAt: new Date() },
      }
    );
    return result.modifiedCount;
  }

  async findPendingAll(): Promise<Membership[]> {
    const docs = await MembershipModel.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    return docs.map((d) => this.toDomain(d as IMembershipDocument));
  }

  async findExpiringSoon(days: number): Promise<Membership[]> {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + days);
    const docs = await MembershipModel.find({
      status: 'active',
      endDate: { $gte: now, $lte: threshold },
    }).sort({ endDate: 1 }).lean();
    return docs.map((d) => this.toDomain(d as IMembershipDocument));
  }

  async findAnyByUser(userId: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const doc = await MembershipModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 }).session(session || null);
    return doc ? this.toDomain(doc) : null;
  }

  async findAllEntityView(filter?: { status?: string; search?: string; page?: number; limit?: number }): Promise<{ data: Membership[]; total: number; page: number; totalPages: number; limit: number }> {
    const matchStage: Record<string, unknown> = {};
    if (filter?.status) matchStage.status = filter.status;

    const pipeline: mongoose.PipelineStage[] = [
      { $sort: { createdAt: -1 } } as mongoose.PipelineStage,
      {
        $group: {
          _id: '$userId',
          doc: { $first: '$$ROOT' },
        },
      } as mongoose.PipelineStage,
      { $replaceRoot: { newRoot: '$doc' } } as mongoose.PipelineStage,
    ];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage } as mongoose.PipelineStage);
    }

    const countPipeline = [...pipeline, { $count: 'total' } as mongoose.PipelineStage];

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const paginatedPipeline = [
      ...pipeline,
      ...(filter?.search
        ? [] // search handled externally
        : []),
      { $skip: skip } as mongoose.PipelineStage,
      { $limit: limit } as mongoose.PipelineStage,
    ];

    const [docs, countResult] = await Promise.all([
      MembershipModel.aggregate(paginatedPipeline),
      MembershipModel.aggregate(countPipeline),
    ]);

    const total = (countResult[0] as any)?.total ?? 0;

    return {
      data: docs.map((d) => this.toDomain(d as IMembershipDocument)),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  private toDomain(doc: IMembershipDocument): Membership {
    return Membership.restore({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      status: doc.status,
      price: doc.price,
      startDate: doc.startDate,
      endDate: doc.endDate,
      couponsTotal: doc.couponsTotal,
      couponsUsed: doc.couponsUsed,
      productDiscount: doc.productDiscount,
      durationDays: (doc as any).durationDays ?? 30,
      billingCycle: (doc as any).billingCycle ?? null,
      createdBy: doc.createdBy,
      adminId: doc.adminId?.toString(),
      mpPreapprovalId: doc.mpPreapprovalId ?? undefined,
      paymentMethod: (doc as any).paymentMethod ?? null,
      paymentId: (doc as any).paymentId ?? undefined,
      approvedBy: doc.approvedBy?.toString(),
      approvedAt: doc.approvedAt ?? undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
