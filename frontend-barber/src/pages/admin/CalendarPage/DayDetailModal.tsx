import React, { useState } from 'react';
import { FiClock, FiLock, FiTrash2, FiUser } from 'react-icons/fi';
import { Modal, BarberAvatar, ConfirmModal, useToast } from '../../../components/common';
import { getAccessToken } from '../../../services/api';
import { AppointmentActionsMenu } from '../AppointmentsPage/AppointmentActionsMenu';
import type { AppointmentActions } from '../AppointmentsPage/useAppointmentActions';
import type { Appointment, BarberBlock } from '../../../types/booking';

interface DayDetailModalProps {
  isOpen: boolean;
  date: string;
  appointments: Appointment[];
  blocks: BarberBlock[];
  onClose: () => void;
  onBlockDeleted: () => void;
  actions: AppointmentActions;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function parseDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} de ${MONTHS[monthIndex]}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, date, appointments, blocks, onClose, onBlockDeleted, actions }) => {
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<BarberBlock | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const hasBlocks = blocks.length > 0;
  const hasAppointments = appointments.length > 0;

  const handleDeleteBlock = async () => {
    const block = confirmDeleteBlock;
    if (!block) return;

    setIsDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/barbers/${block.barberId}/blocks/${block.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Error al eliminar bloque' }));
        throw new Error(data.error || 'Error al eliminar bloque');
      }

      setConfirmDeleteBlock(null);
      onBlockDeleted();
      showToast('Bloque eliminado');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo eliminar el bloque', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={parseDate(date)} size="lg">
      {hasBlocks && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[#8A8A8A] uppercase tracking-wider">Bloqueado</p>
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-[12px] border border-dashed border-[#505050] bg-[#1A1A1A]/50 px-4 py-2.5">
              <FiLock className="shrink-0 text-[#8A8A8A]" size={14} />
              <span className="flex-1 text-[13px] text-[#8A8A8A]">
                {b.startTime} - {b.endTime}
              </span>
              <button
                onClick={() => setConfirmDeleteBlock(b)}
                className="flex items-center justify-center w-7 h-7 rounded-full border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer shrink-0"
                aria-label="Eliminar bloque"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {hasAppointments ? (
        <div className="flex flex-col gap-3">
          {appointments.map((a) => {
            const style = statusStyles[a.status] ?? statusStyles.Confirmado;
            return (
              <div key={a.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BarberAvatar
                      name={a.barberName?.split(' ')[0] ?? '?'}
                      lastname={a.barberName?.split(' ').slice(1).join(' ') ?? '?'}
                      photoUrl={a.barberPhotoUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-white truncate">
                        {a.barberName ?? 'Sin barbero'}
                      </p>
                      <p className="text-[12px] text-[#8A8A8A] truncate">{a.serviceName}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                    <AppointmentActionsMenu appointment={a} actions={actions} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[12px] text-[#8A8A8A]">
                  <span className="flex items-center gap-1.5">
                    <FiClock className="text-[#FF5C00]" />
                    {formatTime(a.startTime)} - {formatTime(a.endTime)}
                  </span>
                  <button
                    type="button"
                    onClick={() => actions.setDetailTarget(a)}
                    className="flex items-center gap-1.5 text-[#8A8A8A] hover:text-[#FF5C00] transition-colors cursor-pointer"
                    title="Ver detalle del turno"
                  >
                    <FiUser className="text-[#FF5C00]" />
                    <span className="underline decoration-dotted underline-offset-2">{a.clientName} {a.clientLastname}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !hasBlocks && <p className="text-[14px] text-[#8A8A8A]">Sin turnos para esta fecha.</p>
      )}

      <ConfirmModal
        isOpen={confirmDeleteBlock !== null}
        onClose={() => setConfirmDeleteBlock(null)}
        onConfirm={handleDeleteBlock}
        title="Eliminar bloque"
        message={
          confirmDeleteBlock
            ? `¿Eliminar bloque de ${confirmDeleteBlock.startTime} a ${confirmDeleteBlock.endTime}?`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        loading={isDeleting}
      />
    </Modal>
  );
};
