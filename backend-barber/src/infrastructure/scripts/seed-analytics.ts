import 'dotenv/config';
import mongoose from 'mongoose';
import { Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';

const TEST_PREFIX = 'SEED_';

// Servicios reales del sistema (sin duration en config, se agrega acá para el seed)
const SEED_SERVICES = [
  { id: 'svc-1', name: 'Corte de pelo',   price: 490, duration: 50 },
  { id: 'svc-2', name: 'Corte a máquina',  price: 350, duration: 30 },
  { id: 'svc-3', name: 'Barba',            price: 250, duration: 25 },
  { id: 'svc-4', name: 'Promo x2',         price: 450, duration: 70 },
];

// Distribución ponderada: ~40% Corte pelo, ~25% Corte máquina, ~20% Barba, ~15% Promo
const SERVICE_CYCLE = [0, 0, 1, 2, 0, 1, 3, 0, 2, 1, 0, 0, 1, 2, 3, 0, 1, 0, 2, 1];

// ── Barberos ──────────────────────────────────────────────
const BARBERS = [
  { email: 'seed-barber1@elitecut.com',  name: 'Analytics', lastname: 'Test' },
  { email: 'seed-barber2@elitecut.com',  name: 'Pepe',      lastname: 'TestOne' },
  { email: 'seed-barber3@elitecut.com',  name: 'Maria',     lastname: 'TestTwo' },
];

const CLIENT_EMAIL = 'seed-reg@test.com';

// ── Data de turnos ────────────────────────────────────────
// Sin price/duration, se resuelven desde SEED_SERVICES según serviceCycle
type RawTurno = {
  barberIdx: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  isRegistered?: boolean;
};

const TURNOS: RawTurno[] = [
  // ── Enero ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-01-05', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-05', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-07', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 1, date: '2026-01-07', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-09', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-01-19', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 2, date: '2026-01-19', startTime: '10:00', endTime: '10:45', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '10:00', endTime: '10:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-29', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },

  // ── Febrero ────────────────────────────────────────
  { barberIdx: 0, date: '2026-02-02', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-02', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 1, date: '2026-02-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-04', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-09', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-02-09', startTime: '10:00', endTime: '10:50', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-13', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-02-13', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-16', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-16', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '10:00', endTime: '10:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '11:00', endTime: '11:40', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-20', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-02-23', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-23', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-02-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-25', startTime: '10:00', endTime: '10:30', status: 'Completado' },

  // ── Marzo ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-03-02', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-03-02', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-02', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-04', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-06', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-09', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-09', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-03-09', startTime: '11:00', endTime: '11:45', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-18', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-18', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 1, date: '2026-03-18', startTime: '11:00', endTime: '11:30', status: 'NoShow' },
  { barberIdx: 1, date: '2026-03-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-20', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-20', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-23', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-23', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 1, date: '2026-03-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-27', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 2, date: '2026-03-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-30', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-30', startTime: '10:00', endTime: '10:30', status: 'Completado' },

  // ── Abril ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-04-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-01', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-06', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 2, date: '2026-04-06', startTime: '11:00', endTime: '11:30', status: 'Confirmado' },
  { barberIdx: 0, date: '2026-04-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-10', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-10', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-04-13', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-17', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-17', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-20', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-04-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-24', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-27', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-04-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-27', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-29', startTime: '09:00', endTime: '09:30', status: 'Completado' },

  // ── Mayo ───────────────────────────────────────────
  { barberIdx: 0, date: '2026-05-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-05-04', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-06', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-08', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-05-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-11', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-11', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-13', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 2, date: '2026-05-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-15', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 0, date: '2026-05-18', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-05-18', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '16:00', endTime: '16:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-05-20', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-20', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-22', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 2, date: '2026-05-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-25', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 1, date: '2026-05-27', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },

  // ── Junio ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-06-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '11:00', endTime: '11:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-01', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-03', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '11:00', endTime: '11:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-06-08', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-08', startTime: '16:00', endTime: '16:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-10', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-10', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-10', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-06-10', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-06-12', startTime: '10:00', endTime: '10:35', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-12', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '09:30', endTime: '10:00', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '10:00', endTime: '10:45', status: 'Confirmado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '11:00', endTime: '11:45', status: 'NoShow' },
  { barberIdx: 0, date: '2026-06-15', startTime: '12:00', endTime: '12:40', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-15', startTime: '14:00', endTime: '14:20', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-17', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-17', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 0, date: '2026-06-20', startTime: '09:00', endTime: '10:00', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-06-20', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 1, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 2, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 0, date: '2026-06-24', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '15:00', endTime: '15:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '16:00', endTime: '16:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-06-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-29', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-29', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-29', startTime: '11:00', endTime: '11:30', status: 'Completado' },

  // ── Julio (pocos, para tendencia) ───────────────────
  { barberIdx: 1, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado', isRegistered: true },
  { barberIdx: 1, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-15', startTime: '10:00', endTime: '10:30', status: 'Completado', isRegistered: true },
  { barberIdx: 1, date: '2026-07-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
];

// ── Lógica de seed ────────────────────────────────────────

async function getOrCreateBarber(email: string, name: string, lastname: string): Promise<mongoose.Types.ObjectId> {
  const existing = await Employee.findOne({ email });
  if (existing) return existing._id as mongoose.Types.ObjectId;
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash('test123', 10);
  const emptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
  const workDay = (start: string, end: string) => ({ startTime: start, endTime: end, breaks: [] });
  const barber = await Employee.create({
    email, password: hash, name, lastname,
    phone: `099${Math.floor(100000 + Math.random() * 900000)}`,
    services: ['Corte de pelo', 'Corte a máquina', 'Barba', 'Promo x2'],
    age: 30, slotDuration: 30,
    schedule: {
      monday: workDay('09:00', '18:00'), tuesday: workDay('09:00', '18:00'),
      wednesday: workDay('09:00', '18:00'), thursday: workDay('09:00', '18:00'),
      friday: workDay('09:00', '18:00'), saturday: workDay('09:00', '14:00'),
      sunday: emptyDay(),
    },
    isActive: true, photoUrl: null,
  });
  return barber._id as mongoose.Types.ObjectId;
}

async function getOrCreateRegisteredClient(): Promise<mongoose.Types.ObjectId> {
  const existing = await RegisteredClient.findOne({ email: CLIENT_EMAIL });
  if (existing) return existing._id as mongoose.Types.ObjectId;
  const client = await RegisteredClient.create({
    email: CLIENT_EMAIL, name: 'Test', lastname: 'Registered',
    phone: '099999996', password: 'not-used', authProvider: 'local',
  });
  return client._id as mongoose.Types.ObjectId;
}

async function seedAll() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barberIds = await Promise.all(
    BARBERS.map(b => getOrCreateBarber(b.email, b.name, b.lastname)),
  );
  console.log(`${BARBERS.length} barberos listos`);

  const registeredClientId = await getOrCreateRegisteredClient();
  console.log('Cliente registrado de prueba listo');

  let count = 0;
  const countsByService = new Map<string, number>();
  const countsByBarber = new Map<number, number>();
  const countsByStatus = new Map<string, number>();
  const dates = new Set<string>();

  for (const t of TURNOS) {
    const serviceIdx = SERVICE_CYCLE[count % SERVICE_CYCLE.length];
    const service = SEED_SERVICES[serviceIdx];

    await AppointmentModel.create({
      barberId: barberIds[t.barberIdx],
      clientName: `${TEST_PREFIX}${count}`,
      clientLastname: 'Seed',
      clientId: t.isRegistered ? registeredClientId : undefined,
      clientPhone: t.isRegistered ? undefined : '099999995',
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDuration: service.duration,
      date: t.date,
      startTime: t.startTime,
      endTime: t.endTime,
      status: t.status,
      paymentStatus: t.status === 'Completado' ? 'Pagado' : 'Pendiente',
      paymentMethod: 'local',
      cancelReason: t.status === 'Cancelado' ? 'Cliente no asistió' : undefined,
      cancelledAt: t.status === 'Cancelado' ? new Date() : undefined,
      cancelledBy: t.status === 'Cancelado' ? 'system' : undefined,
      statusHistory: [{ status: t.status, timestamp: new Date(), actor: 'system' }],
    });

    countsByService.set(service.name, (countsByService.get(service.name) ?? 0) + 1);
    countsByBarber.set(t.barberIdx, (countsByBarber.get(t.barberIdx) ?? 0) + 1);
    countsByStatus.set(t.status, (countsByStatus.get(t.status) ?? 0) + 1);
    dates.add(t.date);
    count++;
  }

  console.log(`\nSeed completado: ${count} turnos insertados`);
  console.log(`  Fechas distintas: ${dates.size}`);
  console.log(`  Barberos:`);
  for (const [idx, c] of countsByBarber) console.log(`    ${BARBERS[idx].name}: ${c} turnos`);
  console.log(`  Servicios:`);
  for (const [s, c] of countsByService) console.log(`    ${s}: ${c} turnos`);
  console.log(`  Estados:`);
  for (const [s, c] of countsByStatus) console.log(`    ${s}: ${c}`);
}

async function cleanupTestData() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const appsViejo = await AppointmentModel.deleteMany({ clientName: /^TEST_/ });
  const appsNuevo = await AppointmentModel.deleteMany({ clientName: { $regex: `^${TEST_PREFIX}` } });
  const totalApps = appsViejo.deletedCount + appsNuevo.deletedCount;
  await RegisteredClient.deleteMany({ email: { $in: [CLIENT_EMAIL, 'analytics-reg@test.com'] } });
  await Employee.deleteMany({
    email: { $regex: /analytics-test|seed-/ },
  });
  console.log(`Limpieza completada: ${totalApps} turnos eliminados`);
}

const COMMAND = process.argv[2];

if (require.main === module) {
  (async () => {
    if (COMMAND === 'cleanup') {
      await cleanupTestData();
    } else {
      await seedAll();
    }
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
