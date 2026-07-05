import mongoose from 'mongoose';
import { MembershipModel, IMembershipDocument } from './models/membership.model';
import { Membership } from '../../../domain/entities/Membership';

export class MongoMembershipRepository {
  async findActiveByUser(userId: string): Promise<Membership | null> {
    const doc = await MembershipModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 });

    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string): Promise<Membership | null> {
    const doc = await MembershipModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(filter?: { status?: string; search?: string }): Promise<Membership[]> {
    const query: Record<string, unknown> = {};
    if (filter?.status) query.status = filter.status;

    const docs = await MembershipModel.find(query).sort({ createdAt: -1 });

    return docs.map((d) => this.toDomain(d));
  }

  async findByUser(userId: string): Promise<Membership[]> {
    const docs = await MembershipModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    return docs.map((d) => this.toDomain(d));
  }

  async save(membership: Membership): Promise<Membership> {
    const data = membership.toPrimitives();

    if (data.id) {
      await MembershipModel.findByIdAndUpdate(data.id, {
        $set: {
          status: data.status,
          couponsUsed: data.couponsUsed,
          endDate: data.endDate,
          updatedAt: new Date(),
        },
      });
      return membership;
    }

    const doc = await MembershipModel.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      couponsTotal: data.couponsTotal,
      couponsUsed: data.couponsUsed,
      productDiscount: data.productDiscount,
      createdBy: data.createdBy,
      adminId: data.adminId ? new mongoose.Types.ObjectId(data.adminId) : undefined,
    });

    return Membership.restore({
      ...data,
      id: doc._id.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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

  async expireExpiredMemberships(): Promise<number> {
    const result = await MembershipModel.updateMany(
      {
        status: 'active',
        endDate: { $lt: new Date() },
      },
      { $set: { status: 'expired' } }
    );
    return result.modifiedCount;
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
      createdBy: doc.createdBy,
      adminId: doc.adminId?.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
