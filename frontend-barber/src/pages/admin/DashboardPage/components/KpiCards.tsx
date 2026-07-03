import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiClock, FiDollarSign, FiUserPlus } from 'react-icons/fi';
import { Modal } from '../../../../components/common/Modal';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetDistribucionQuery } from '../../../../services/analyticsApi';
import type { OverviewData } from '../../../../types/analytics';

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

const CARDS_CONFIG = [
  { key: 'reservas', label: 'Reservas', icon: FiUsers, format: (v: number) => String(v), clickable: true },
  { key: 'duracion', label: 'Duración total', icon: FiClock, format: (v: number) => formatDuration(v), clickable: false },
  { key: 'ingresos', label: 'Ingresos totales', icon: FiDollarSign, format: (v: number) => formatCurrency(v), clickable: true },
  { key: 'clientes', label: 'Nuevos clientes', icon: FiUserPlus, format: (v: number) => String(v), clickable: true },
];

export default function KpiCards({ data, loading, error, desde, hasta }: KpiCardsProps) {
  const navigate = useNavigate();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showNewClientsModal, setShowNewClientsModal] = useState(false);

  if (error) {
    return (
      <div className="text-[#FF5C00] text-sm bg-[#1A1A1A] rounded-2xl p-5 border border-[#282828]">
        Error al cargar KPIs: {error}
      </div>
    );
  }

  const values = data
    ? [data.totalReservas, data.duracionTotalMinutos, data.ingresosTotales, data.nuevosClientes]
    : [null, null, null, null];

  const handleCardClick = (key: string) => {
    switch (key) {
      case 'reservas':
        navigate(`/admin/turnos?dateFrom=${desde}&dateTo=${hasta}`);
        break;
      case 'ingresos':
        setShowIncomeModal(true);
        break;
      case 'clientes':
        setShowNewClientsModal(true);
        break;
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <NewClientsModal isOpen={showNewClientsModal} onClose={() => setShowNewClientsModal(false)} desde={desde} hasta={hasta} count={data?.nuevosClientes ?? 0} />
    </>
  );
}
