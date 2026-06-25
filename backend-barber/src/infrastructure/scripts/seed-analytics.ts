import 'dotenv/config';
import mongoose from 'mongoose';
import { Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';

const TEST_PREFIX = 'SEED_';

// ── Barberos ──────────────────────────────────────────────
const BARBERS = [
  { email: 'seed-barber1@elitecut.com',  name: 'Analytics', lastname: 'Test' },
  { email: 'seed-barber2@elitecut.com',  name: 'Pepe',      lastname: 'TestOne' },
  { email: 'seed-barber3@elitecut.com',  name: 'Maria',     lastname: 'TestTwo' },
];

const CLIENT_EMAIL = 'seed-reg@test.com';

// ── Data de turnos ────────────────────────────────────────
// Distribución realista: ~110 turnos, Ene–Jul 2026, 3 barberos,
// varios estados, precios, clientes registrados y no registrados.
type RawTurno = {
  barberIdx: number;        // índice en BARBERS
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  price: number;
  duration: number;
  isRegistered?: boolean;   // true → usa clientId, false/null → solo phone
};

const TURNOS: RawTurno[] = [
  // ── Enero ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-01-05', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 400, duration: 30 },
  { barberIdx: 0, date: '2026-01-05', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 1, date: '2026-01-07', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 450, duration: 30, isRegistered: true },
  { barberIdx: 1, date: '2026-01-07', startTime: '10:00', endTime: '10:40', status: 'Completado', price: 600, duration: 40 },
  { barberIdx: 2, date: '2026-01-09', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 0, date: '2026-01-12', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 350, duration: 30 },
  { barberIdx: 0, date: '2026-01-12', startTime: '10:00', endTime: '10:30', status: 'Cancelado',  price: 400, duration: 30 },
  { barberIdx: 0, date: '2026-01-12', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'NoShow',     price: 450, duration: 30 },
  { barberIdx: 2, date: '2026-01-19', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30, isRegistered: true },
  { barberIdx: 2, date: '2026-01-19', startTime: '10:00', endTime: '10:45', status: 'Completado', price: 800, duration: 45 },
  { barberIdx: 0, date: '2026-01-22', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-01-26', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 1, date: '2026-01-26', startTime: '10:00', endTime: '10:30', status: 'Confirmado', price: 400, duration: 30 },
  { barberIdx: 1, date: '2026-01-26', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 2, date: '2026-01-29', startTime: '09:00', endTime: '09:30', status: 'Cancelado',  price: 500, duration: 30 },

  // ── Febrero ────────────────────────────────────────
  { barberIdx: 0, date: '2026-02-02', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 450, duration: 30 },
  { barberIdx: 0, date: '2026-02-02', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30, isRegistered: true },
  { barberIdx: 1, date: '2026-02-04', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 1, date: '2026-02-04', startTime: '10:00', endTime: '10:40', status: 'Completado', price: 700, duration: 40 },
  { barberIdx: 2, date: '2026-02-06', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 0, date: '2026-02-09', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 800, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-02-09', startTime: '10:00', endTime: '10:50', status: 'Completado', price: 900, duration: 50 },
  { barberIdx: 1, date: '2026-02-11', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 400, duration: 30 },
  { barberIdx: 2, date: '2026-02-13', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-02-13', startTime: '10:00', endTime: '10:30', status: 'NoShow',     price: 350, duration: 30 },
  { barberIdx: 2, date: '2026-02-13', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-02-16', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-02-16', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 1, date: '2026-02-18', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-02-18', startTime: '10:00', endTime: '10:30', status: 'Confirmado', price: 450, duration: 30 },
  { barberIdx: 1, date: '2026-02-18', startTime: '11:00', endTime: '11:40', status: 'Completado', price: 750, duration: 40 },
  { barberIdx: 1, date: '2026-02-18', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-02-20', startTime: '09:00', endTime: '09:30', status: 'Cancelado',  price: 400, duration: 30 },
  { barberIdx: 2, date: '2026-02-23', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-02-23', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-02-25', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-02-25', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 650, duration: 30 },

  // ── Marzo ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-03-02', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-03-02', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-03-02', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 1, date: '2026-03-04', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 1, date: '2026-03-04', startTime: '10:00', endTime: '10:40', status: 'Completado', price: 650, duration: 40 },
  { barberIdx: 2, date: '2026-03-06', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-03-06', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 400, duration: 30 },
  { barberIdx: 0, date: '2026-03-09', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 0, date: '2026-03-09', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 800, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-03-09', startTime: '11:00', endTime: '11:45', status: 'Completado', price: 900, duration: 45 },
  { barberIdx: 1, date: '2026-03-11', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-03-13', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-03-16', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-03-16', startTime: '10:00', endTime: '10:30', status: 'Cancelado',  price: 450, duration: 30 },
  { barberIdx: 0, date: '2026-03-16', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 1, date: '2026-03-18', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-03-18', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30, isRegistered: true },
  { barberIdx: 1, date: '2026-03-18', startTime: '11:00', endTime: '11:30', status: 'NoShow',     price: 350, duration: 30 },
  { barberIdx: 1, date: '2026-03-18', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-03-20', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 750, duration: 30 },
  { barberIdx: 2, date: '2026-03-20', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-03-23', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 350, duration: 30 },
  { barberIdx: 0, date: '2026-03-23', startTime: '10:00', endTime: '10:30', status: 'Cancelado',  price: 500, duration: 30 },
  { barberIdx: 1, date: '2026-03-25', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-03-27', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 800, duration: 30, isRegistered: true },
  { barberIdx: 2, date: '2026-03-27', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 450, duration: 30 },
  { barberIdx: 2, date: '2026-03-30', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 2, date: '2026-03-30', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30 },

  // ── Abril ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-04-01', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-04-01', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-04-03', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 2, date: '2026-04-06', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 400, duration: 30 },
  { barberIdx: 2, date: '2026-04-06', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30, isRegistered: true },
  { barberIdx: 2, date: '2026-04-06', startTime: '11:00', endTime: '11:30', status: 'Confirmado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-04-08', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 1, date: '2026-04-10', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 450, duration: 30 },
  { barberIdx: 1, date: '2026-04-10', startTime: '10:00', endTime: '10:30', status: 'Cancelado',  price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-04-13', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-04-13', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-04-13', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 750, duration: 30 },
  { barberIdx: 0, date: '2026-04-13', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 400, duration: 30 },
  { barberIdx: 2, date: '2026-04-15', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-04-17', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 1, date: '2026-04-17', startTime: '10:00', endTime: '10:40', status: 'Completado', price: 800, duration: 40 },
  { barberIdx: 0, date: '2026-04-20', startTime: '09:00', endTime: '09:30', status: 'NoShow',     price: 450, duration: 30 },
  { barberIdx: 2, date: '2026-04-22', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 2, date: '2026-04-22', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-04-24', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-04-27', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-04-27', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 0, date: '2026-04-27', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 800, duration: 30 },
  { barberIdx: 1, date: '2026-04-29', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },

  // ── Mayo ───────────────────────────────────────────
  { barberIdx: 0, date: '2026-05-04', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-05-04', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 650, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-05-04', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 0, date: '2026-05-04', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 450, duration: 30 },
  { barberIdx: 0, date: '2026-05-04', startTime: '15:00', endTime: '15:30', status: 'Completado', price: 800, duration: 30 },
  { barberIdx: 1, date: '2026-05-06', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 1, date: '2026-05-06', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-05-08', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 2, date: '2026-05-08', startTime: '10:00', endTime: '10:30', status: 'Cancelado',  price: 400, duration: 30 },
  { barberIdx: 0, date: '2026-05-11', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-05-11', startTime: '10:00', endTime: '10:40', status: 'Completado', price: 750, duration: 40 },
  { barberIdx: 0, date: '2026-05-11', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 1, date: '2026-05-13', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 1, date: '2026-05-13', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 800, duration: 30, isRegistered: true },
  { barberIdx: 2, date: '2026-05-15', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-05-15', startTime: '10:00', endTime: '10:30', status: 'NoShow',     price: 350, duration: 30 },
  { barberIdx: 0, date: '2026-05-18', startTime: '09:00', endTime: '09:30', status: 'Cancelado',  price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-05-18', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-05-18', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 0, date: '2026-05-18', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 0, date: '2026-05-18', startTime: '15:00', endTime: '15:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-05-18', startTime: '16:00', endTime: '16:30', status: 'Confirmado', price: 400, duration: 30 },
  { barberIdx: 1, date: '2026-05-20', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-05-20', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-05-22', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 750, duration: 30, isRegistered: true },
  { barberIdx: 2, date: '2026-05-22', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-05-25', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 750, duration: 30 },
  { barberIdx: 0, date: '2026-05-25', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 850, duration: 30, isRegistered: true },
  { barberIdx: 1, date: '2026-05-27', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 800, duration: 30 },
  { barberIdx: 1, date: '2026-05-27', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 500, duration: 30 },

  // ── Junio ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-06-01', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-06-01', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-06-01', startTime: '11:00', endTime: '11:40', status: 'Completado', price: 750, duration: 40 },
  { barberIdx: 0, date: '2026-06-01', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 400, duration: 30 },
  { barberIdx: 1, date: '2026-06-03', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-06-03', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30 },
  { barberIdx: 2, date: '2026-06-03', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 0, date: '2026-06-08', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-06-08', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 0, date: '2026-06-08', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 800, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-06-08', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-06-08', startTime: '15:00', endTime: '15:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-06-08', startTime: '16:00', endTime: '16:30', status: 'Completado', price: 900, duration: 30 },
  { barberIdx: 1, date: '2026-06-10', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-06-10', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-06-10', startTime: '09:00', endTime: '09:30', status: 'Cancelado',  price: 400, duration: 30 },
  { barberIdx: 2, date: '2026-06-10', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Cancelado',  price: 450, duration: 30 },
  { barberIdx: 0, date: '2026-06-12', startTime: '10:00', endTime: '10:35', status: 'Completado', price: 550, duration: 35 },
  { barberIdx: 1, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 2, date: '2026-06-12', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 300, duration: 30 },
  { barberIdx: 2, date: '2026-06-12', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-06-15', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-06-15', startTime: '09:30', endTime: '10:00', status: 'Cancelado',  price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-06-15', startTime: '10:00', endTime: '10:45', status: 'Confirmado', price: 500, duration: 45 },
  { barberIdx: 0, date: '2026-06-15', startTime: '11:00', endTime: '11:45', status: 'NoShow',     price: 500, duration: 45 },
  { barberIdx: 0, date: '2026-06-15', startTime: '12:00', endTime: '12:40', status: 'Completado', price: 700, duration: 40 },
  { barberIdx: 0, date: '2026-06-15', startTime: '14:00', endTime: '14:20', status: 'Completado', price: 350, duration: 20 },
  { barberIdx: 1, date: '2026-06-17', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 800, duration: 30 },
  { barberIdx: 2, date: '2026-06-17', startTime: '09:00', endTime: '09:30', status: 'NoShow',     price: 450, duration: 30 },
  { barberIdx: 0, date: '2026-06-20', startTime: '09:00', endTime: '10:00', status: 'Completado', price: 900, duration: 60, isRegistered: true },
  { barberIdx: 0, date: '2026-06-20', startTime: '10:00', endTime: '10:30', status: 'NoShow',     price: 400, duration: 30 },
  { barberIdx: 1, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 550, duration: 30, isRegistered: true },
  { barberIdx: 2, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 700, duration: 30 },
  { barberIdx: 2, date: '2026-06-22', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-06-24', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 650, duration: 30 },
  { barberIdx: 0, date: '2026-06-24', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 700, duration: 30, isRegistered: true },
  { barberIdx: 0, date: '2026-06-24', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 800, duration: 30 },
  { barberIdx: 0, date: '2026-06-24', startTime: '14:00', endTime: '14:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-06-24', startTime: '15:00', endTime: '15:30', status: 'Cancelado',  price: 400, duration: 30 },
  { barberIdx: 0, date: '2026-06-24', startTime: '16:00', endTime: '16:30', status: 'Completado', price: 900, duration: 30 },
  { barberIdx: 1, date: '2026-06-26', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-06-26', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 750, duration: 30 },
  { barberIdx: 0, date: '2026-06-29', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 0, date: '2026-06-29', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 0, date: '2026-06-29', startTime: '11:00', endTime: '11:30', status: 'Completado', price: 700, duration: 30 },

  // ── Julio (pocos, para tendencia) ───────────────────
  { barberIdx: 1, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 2, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 850, duration: 30, isRegistered: true },
  { barberIdx: 1, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Cancelado',  price: 400, duration: 30 },
  { barberIdx: 2, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 600, duration: 30 },
  { barberIdx: 1, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 750, duration: 30 },
  { barberIdx: 2, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 500, duration: 30 },
  { barberIdx: 2, date: '2026-07-15', startTime: '10:00', endTime: '10:30', status: 'Completado', price: 900, duration: 30, isRegistered: true },
  { barberIdx: 1, date: '2026-07-22', startTime: '09:00', endTime: '09:30', status: 'Completado', price: 650, duration: 30 },
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
    services: ['Corte de pelo', 'Afeitado', 'Barba'],
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

  // Crear barberos
  const barberIds = await Promise.all(
    BARBERS.map(b => getOrCreateBarber(b.email, b.name, b.lastname)),
  );
  console.log(`${BARBERS.length} barberos listos`);

  // Crear cliente registrado de prueba
  const registeredClientId = await getOrCreateRegisteredClient();
  console.log('Cliente registrado de prueba listo');

  // Insertar turnos
  let count = 0;
  for (const t of TURNOS) {
    const barberId = barberIds[t.barberIdx];
    await AppointmentModel.create({
      barberId,
      clientName: `${TEST_PREFIX}${count}`,
      clientLastname: 'Seed',
      clientId: t.isRegistered ? registeredClientId : undefined,
      clientPhone: t.isRegistered ? undefined : '099999995',
      serviceId: 'svc-test',
      serviceName: 'Servicio de prueba',
      servicePrice: t.price,
      serviceDuration: t.duration,
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
    count++;
  }

  // Resumen
  const byBarber = new Map<number, number>();
  const byStatus = new Map<string, number>();
  const dates = new Set<string>();
  for (const t of TURNOS) {
    byBarber.set(t.barberIdx, (byBarber.get(t.barberIdx) ?? 0) + 1);
    byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    dates.add(t.date);
  }

  console.log(`\nSeed completado: ${count} turnos insertados`);
  console.log(`  Fechas distintas: ${dates.size}`);
  console.log(`  Barberos:`);
  for (const [idx, c] of byBarber) console.log(`    ${BARBERS[idx].name}: ${c} turnos`);
  console.log(`  Estados:`);
  for (const [s, c] of byStatus) console.log(`    ${s}: ${c}`);
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
