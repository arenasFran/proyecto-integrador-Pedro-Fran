import { RevenueEntry } from '../../domain/entities/RevenueEntry';
import { RevenueSource } from '../../domain/types/revenue';
import { MongoRevenueEntryRepository } from '../../infrastructure/repositories/mongodb/MongoRevenueEntryRepository';
import { ClientSession } from 'mongoose';

export class RevenueTracker {
  constructor(
    private readonly revenueEntryRepo: MongoRevenueEntryRepository
  ) {}

  async trackAppointment(appointmentId: string, servicePrice: number, date: Date, metadata?: Record<string, unknown>, session?: ClientSession): Promise<void> {
    const existing = await this.revenueEntryRepo.findByReferenceId(appointmentId);
    if (existing) return;

    const entry = RevenueEntry.create({
      source: 'appointment',
      amount: servicePrice,
      referenceId: appointmentId,
      date,
      metadata,
    });
    await this.revenueEntryRepo.create(entry, session);
  }

  async trackProductOrder(orderId: string, total: number, date: Date, metadata?: Record<string, unknown>, session?: ClientSession): Promise<void> {
    const existing = await this.revenueEntryRepo.findByReferenceId(orderId);
    if (existing) return;

    const entry = RevenueEntry.create({
      source: 'product_order',
      amount: total,
      referenceId: orderId,
      date,
      metadata,
    });
    await this.revenueEntryRepo.create(entry, session);
  }

  async trackMembership(
    membershipId: string,
    amount: number,
    date: Date,
    metadata?: Record<string, unknown>,
    paymentId?: string,
    session?: ClientSession,
  ): Promise<void> {
    if (paymentId) {
      const existingByPayment = await this.revenueEntryRepo.findByPaymentId(paymentId);
      if (existingByPayment) return;
    } else {
      const existingByReference = await this.revenueEntryRepo.findByReferenceId(membershipId);
      if (existingByReference) return;
    }

    const entry = RevenueEntry.create({
      source: 'membership',
      amount,
      referenceId: membershipId,
      date,
      paymentId,
      metadata,
    });
    await this.revenueEntryRepo.create(entry, session);
  }
}