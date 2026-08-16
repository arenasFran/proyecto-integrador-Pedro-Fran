import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import ServiceModel from '../repositories/mongodb/models/service.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';
import { MembershipModel } from '../repositories/mongodb/models/membership.model';
import { MembershipTransactionModel } from '../repositories/mongodb/models/membership-transaction.model';
import { PaymentModel } from '../repositories/mongodb/models/payment.model';
import { ProductModel } from '../repositories/mongodb/models/product.model';
import { OrderModel } from '../repositories/mongodb/models/order.model';
import { RevenueEntryModel } from '../repositories/mongodb/models/revenue-entry.model';

const DAY = 24 * 60 * 60 * 1000;
const TODAY = new Date(2026, 6, 25); // 25/07/2026

const fm = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const dt = (daysOffset: number, h: number, min: number): Date => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(h, min, 0, 0);
  return d;
};

const d = (daysOffset: number): Date => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(12, 0, 0, 0);
  return d;
};

const emptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
const workDay = (s: string, e: string) => ({ startTime: s, endTime: e, breaks: [] });

// ── Connect ──────────────────────────────────────────────

export async function runFullSeed() {
  console.log('[SEED] Iniciando seed...');

  // Clean previous seed data
  await AppointmentModel.deleteMany({ clientEmail: { $regex: '@test\\.com$' } });
  await OrderModel.deleteMany({ clientEmail: { $regex: '@test\\.com$|@barberia\\.com$' } });
  await PaymentModel.deleteMany({ mpPaymentId: { $regex: '^seed-mp-' } });
  await MembershipTransactionModel.deleteMany({});
  await MembershipModel.deleteMany({});
  await RevenueEntryModel.deleteMany({ referenceId: { $regex: '^[0-9a-f]{24}$' } });
  console.log('[SEED] Datos anteriores limpiados');

  // ── 1. Admin ────────────────────────────────────────
  const adminPwd = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin123!', 10);
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@barberia.com';
  await Admin.deleteMany({ email: adminEmail });
  await Admin.deleteMany({ phone: '099000000' });
  await Admin.create({
    email: adminEmail, password: adminPwd,
    name: 'Admin', lastname: 'Barberia', phone: '099000000',
    slotDuration: 30, schedule: {
      monday: emptyDay(), tuesday: emptyDay(), wednesday: emptyDay(),
      thursday: emptyDay(), friday: emptyDay(), saturday: emptyDay(), sunday: emptyDay(),
    },
  });
  console.log('[SEED] Admin creado:', adminEmail);

  // ── 2. Barbers ───────────────────────────────────────
  const barberPwd = await bcrypt.hash('Barber123!', 10);
  const barbersData = [
    { name: 'Carlos', lastname: 'Gomez', email: 'carlos@barberia.com', phone: '099111111',
      schedule: { monday: workDay('09:00','19:00'), tuesday: workDay('09:00','19:00'), wednesday: workDay('09:00','19:00'),
                  thursday: workDay('09:00','19:00'), friday: workDay('09:00','19:00'), saturday: emptyDay(), sunday: emptyDay() } },
    { name: 'Martin', lastname: 'Perez', email: 'martin@barberia.com', phone: '099222222',
      schedule: { monday: emptyDay(), tuesday: workDay('10:00','20:00'), wednesday: workDay('10:00','20:00'),
                  thursday: workDay('10:00','20:00'), friday: workDay('10:00','20:00'), saturday: workDay('09:00','14:00'), sunday: emptyDay() } },
    { name: 'Lucia', lastname: 'Silva', email: 'lucia@barberia.com', phone: '099333333',
      schedule: { monday: workDay('08:00','16:00'), tuesday: workDay('08:00','16:00'), wednesday: workDay('08:00','16:00'),
                  thursday: emptyDay(), friday: workDay('08:00','16:00'), saturday: emptyDay(), sunday: emptyDay() } },
  ];
  const barberIds: string[] = [];
  for (const b of barbersData) {
    await Employee.deleteMany({ email: b.email });
    await Employee.deleteMany({ phone: b.phone });
    const doc = await Employee.create({ ...b, password: barberPwd, slotDuration: 30, services: [], isActive: true, kind: 'Empleado' });
    barberIds.push(doc._id.toString());
  }
  console.log('[SEED] 3 barberos creados');

  // ── 3. Services ──────────────────────────────────────
  const servicesData = [
    { name: 'Corte de pelo', description: 'Corte clasico con tijera y maquina', price: 490, durationMinutes: 50 },
    { name: 'Corte a maquina', description: 'Corte rapido solo con maquina', price: 350, durationMinutes: 30 },
    { name: 'Barba', description: 'Perfilado y recorte de barba', price: 250, durationMinutes: 25 },
  ];
  const serviceIds: string[] = [];
  for (const s of servicesData) {
    const existing = await ServiceModel.findOne({ name: s.name });
    const doc = existing || await ServiceModel.create({ ...s, status: 'active' });
    serviceIds.push(doc._id.toString());
  }
  console.log('[SEED] 3 servicios creados');

  // ── 4. Products ──────────────────────────────────────
  const productsData = [
    { name: 'Pomada Matte', description: 'Fijacion media acabado mate 100g', price: 450, stock: 25, category: 'Ceras y Pomadas', status: 'active' },
    { name: 'Aceite para Barba', description: 'Hidratante con aroma a sandalo 50ml', price: 380, stock: 15, category: 'Barba', status: 'active' },
    { name: 'Shampoo Revitalizante', description: 'Limpieza profunda 250ml', price: 320, stock: 20, category: 'Cuidado Capilar', status: 'active' },
    { name: 'Peine Profesional', description: 'Peine de carbono antitetanico', price: 180, stock: 30, category: 'Accesorios', status: 'active' },
    { name: 'Toalla de Barbero', description: 'Toalla microfibra 40x60cm', price: 290, stock: 40, category: 'Accesorios', status: 'active' },
  ];
  const productIds: string[] = [];
  for (const p of productsData) {
    const existing = await ProductModel.findOne({ name: p.name });
    const doc = existing || await ProductModel.create(p);
    productIds.push(doc._id.toString());
  }
  console.log('[SEED] 5 productos creados');

  // ── 5. Registered Clients ────────────────────────────
  const clientData = [
    { name: 'Santiago', lastname: 'Rios', email: 'santiago@test.com', phone: '099400001', photo: '' },
    { name: 'Valentina', lastname: 'Cruz', email: 'valentina@test.com', phone: '099400002', photo: '' },
    { name: 'Mateo', lastname: 'Lopez', email: 'mateo@test.com', phone: '099400003', photo: '' },
    { name: 'Camila', lastname: 'Diaz', email: 'camila@test.com', phone: '099400004', photo: '' },
    { name: 'Joaquin', lastname: 'Ferro', email: 'joaquin@test.com', phone: '099400005', photo: '' },
  ];
  const clientIds: string[] = [];
  for (const c of clientData) {
    await RegisteredClient.deleteMany({ email: c.email });
    await RegisteredClient.deleteMany({ phone: c.phone });
    const doc = await RegisteredClient.create({ ...c, kind: 'Registrado', password: await bcrypt.hash('Cliente123!', 10), photoUrl: null });
    clientIds.push(doc._id.toString());
  }
  console.log('[SEED] 5 clientes registrados creados');

  // ── 6. Memberships ─────────────────────────────────
  const memberClients = [0, 1, 2, 3, 4]; // todos tienen membresia
  const membershipsData = [
    { clientIdx: 0, status: 'active', price: 399, paymentMethod: 'mercadopago', billingCycle: 'onetime',
      daysOffset: -15, couponsTotal: 4, couponsUsed: 1, productDiscount: 10 },
    { clientIdx: 1, status: 'active', price: 399, paymentMethod: 'mercadopago', billingCycle: 'onetime',
      daysOffset: -5, couponsTotal: 4, couponsUsed: 2, productDiscount: 15 },
    { clientIdx: 2, status: 'active', price: 0, paymentMethod: 'local', billingCycle: 'onetime',
      daysOffset: -45, couponsTotal: 6, couponsUsed: 0, productDiscount: 25 },
    { clientIdx: 3, status: 'expired', price: 399, paymentMethod: 'mercadopago', billingCycle: 'onetime',
      daysOffset: -60, couponsTotal: 4, couponsUsed: 4, productDiscount: 10 },
    { clientIdx: 4, status: 'cancelled', price: 399, paymentMethod: 'mercadopago', billingCycle: 'onetime',
      daysOffset: -120, couponsTotal: 4, couponsUsed: 0, productDiscount: 10 },
  ];
  const membershipIds: string[] = [];
  for (const m of membershipsData) {
    const uid = clientIds[m.clientIdx];
    const startDate = d(m.daysOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    const doc = await MembershipModel.create({
      userId: uid, status: m.status, price: m.price,
      startDate, endDate,
      couponsTotal: m.couponsTotal, couponsUsed: m.couponsUsed,
      productDiscount: m.productDiscount, durationDays: 30,
      billingCycle: m.billingCycle || null,
      paymentMethod: m.paymentMethod,
      createdBy: m.status === 'cancelled' ? 'admin' : 'client',
      createdAt: startDate, updatedAt: startDate,
    });
    membershipIds.push(doc._id.toString());

    // Transaction + Payment
    if (m.price > 0) {
      const tx = await MembershipTransactionModel.create({
        userId: uid, membershipId: doc._id.toString(), amount: m.price,
        paymentMethod: m.paymentMethod, createdBy: 'client',
        createdAt: startDate,
      });
      await PaymentModel.create({
        type: 'membership', referenceId: doc._id.toString(), amount: m.price,
        userId: uid, status: 'approved',
        currency: 'UYU', mpPaymentId: `seed-mp-mem-${m.clientIdx}`,
        createdAt: startDate,
      });
    }
  }
  console.log('[SEED] 5 membresias creadas (3 activas, 1 expirada, 1 cancelada)');

  // ── 7. Historical Appointments ─────────────────────
  const appointmentStatuses = ['Completado', 'Cancelado', 'NoShow', 'Confirmado'];
  const paymentMethods = ['local', 'online', 'memberPass'];
  const slots = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
                  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];
  const appointmentIds: string[] = [];
  let aptCount = 0;

  for (let dayOffset = -180; dayOffset <= 180; dayOffset++) {
    if (aptCount >= 110) break;
    const dObj = new Date(TODAY);
    dObj.setDate(dObj.getDate() + dayOffset);
    const dow = dObj.getDay();

    const barberIdx = dayOffset % 3;
    const barberId = barberIds[barberIdx < 0 ? barberIdx + 3 : barberIdx];
    if (dayOffset % 7 === 0) continue; // saltear domingos

    // determinar estado segun fecha
    let status: string;
    const rand = Math.random();
    if (dayOffset < 0) {
      status = rand < 0.60 ? 'Completado' : rand < 0.80 ? 'Cancelado' : 'NoShow';
    } else if (dayOffset === 0) {
      status = rand < 0.50 ? 'Completado' : rand < 0.75 ? 'Confirmado' : 'Cancelado';
    } else {
      if (dayOffset > 14) break; // max 14 dias futuro (2 semanas)
      status = rand < 0.70 ? 'Confirmado' : 'Cancelado';
    }

    const serviceIdx = Math.floor(Math.random() * servicesData.length);
    const serviceId = serviceIds[serviceIdx];
    const service = servicesData[serviceIdx];
    const slot = slots[Math.floor(Math.random() * slots.length)];

    const endH = parseInt(slot.split(':')[0]) + Math.ceil(service.durationMinutes / 60);
    const endM = parseInt(slot.split(':')[1]) + (service.durationMinutes % 60);
    const endTime = `${String(endH + Math.floor(endM / 60)).padStart(2,'0')}:${String(endM % 60).padStart(2,'0')}`;

    let paymentMethod = paymentMethods[dayOffset % 3];
    let paymentStatus = 'Pendiente';
    if (status === 'Completado') paymentStatus = 'Pagado';
    else if (status === 'Cancelado') paymentStatus = 'Cancelado';
    else if (status === 'Confirmado' && dayOffset < 0) paymentStatus = 'Pagado';
    if (paymentMethod === 'memberPass') paymentStatus = 'Pagado';

    const clientIdx = Math.floor(Math.random() * 5);
    const clientId = clientIds[clientIdx];
    const client = clientData[clientIdx];

    const membershipId = paymentMethod === 'memberPass' ? membershipIds[clientIdx] : undefined;

    const apt = await AppointmentModel.create({
      barberId, clientId, clientName: client.name, clientLastname: client.lastname,
      clientPhone: client.phone, clientEmail: client.email,
      serviceId, serviceName: service.name, servicePrice: service.price,
      serviceDuration: service.durationMinutes,
      date: fm(dObj), startTime: slot, endTime,
      status, paymentStatus, paymentMethod,
      membershipId,
      couponRedeemed: paymentMethod === 'memberPass',
      createdAt: dObj, updatedAt: dObj,
      version: 0,
    });
    appointmentIds.push(apt._id.toString());
    aptCount++;
  }
  console.log(`[SEED] ${aptCount} turnos creados`);

  // ── 8. Orders ───────────────────────────────────────
  const orderStatuses = ['paid', 'delivered', 'pending', 'cancelled'];
  const orderIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const clientIdx = i % 5;
    const uid = clientIds[clientIdx];
    const daysAgo = -(i * 3 + Math.floor(Math.random() * 10));
    const createdAt = d(daysAgo);
    const status = orderStatuses[i % 4];

    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = [];
    let total = 0;
    for (let j = 0; j < itemCount; j++) {
      const pIdx = (i + j) % 5;
      const prod = productsData[pIdx];
      const qty = 1 + Math.floor(Math.random() * 2);
      const membership = membershipsData[clientIdx];
      const discount = (membership.status === 'active' && membership.productDiscount > 0) ? membership.productDiscount : 0;
      const price = discount > 0 ? Math.round(prod.price * (100 - discount) / 100) : prod.price;
      items.push({ productId: productIds[pIdx], name: prod.name, price, quantity: qty });
      total += price * qty;
    }

    const order = await OrderModel.create({
      userId: uid, clientName: clientData[clientIdx].name,
      clientEmail: clientData[clientIdx].email,
      items, total, status, createdAt, updatedAt: createdAt,
    });
    orderIds.push(order._id.toString());

    if (status === 'paid' || status === 'delivered') {
      await PaymentModel.create({
        type: 'product_order', referenceId: order._id.toString(), amount: total,
        userId: uid, status: 'approved',
        currency: 'UYU', mpPaymentId: `seed-mp-ord-${i}`,
        createdAt,
      });
    } else if (status === 'pending') {
      await PaymentModel.create({
        type: 'product_order', referenceId: order._id.toString(), amount: total,
        userId: uid, status: 'pending',
        currency: 'UYU', mpPaymentId: `seed-mp-ord-${i}`,
        createdAt,
      });
    }
  }
  console.log('[SEED] 20 ordenes creadas');

  // ── 9. Backfill revenue_entries ──────────────────────
  let revCount = 0;

  // From appointments
  const revenueAppts = await AppointmentModel.find({
    $or: [
      { status: 'Completado' },
      { status: 'Confirmado', paymentStatus: 'Pagado' },
    ],
  });
  for (const apt of revenueAppts) {
    const exists = await RevenueEntryModel.findOne({ referenceId: apt._id.toString() });
    if (exists) continue;
    await RevenueEntryModel.create({
      source: 'appointment', amount: apt.servicePrice || 0,
      date: apt.createdAt || new Date(),
      referenceId: apt._id.toString(),
      metadata: { barberId: apt.barberId?.toString(), serviceId: apt.serviceId, clientId: apt.clientId?.toString() },
    });
    revCount++;
  }

  // From payments (product_order + membership)
  const revenuePayments = await PaymentModel.find({
    type: { $in: ['product_order', 'membership'] },
    status: 'approved',
  });
  for (const pay of revenuePayments) {
    const exists = await RevenueEntryModel.findOne({ referenceId: pay.referenceId });
    if (exists) continue;
    await RevenueEntryModel.create({
      source: pay.type === 'product_order' ? 'product_order' : 'membership',
      amount: pay.amount,
      date: pay.createdAt || new Date(),
      referenceId: pay.referenceId,
      metadata: { paymentId: pay.referenceId, userId: pay.userId?.toString(), },
    });
    revCount++;
  }

  console.log(`[SEED] ${revCount} revenue_entries creados (backfill)`);
  console.log('[SEED] Seed completo.');
  console.log('[SEED] Credenciales:');
  console.log(`  Admin: ${adminEmail}`);
  console.log('  Clientes: santiago@test.com, valentina@test.com, mateo@test.com, camila@test.com, joaquin@test.com');
  console.log('  Barbers: carlos@barberia.com, martin@barberia.com, lucia@barberia.com');
  console.log('  La contraseña del admin se define con SEED_ADMIN_PASSWORD (default: ver script).');
}
