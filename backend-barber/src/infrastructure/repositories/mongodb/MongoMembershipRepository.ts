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

  async findById(id: string, session?: mongoose.ClientSession): Promise<Membership | null> {
    const query = MembershipModel.findById(id);
    if (session) query.session(session);
    const doc = await query;
    return doc ? this.toDomain(doc) : null;
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
          autoRenew: data.autoRenew,
          updatedAt: new Date(),
        },
      }, session ? { session } : {});
      return membership;
    }

    const doc = await MembershipModel.create([{
      userId: new mongoose.Types.ObjectId(data.userId),
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      couponsTotal: data.couponsTotal,
      couponsUsed: data.couponsUsed,
      productDiscount: data.productDiscount,
      createdBy: data.createdBy,
      adminId: data.adminId ? new mongoose.Types.ObjectId(data.adminId) : undefined,
    }], session ? { session } : {});
    const created = doc[0];

    return Membership.restore({
      ...data,
      id: created._id.toString(),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async hasActiveMembership(userId: string): Promise<boolean> {
    const count = await MembershipModel.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      endDate: { $gte: new Date() },
    });
    return count > 0;
  }

  async expireExpiredMemberships(): Promise<{ expired: number; renewed: number }> {
    const expiredDocs = await MembershipModel.find({
      status: 'active',
      endDate: { $lt: new Date() },
    });

    let expired = 0;
    let renewed = 0;

    for (const doc of expiredDocs) {
      const autoRenew = (doc as any).autoRenew ?? true;

      if (autoRenew) {
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + MEMBERSHIP_DEFAULTS.durationDays);
        doc.endDate = newEndDate;
        doc.couponsUsed = 0;
        await doc.save();
        renewed++;
      } else {
        doc.status = 'expired';
        await doc.save();
        expired++;
      }
    }

    return { expired, renewed };
  }

  private toDomain(doc: IMembershipDocument): Membership {
    return Membership.restore({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      status: doc.status,
      startDate: doc.startDate,
      endDate: doc.endDate,
      couponsTotal: doc.couponsTotal,
      couponsUsed: doc.couponsUsed,
      productDiscount: doc.productDiscount,
      autoRenew: (doc as any).autoRenew ?? true,
      createdBy: doc.createdBy,
      adminId: doc.adminId?.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
