import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiClock, FiDollarSign, FiUserPlus, FiAlertCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { Modal } from '../../../../components/common/Modal';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetDistribucionQuery, useGetClientesRecurrentesQuery } from '../../../../services/analyticsApi';
import { useGetAppointmentsQuery } from '../../../../services/appointmentApi';
import type { OverviewData } from '../../../../types/analytics';
import type { Appointment } from '../../../../types/booking';

interface KpiCardsProps {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  desde: string;
  hasta: string;
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}M`;
  if (m === 0) return `${h}H`;
  return `${h}H ${m}M`;
}

function IncomeBreakdownModal({ isOpen, onClose, desde, hasta }: { isOpen: boolean; onClose: () => void; desde: string; hasta: string }) {
  const { data, isLoading } = useGetDistribucionQuery({ desde, hasta }, { skip: !isOpen || !desde || !hasta });
  const entries = data?.byBarber ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Desglose de ingresos" size="md">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : entries.length === 0 ? (
        <p className="text-[14px] text-[#8A8A8A] text-center py-4">No hay datos de ingresos para este período.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[12px] text-[#8A8A8A] uppercase tracking-wider px-1 pb-2 border-b border-[#282828]">
            <span>Barbero</span>
            <span>Turnos</span>
            <span>Ingresos</span>
          </div>
          {entries.map((entry) => (
            <div key={entry.barberId} className="flex items-center justify-between rounded-[10px] bg-[#1A1A1A] px-3 py-2.5 text-[13px]">
              <span className="text-white font-medium">{entry.nombre}</span>
              <span className="text-[#8A8A8A]">{entry.cantidad}</span>
              <span className="text-green-400 font-medium">{formatCurrency(entry.ingresos)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-[10px] bg-[#242424] px-3 py-3 text-[14px] font-bold mt-1">
            <span className="text-white">Total</span>
            <span className="text-[#8A8A8A]">{entries.reduce((s, e) => s + e.cantidad, 0)}</span>
            <span className="text-green-400">{formatCurrency(entries.reduce((s, e) => s + e.ingresos, 0))}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NewClientsModal({ isOpen, onClose, desde, hasta, count }: { isOpen: boolean; onClose: () => void; desde: string; hasta: string; count: number }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevos clientes" size="md">
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="text-[48px] font-bold text-[#FF5C00]">{count}</div>
        <p className="text-[#8A8A8A] text-sm text-center">
          Clientes nuevos en el período seleccionado.
        </p>
        <p className="text-[12px] text-[#6A6A6A] text-center">
          {desde} — {hasta}
        </p>
      </div>
    </Modal>
  );
}

function PendingIncomeModal({ isOpen, onClose, desde, hasta }: { isOpen: boolean; onClose: () => void; desde: string; hasta: string }) {
  const { data: appointments = [], isLoading, isFetching } = useGetAppointmentsQuery(
    { dateFrom: desde, dateTo: hasta, paymentStatus: 'Pendiente' },
    { skip: !isOpen || !desde || !hasta },
  );

  const statusBadge = (status: Appointment['status']) => {
    const styles: Record<string, { bg: string; text: string }> = {
      Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
      Completado: { bg: 'bg-green-500/10', text: 'text-green-400' },
      Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
      NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    };
    const s = styles[status] ?? styles.Confirmado;
    return <span className={`text-[10px] font-medium ${s.bg} ${s.text} rounded-full px-2 py-0.5`}>{status}</span>;
  };

  const paymentBadge = (paymentStatus: Appointment['paymentStatus']) => {
    const styles: Record<string, { bg: string; text: string }> = {
      Pendiente: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
      Pagado: { bg: 'bg-green-500/10', text: 'text-green-400' },
      Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
    };
    const s = styles[paymentStatus] ?? styles.Pendiente;
    return <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${s.bg} ${s.text}`}>{paymentStatus}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Turnos con pago pendiente" size="lg">
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-[14px] text-[#8A8A8A] text-center py-8">No hay turnos con pago pendiente.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 flex flex-col gap-2 hover:border-[#FF5C00]/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{a.clientName} {a.clientLastname}</p>
                  <div className="flex items-center gap-3 text-[12px] text-[#8A8A8A] mt-1">
                    <span>{a.date}</span>
                    <span>{a.startTime} - {a.endTime}</span>
                    <span>{a.serviceName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#6A6A6A] uppercase tracking-wider">Turno</span>
                    {statusBadge(a.status)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#6A6A6A] uppercase tracking-wider">Pago</span>
                    {paymentBadge(a.paymentStatus)}
                  </div>
                </div>
              </div>
              <div className="text-[12px] text-[#8A8A8A]">
                <span className="text-green-400 font-medium">${a.servicePrice.toLocaleString('es-UY')}</span>
                <span className="mx-2">·</span>
                <span>{a.barberName ?? 'Sin barbero'}</span>
              </div>
            </div>
          ))}
          {isFetching && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const CARDS_CONFIG = [
  { key: 'reservas', label: 'Reservas', icon: FiUsers, format: (v: number) => String(v), clickable: true },
  { key: 'duracion', label: 'Duración total', icon: FiClock, format: (v: number) => formatDuration(v), clickable: false },
  { key: 'ingresos', label: 'Ingresos totales', icon: FiDollarSign, format: (v: number) => formatCurrency(v), clickable: true },
  { key: 'ingresosPendientes', label: 'Ingresos pendientes', icon: FiAlertCircle, format: (v: number) => formatCurrency(v), clickable: true },
  { key: 'tasaCancelacion', label: 'Tasa cancelación', icon: FiXCircle, format: (v: number) => `${v}%`, clickable: false },
  { key: 'clientes', label: 'Nuevos clientes', icon: FiUserPlus, format: (v: number) => String(v), clickable: true },
  { key: 'retorno', label: 'Clientes recurrentes', icon: FiRefreshCw, format: (v: number) => `${v}%`, clickable: false },
];

export default function KpiCards({ data, loading, error, desde, hasta }: KpiCardsProps) {
  const navigate = useNavigate();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showPendingIncomeModal, setShowPendingIncomeModal] = useState(false);
  const [showNewClientsModal, setShowNewClientsModal] = useState(false);

  const { data: retornoData } = useGetClientesRecurrentesQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  if (error) {
    return (
      <div className="text-[#FF5C00] text-sm bg-[#1A1A1A] rounded-2xl p-5 border border-[#282828]">
        Error al cargar KPIs: {error}
      </div>
    );
  }

  const totalCancelados = data ? (data.estadisticasPorEstado.cancelado ?? 0) + (data.estadisticasPorEstado.noshow ?? 0) : 0;
  const tasaCancelacion = data && data.totalReservas > 0 ? Math.round((totalCancelados / data.totalReservas) * 100) : 0;

  const values = data
    ? [data.totalReservas, data.duracionTotalMinutos, data.ingresosTotales, data.ingresosPendientes, tasaCancelacion, data.nuevosClientes, retornoData?.tasaRetorno ?? null]
    : [null, null, null, null, null, null, null];

  const handleCardClick = (key: string) => {
    switch (key) {
      case 'reservas':
        navigate(`/admin/turnos?dateFrom=${desde}&dateTo=${hasta}`);
        break;
      case 'ingresos':
        setShowIncomeModal(true);
        break;
      case 'ingresosPendientes':
        setShowPendingIncomeModal(true);
        break;
      case 'clientes':
        setShowNewClientsModal(true);
        break;
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {CARDS_CONFIG.map((card, idx) => {
          if (!card.clickable) {
            return (
              <div
                key={card.key}
                className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A] text-sm font-medium">{card.label}</span>
                  <card.icon className="text-[#FF5C00] text-xl" />
                </div>
                <span className="text-white text-2xl font-bold">
                  {loading ? (
                    <span className="inline-block w-20 h-6 bg-[#242424] rounded animate-pulse" />
                  ) : values[idx] !== null ? (
                    card.format(values[idx]!)
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            );
          }
          return (
            <button
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3 text-left hover:border-[#FF5C00]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A] text-sm font-medium">{card.label}</span>
                <card.icon className="text-[#FF5C00] text-xl" />
              </div>
              <span className="text-white text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-20 h-6 bg-[#242424] rounded animate-pulse" />
                ) : values[idx] !== null ? (
                  card.format(values[idx]!)
                ) : (
                  '—'
                )}
              </span>
            </button>
          );
        })}
      </div>
      <IncomeBreakdownModal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} desde={desde} hasta={hasta} />
      <PendingIncomeModal isOpen={showPendingIncomeModal} onClose={() => setShowPendingIncomeModal(false)} desde={desde} hasta={hasta} />
      <NewClientsModal isOpen={showNewClientsModal} onClose={() => setShowNewClientsModal(false)} desde={desde} hasta={hasta} count={data?.nuevosClientes ?? 0} />
    </>
  );
}
