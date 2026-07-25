import { RevenueEntry } from '../../domain/entities/RevenueEntry';
import { RevenueSource } from '../../domain/types/revenue';
import { MongoRevenueEntryRepository } from '../../infrastructure/repositories/mongodb/MongoRevenueEntryRepository';

export class RevenueTracker {
  constructor(
    private readonly revenueEntryRepo: MongoRevenueEntryRepository
  ) {}

  async trackAppointment(appointmentId: string, servicePrice: number, date: Date, metadata?: Record<string, unknown>): Promise<void> {
    const existing = await this.revenueEntryRepo.findByReferenceId(appointmentId);
    if (existing) return;

    const entry = RevenueEntry.create({
      source: 'appointment',
      amount: servicePrice,
      referenceId: appointmentId,
      date,
      metadata,
    });
    await this.revenueEntryRepo.create(entry);
  }

  async trackProductOrder(orderId: string, total: number, date: Date, metadata?: Record<string, unknown>): Promise<void> {
    const existing = await this.revenueEntryRepo.findByReferenceId(orderId);
    if (existing) return;

    const entry = RevenueEntry.create({
      source: 'product_order',
      amount: total,
      referenceId: orderId,
      date,
      metadata,
    });
    await this.revenueEntryRepo.create(entry);
  }

  async trackMembership(membershipId: string, amount: number, date: Date, metadata?: Record<string, unknown>): Promise<void> {
    const entry = RevenueEntry.create({
      source: 'membership',
      amount,
      referenceId: membershipId,
      date,
      metadata,
    });
    await this.revenueEntryRepo.create(entry);
  }
}
