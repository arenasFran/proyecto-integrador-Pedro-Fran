import { Modal } from '../../../../components/common/Modal';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetClientAppointmentsQuery } from '../../../../services/analyticsApi';
import type { ClienteData } from '../../../../types/analytics';

const statusBadge = (status: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    Completado: { bg: 'bg-green-500/10', text: 'text-green-400' },
    Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
    NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  };
  const s = styles[status] ?? styles.Confirmado;
  return <span className={`text-[10px] font-medium ${s.bg} ${s.text} rounded-full px-2 py-0.5`}>{status}</span>;
};

export function ClientHistoryModal({ isOpen, onClose, client }: { isOpen: boolean; onClose: () => void; client: ClienteData }) {
  const { data: appointments = [], isLoading } = useGetClientAppointmentsQuery(client.key, { skip: !isOpen });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historial: ${client.clientName} ${client.clientLastname}`} size="lg">
      <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-[10px] bg-[#1A1A1A] text-[12px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[#6A6A6A] text-[10px] uppercase tracking-wider">Teléfono</span>
          <span className="text-white">{client.clientPhone ?? '—'}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[#6A6A6A] text-[10px] uppercase tracking-wider">Email</span>
          <span className="text-white">{client.clientEmail ?? '—'}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[#6A6A6A] text-[10px] uppercase tracking-wider">Tipo</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${client.kind === 'Registrado' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 text-gray-400'}`}>
            {client.kind}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[#6A6A6A] text-[10px] uppercase tracking-wider">Total visitas</span>
          <span className="text-white font-medium">{client.totalVisits}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[#6A6A6A] text-[10px] uppercase tracking-wider">Total gastado</span>
          <span className="text-green-400 font-medium">${client.totalSpent.toLocaleString('es-UY')}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-[14px] text-[#8A8A8A] text-center py-4">No hay turnos registrados para este cliente.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-[11px] text-[#8A8A8A] uppercase tracking-wider px-1 pb-2 border-b border-[#282828]">
            <span className="w-24">Fecha</span>
            <span className="w-16">Horario</span>
            <span className="w-20">Servicio</span>
            <span className="w-16 text-right">Precio</span>
            <span className="w-20 text-right">Estado</span>
          </div>
          {appointments.map((a, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-[10px] bg-[#1A1A1A] px-3 py-2.5 text-[13px]">
              <span className="w-24 text-white">{a.date}</span>
              <span className="w-16 text-[#8A8A8A]">{a.startTime} - {a.endTime}</span>
              <span className="w-20 text-[#8A8A8A] truncate">{a.serviceName}</span>
              <span className="w-16 text-right text-green-400 font-medium">${a.servicePrice.toLocaleString('es-UY')}</span>
              <div className="w-20 text-right">{statusBadge(a.status)}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
