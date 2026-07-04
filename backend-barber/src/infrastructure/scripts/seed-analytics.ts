import 'dotenv/config';
import mongoose from 'mongoose';
import { Employee } from '../repositories/mongodb/models/barber.model';
import { RegisteredClient } from '../repositories/mongodb/models/client.model';
import AppointmentModel from '../repositories/mongodb/models/appointment.model';

// ── Servicios ──────────────────────────────────────────────
const SEED_SERVICES = [
  { id: 'svc-1', name: 'Corte de pelo',   price: 490, duration: 50 },
  { id: 'svc-2', name: 'Corte a máquina',  price: 350, duration: 30 },
  { id: 'svc-3', name: 'Barba',            price: 250, duration: 25 },
  { id: 'svc-4', name: 'Promo x2',         price: 450, duration: 70 },
];

const SERVICE_CYCLE = [0, 0, 1, 2, 0, 1, 3, 0, 2, 1, 0, 0, 1, 2, 3, 0, 1, 0, 2, 1];

// ── Barberos ───────────────────────────────────────────────
const BARBERS = [
  { email: 'seed-carlos@elitecut.com',  name: 'Carlos', lastname: 'Mendoza' },
  { email: 'seed-pedro@elitecut.com',   name: 'Pedro',  lastname: 'Giménez' },
  { email: 'seed-martin@elitecut.com',  name: 'Martín', lastname: 'Ortiz' },
];

// ── Clientes registrados (se crean en la colección RegisteredClient) ──
const REGISTERED_CLIENTS = [
  { name: 'Sofía',     lastname: 'García',     email: 'sofia.garcia@email.com',     phone: '099100001' },
  { name: 'Mateo',     lastname: 'Rodríguez',  email: 'mateo.rodriguez@email.com',  phone: '099100002' },
  { name: 'Isabella',  lastname: 'López',      email: 'isabella.lopez@email.com',   phone: '099100003' },
  { name: 'Benjamín',  lastname: 'Martínez',   email: 'benjamin.martinez@email.com',phone: '099100004' },
  { name: 'Valentina', lastname: 'González',   email: 'valentina.gonzalez@email.com',phone: '099100005' },
  { name: 'Santiago',  lastname: 'Pérez',      email: 'santiago.perez@email.com',   phone: '099100006' },
];

// ── Perfiles anónimos (se reutilizan para simular recurrencia) ──
const ANONYMOUS_PROFILES = [
  { name: 'Juan',      lastname: 'García',     phone: '099300001' },
  { name: 'Carlos',    lastname: 'Rodríguez',  phone: '099300002' },
  { name: 'Miguel',    lastname: 'Martínez',   phone: '099300003' },
  { name: 'Diego',     lastname: 'López',      phone: '099300004' },
  { name: 'Alejandro', lastname: 'González',   phone: '099300005' },
  { name: 'Facundo',   lastname: 'Pérez',      phone: '099300006' },
  { name: 'Lautaro',   lastname: 'Silva',      phone: '099300007' },
  { name: 'Emilia',    lastname: 'Díaz',       phone: '099300008' },
  { name: 'Valentina', lastname: 'Torres',     phone: '099300009' },
  { name: 'Camila',    lastname: 'Romero',     phone: '099300010' },
  { name: 'Lucía',     lastname: 'Álvarez',    phone: '099300011' },
  { name: 'Martina',   lastname: 'Moreno',     phone: '099300012' },
  { name: 'Florencia', lastname: 'Muñoz',      phone: '099300013' },
  { name: 'Agustina',  lastname: 'Rojas',      phone: '099300014' },
  { name: 'Julieta',   lastname: 'Castillo',   phone: '099300015' },
  { name: 'Tomás',     lastname: 'Morales',    phone: '099300016' },
  { name: 'Nicolás',   lastname: 'Ortiz',      phone: '099300017' },
  { name: 'Gabriel',   lastname: 'Núñez',      phone: '099300018' },
  { name: 'Fernando',  lastname: 'Sosa',       phone: '099300019' },
  { name: 'Ignacio',   lastname: 'Reyes',      phone: '099300020' },
  { name: 'Renata',    lastname: 'Castro',     phone: '099300021' },
  { name: 'Antonella', lastname: 'Pereira',    phone: '099300022' },
  { name: 'Malena',    lastname: 'Vázquez',    phone: '099300023' },
  { name: 'Selena',    lastname: 'Acosta',     phone: '099300024' },
  { name: 'Bruno',     lastname: 'Medina',     phone: '099300025' },
  { name: 'Lucas',     lastname: 'Suárez',     phone: '099300026' },
  { name: 'Gonzalo',   lastname: 'Herrera',    phone: '099300027' },
  { name: 'Mateo',     lastname: 'Guerrero',   phone: '099300028' },
  { name: 'Andrés',    lastname: 'Benítez',    phone: '099300029' },
  { name: 'Sergio',    lastname: 'Vega',       phone: '099300030' },
  { name: 'Pablo',     lastname: 'Molina',     phone: '099300031' },
  { name: 'Martín',    lastname: 'Cabrera',    phone: '099300032' },
  { name: 'Hugo',      lastname: 'Rivera',     phone: '099300033' },
  { name: 'Federico',  lastname: 'Campos',     phone: '099300034' },
  { name: 'Leandro',   lastname: 'Ferreira',   phone: '099300035' },
  { name: 'Ramiro',    lastname: 'Delgado',    phone: '099300036' },
  { name: 'Brian',     lastname: 'Pena',       phone: '099300037' },
  { name: 'Franco',    lastname: 'Miranda',    phone: '099300038' },
  { name: 'Alan',      lastname: 'Sandoval',   phone: '099300039' },
  { name: 'Joaquín',   lastname: 'Cruz',       phone: '099300040' },
  { name: 'Matías',    lastname: 'Godoy',      phone: '099300041' },
  { name: 'Thiago',    lastname: 'Olivera',    phone: '099300042' },
  { name: 'Luciana',   lastname: 'Méndez',     phone: '099300043' },
  { name: 'Candela',   lastname: 'Caceres',    phone: '099300044' },
  { name: 'Julián',    lastname: 'Santos',     phone: '099300045' },
];

