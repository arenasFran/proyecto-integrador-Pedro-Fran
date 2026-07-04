export interface OverviewData {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  ingresosPendientes: number;
  nuevosClientes: number;
  estadisticasPorEstado: Record<string, number>;
}

export interface HeatmapEntry {
  fecha: string;
  cantidad: number;
}

export interface ReservasGananciasEntry {
  periodo: string;
  cantidadReservas: number;
  ganancias: number;
}

export interface DistribucionEntry {
  barberId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface DistribucionData {
  byBarber: DistribucionEntry[];
}

export type Granularidad = 'diario' | 'semanal' | 'mensual' | 'anual';

export interface HoraEntry {
  hora: number;
  cantidad: number;
}

export interface DiaSemanaEntry {
  dia: number;
  diaNombre: string;
  cantidad: number;
}

export interface ClientesRecurrentesData {
  totalClientes: number;
  recurrentes: number;
  tasaRetorno: number;
  nuevos: number;
}

export interface IngresoServicioEntry {
  serviceId: string;
  serviceName: string;
  cantidad: number;
  ingresos: number;
}

export interface ClienteData {
  key: string;
  clientId: string | null;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  kind: 'Registrado' | 'NoRegistrado';
  totalVisits: number;
  totalSpent: number;
  firstVisit: string;
  lastVisit: string;
}

export interface ClientAppointmentEntry {
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  servicePrice: number;
  status: string;
  paymentStatus: string;
  barberId: string;
}

export interface ReportFilters {
  granularidad: Granularidad;
  barberId?: string;
  serviceId?: string;
  status?: string;
}
