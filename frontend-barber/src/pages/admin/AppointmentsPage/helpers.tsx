import type { Appointment, AppointmentStatus, CreatedBy } from '../../../types/booking';

export const statusStyles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

export const methodLabel: Record<string, string> = { local: 'Local', online: 'Online', memberPass: 'Membresía' };

export const methodLabelExport: Record<string, string> = { local: 'Local', online: 'Online', memberPass: 'Membresía' };

export const statusLabel: Record<string, string> = {
  Confirmado: 'Confirmado', Completado: 'Completado', Cancelado: 'Cancelado', NoShow: 'No asistió',
};

export function formatTimeRange(start: string, end: string) {
  const short = (t: string) => { const [h, m] = t.split(':'); return `${h}:${m}`; };
  return `${short(start)} - ${short(end)}`;
}

export function paymentBadge(ps: Appointment['paymentStatus']) {
  const styles: Record<string, { bg: string; text: string }> = {
    Pendiente: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    Pagado: { bg: 'bg-green-500/10', text: 'text-green-400' },
    Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
  };
  const s = styles[ps] ?? styles.Pendiente;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>{ps}</span>
  );
}

export function originBadge(cb?: CreatedBy) {
  if (!cb) return <span className="text-[11px] text-[#8A8A8A]">—</span>;
  const config: Record<string, { label: string; color: string }> = {
    staff: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400' },
    registered: { label: 'Online', color: 'bg-blue-500/10 text-blue-400' },
    anonymous: { label: 'Invitado', color: 'bg-gray-500/10 text-gray-400' },
  };
  const c = config[cb.type] ?? { label: cb.type, color: 'bg-gray-500/10 text-gray-400' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c.color}`}>{c.label}</span>;
}

export function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'data' in err) return String((err as { data: { message?: string } }).data?.message ?? (err as { data: unknown }).data);
  return 'Error inesperado';
}

export function exportCSV(appointments: Appointment[]) {
  const headers = ['Fecha', 'Hora inicio', 'Hora fin', 'Cliente', 'Apellido', 'Email', 'Teléfono', 'Barbero', 'Servicio', 'Duración (min)', 'Precio', 'Estado', 'Estado de pago', 'Método de pago', 'Origen'];
  const rows = appointments.map((a) => [
    a.date,
    a.startTime,
    a.endTime,
    a.clientName,
    a.clientLastname,
    a.clientEmail ?? '',
    a.clientPhone ?? '',
    a.barberName ?? '',
    a.serviceName,
    String(a.serviceDuration),
    String(a.servicePrice),
    a.status,
    a.paymentStatus,
    methodLabelExport[a.paymentMethod] ?? a.paymentMethod,
    a.createdBy?.type === 'staff' ? 'Admin' : a.createdBy?.type === 'registered' ? 'Online' : a.createdBy?.type === 'anonymous' ? 'Invitado' : '',
  ]);
  const bom = '\uFEFF';
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `turnos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