// ── Data de turnos ─────────────────────────────────────────
// registeredClientIdx = índice en REGISTERED_CLIENTS (opcional)
// Sin registeredClientIdx → se asigna perfil anónimo cíclico
type RawTurno = {
  barberIdx: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  registeredClientIdx?: number;
};

// Contador global para asignar perfiles anónimos cíclicamente
let anonymousCycle = 0;

const TURNOS: RawTurno[] = [
  // ── Enero ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-01-05', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-05', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-07', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 1, date: '2026-01-07', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-09', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-01-12', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-15', startTime: '09:00', endTime: '09:30', status: 'NoShow' },
  { barberIdx: 2, date: '2026-01-19', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 1 },
  { barberIdx: 2, date: '2026-01-19', startTime: '10:00', endTime: '10:45', status: 'Completado' },
  { barberIdx: 0, date: '2026-01-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '10:00', endTime: '10:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-01-26', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-01-29', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },

  // ── Febrero ────────────────────────────────────────
  { barberIdx: 0, date: '2026-02-02', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-02', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 1, date: '2026-02-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-02-04', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-02-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-09', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 3 },
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
  { barberIdx: 2, date: '2026-02-23', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 4 },
  { barberIdx: 0, date: '2026-02-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-02-25', startTime: '10:00', endTime: '10:30', status: 'Completado' },

  // ── Marzo ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-03-02', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 5 },
  { barberIdx: 0, date: '2026-03-02', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-02', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-04', startTime: '10:00', endTime: '10:40', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-06', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-09', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-09', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 0, date: '2026-03-09', startTime: '11:00', endTime: '11:45', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-11', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-13', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-03-16', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-18', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-03-18', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 1 },
  { barberIdx: 1, date: '2026-03-18', startTime: '11:00', endTime: '11:30', status: 'NoShow' },
  { barberIdx: 1, date: '2026-03-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-20', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-20', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-23', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-03-23', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 1, date: '2026-03-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-27', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 2, date: '2026-03-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-30', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-03-30', startTime: '10:00', endTime: '10:30', status: 'Completado' },

  // ── Abril ──────────────────────────────────────────
  { barberIdx: 0, date: '2026-04-01', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-01', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-03', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-06', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-04-06', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 3 },
  { barberIdx: 2, date: '2026-04-06', startTime: '11:00', endTime: '11:30', status: 'Confirmado' },
  { barberIdx: 0, date: '2026-04-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-10', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-10', startTime: '10:00', endTime: '10:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-04-13', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 4 },
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
  { barberIdx: 0, date: '2026-04-27', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 3 },
  { barberIdx: 0, date: '2026-04-27', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-04-27', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-04-29', startTime: '09:00', endTime: '09:30', status: 'Completado' },

  // ── Mayo ───────────────────────────────────────────
  { barberIdx: 0, date: '2026-05-04', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-04', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 5 },
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
  { barberIdx: 1, date: '2026-05-13', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 2, date: '2026-05-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-15', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 0, date: '2026-05-18', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 1 },
  { barberIdx: 0, date: '2026-05-18', startTime: '11:00', endTime: '11:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '14:00', endTime: '14:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '15:00', endTime: '15:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-18', startTime: '16:00', endTime: '16:30', status: 'Confirmado' },
  { barberIdx: 1, date: '2026-05-20', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-05-20', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-05-22', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 2 },
  { barberIdx: 2, date: '2026-05-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-25', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-05-25', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 2 },
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
  { barberIdx: 0, date: '2026-06-08', startTime: '11:00', endTime: '11:30', status: 'Completado', registeredClientIdx: 5 },
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
  { barberIdx: 0, date: '2026-06-20', startTime: '09:00', endTime: '10:00', status: 'Completado', registeredClientIdx: 4 },
  { barberIdx: 0, date: '2026-06-20', startTime: '10:00', endTime: '10:30', status: 'NoShow' },
  { barberIdx: 1, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 0 },
  { barberIdx: 2, date: '2026-06-22', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-06-22', startTime: '10:00', endTime: '10:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 0, date: '2026-06-24', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 3 },
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
  { barberIdx: 2, date: '2026-07-01', startTime: '09:00', endTime: '09:30', status: 'Completado', registeredClientIdx: 5 },
  { barberIdx: 1, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Cancelado' },
  { barberIdx: 2, date: '2026-07-08', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 1, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-15', startTime: '09:00', endTime: '09:30', status: 'Completado' },
  { barberIdx: 2, date: '2026-07-15', startTime: '10:00', endTime: '10:30', status: 'Completado', registeredClientIdx: 4 },
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

async function getOrCreateRegisteredClients(): Promise<mongoose.Types.ObjectId[]> {
  const ids: mongoose.Types.ObjectId[] = [];
  for (const profile of REGISTERED_CLIENTS) {
    const existing = await RegisteredClient.findOne({ email: profile.email });
    if (existing) {
      ids.push(existing._id as mongoose.Types.ObjectId);
    } else {
      const client = await RegisteredClient.create({
        email: profile.email,
        name: profile.name,
        lastname: profile.lastname,
        phone: profile.phone,
        password: 'not-used',
        authProvider: 'local',
      });
      ids.push(client._id as mongoose.Types.ObjectId);
    }
  }
  return ids;
}

function getAnonymousProfile(index: number) {
  return ANONYMOUS_PROFILES[index % ANONYMOUS_PROFILES.length];
}

async function seedAll() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Conectado a MongoDB');

  const barberIds = await Promise.all(
    BARBERS.map(b => getOrCreateBarber(b.email, b.name, b.lastname)),
  );
  console.log(`${BARBERS.length} barberos listos`);

  const registeredClientIds = await getOrCreateRegisteredClients();
  console.log(`${REGISTERED_CLIENTS.length} clientes registrados listos`);

  let count = 0;
  const countsByService = new Map<string, number>();
  const countsByBarber = new Map<number, number>();
  const countsByStatus = new Map<string, number>();
  const dates = new Set<string>();

  for (const t of TURNOS) {
    const serviceIdx = SERVICE_CYCLE[count % SERVICE_CYCLE.length];
    const service = SEED_SERVICES[serviceIdx];

    let clientName: string;
    let clientLastname: string;
    let clientPhone: string | undefined;
    let clientId: mongoose.Types.ObjectId | undefined;

    if (t.registeredClientIdx !== undefined) {
      const profile = REGISTERED_CLIENTS[t.registeredClientIdx];
      clientName = profile.name;
      clientLastname = profile.lastname;
      clientPhone = profile.phone;
      clientId = registeredClientIds[t.registeredClientIdx];
    } else {
      const profile = getAnonymousProfile(anonymousCycle++);
      clientName = profile.name;
      clientLastname = profile.lastname;
      clientPhone = profile.phone;
      clientId = undefined;
    }

    await AppointmentModel.create({
      barberId: barberIds[t.barberIdx],
      clientName,
      clientLastname,
      clientId,
      clientPhone,
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
  const seedBarbers = await Employee.find({ email: { $regex: /^seed-/ } });
  const seedBarberIds = seedBarbers.map(b => b._id);
  const appsDeleted = await AppointmentModel.deleteMany({ barberId: { $in: seedBarberIds } });
  await Employee.deleteMany({ email: { $regex: /^seed-/ } });
  await RegisteredClient.deleteMany({ email: { $regex: /(^seed-reg@|@email\.com$)/ } });
  console.log(`Limpieza completada: ${appsDeleted.deletedCount} turnos eliminados, barberos y clientes seed eliminados`);
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
