import type { IAdminRaw, IEmployeeRaw } from '../models/barber.model';

export function isBarberRaw(doc: unknown): doc is IEmployeeRaw | IAdminRaw {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;

  if (d._id == null || typeof (d._id as Record<string, unknown>).toString !== 'function') return false;
  if (typeof d.email !== 'string' || d.email.length === 0) return false;
  if (typeof d.password !== 'string') return false;
  if (typeof d.name !== 'string' || d.name.length === 0) return false;
  if (typeof d.lastname !== 'string' || d.lastname.length === 0) return false;
  if (typeof d.phone !== 'string' || d.phone.length === 0) return false;
  if (d.kind !== 'Empleado' && d.kind !== 'Admin') return false;

  return true;
}
