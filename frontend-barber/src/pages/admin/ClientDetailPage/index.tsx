import { useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiPhone, FiMail, FiCalendar, FiDollarSign, FiTrendingUp,
  FiAward, FiUser, FiClock, FiScissors, FiCreditCard, FiUserCheck,
  FiActivity, FiPercent, FiTag, FiAlertTriangle, FiAlertOctagon, FiUserX, FiX,
} from 'react-icons/fi';
import { Spinner, Button, BarberAvatar, useToast } from '../../../components/common';
import { useGetClientesListQuery } from '../../../services/analyticsApi';
import { useSancionarClienteMutation, useLevantarSancionMutation } from '../../../services/clientApi';
import { useGetAppointmentsQuery } from '../../../services/appointmentApi';
import { useGetMembershipByUserIdQuery } from '../../../services/membershipApi';
import { useAppointmentActions } from '../AppointmentsPage/useAppointmentActions';
import { AppointmentActionsMenu } from '../AppointmentsPage/AppointmentActionsMenu';
import { AppointmentActionModals } from '../AppointmentsPage/AppointmentActionModals';
import { formatDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';
import type { ClienteData } from '../../../types/analytics';
import type { Appointment } from '../../../types/booking';

// El backend rechaza rangos de más de 2 años (clientesListQuerySchema), así que
// "de por vida" no es viable de un solo pedido. Usamos la ventana más ancha
// permitida, centrada en hoy: cubre turnos fechados a futuro (Completado no
// exige que la fecha ya haya pasado) y casi un año hacia atrás.
const HALF_WINDOW_DAYS = 350; // < 731/2, deja margen para no pasarse por años bisiestos
const HISTORY_LIMIT = 100; // getAppointments valida limit <= 100 (appointmentQuerySchema); es el máximo permitido

function allTimeRange(): { desde: string; hasta: string } {
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const desde = new Date();
  desde.setDate(desde.getDate() - HALF_WINDOW_DAYS);
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + HALF_WINDOW_DAYS);
  return { desde: toDateStr(desde), hasta: toDateStr(hasta) };
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
};

const paymentStyles: Record<string, { bg: string; text: string }> = {
  Pendiente: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  Pagado: { bg: 'bg-green-500/10', text: 'text-green-400' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

function Badge({ label, styles }: { label: string; styles?: { bg: string; text: string } }) {
  const s = styles ?? { bg: 'bg-gray-500/10', text: 'text-gray-400' };
  return <span className={`text-[11px] font-medium ${s.bg} ${s.text} rounded-full px-2 py-0.5`}>{label}</span>;
}

function StatTile({ icon: Icon, label, value, valueClassName }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 flex flex-col gap-1">
      <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><Icon size={12} /> {label}</span>
      <span className={`text-xl font-bold ${valueClassName ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-2 text-[13px] text-[#8A8A8A] first:pt-0 last:pb-0">
      <Icon className="shrink-0 text-[#FF5C00]" size={14} />
      <span className="text-[#6A6A6A] shrink-0">{label}</span>
      <span className="text-white truncate">{value}</span>
    </div>
  );
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function daysSince(dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const diffMs = new Date(now.toDateString()).getTime() - new Date(then.toDateString()).getTime();
  // Un turno a futuro marcado Completado (el dominio no exige que la fecha ya
  // haya pasado) puede dejar lastVisit en el futuro; nunca mostramos negativo.
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export default function ClientDetailPage() {
  const { clientKey } = useParams<{ clientKey: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const actions = useAppointmentActions();
  const { showToast } = useToast();

  const [sancionarOpen, setSancionarOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  // El state pasado por ClientsPage es solo un placeholder para el primer render:
  // refleja los totales de por vida, y puede haber quedado desactualizado (ej. un
  // turno recién completado). La fuente real siempre es el fetch de abajo.
  const stateClient = (location.state as { client?: ClienteData } | null)?.client;

  const { data: clientesList, isLoading: isLoadingList, refetch: refetchClientes } = useGetClientesListQuery(
    allTimeRange(),
    { refetchOnMountOrArgChange: true }
  );

  const [sancionarCliente, { isLoading: isSancionando }] = useSancionarClienteMutation();
  const [levantarSancion, { isLoading: isLevantando }] = useLevantarSancionMutation();

  // El link de ClientsPage manda la clave compuesta ("reg_"/"anon_" + id).
  // El link de AppointmentDetailModal no puede armar esa clave (el backend
  // nunca completa clientKind en un turno), así que manda el clientId a secas.
  // Soportamos ambos.
  const freshClient = clientesList?.find((c) => c.key === clientKey || c.clientId === clientKey);
  const client = freshClient ?? stateClient;

  const { data: appointments = [], isLoading: isLoadingAppointments } = useGetAppointmentsQuery(
    { clientId: client?.clientId ?? undefined, includeBarber: 'true', limit: HISTORY_LIMIT },
    { skip: !client?.clientId }
  );

  const { data: membership } = useGetMembershipByUserIdQuery(
    client?.clientId ?? '',
    { skip: !client?.clientId }
  );

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => (a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date))),
    [appointments]
  );

  const insights = useMemo(() => {
    const completed = sortedAppointments.filter((a) => a.status === 'Completado');
    const noShow = sortedAppointments.filter((a) => a.status === 'NoShow');
    // Turnos que ya deberían haber pasado (excluye los Confirmado a futuro,
    // que todavía no tuvieron oportunidad de generar una inasistencia).
    const pastDue = sortedAppointments.filter((a) => a.status !== 'Confirmado');

    const noShowRate = pastDue.length > 0 ? (noShow.length / pastDue.length) * 100 : null;
    const avgTicket = completed.length > 0 && client ? client.totalSpent / completed.length : null;
    const favoriteService = mostFrequent(sortedAppointments.map((a) => a.serviceName));
    const favoriteBarber = mostFrequent(sortedAppointments.map((a) => a.barberName).filter((n): n is string => !!n));

    return { noShowRate, avgTicket, favoriteService, favoriteBarber };
  }, [sortedAppointments, client]);

  const handleSancionar = async () => {
    if (!client?.clientId) return;
    try {
      await sancionarCliente({ clientId: client.clientId, motivo: motivo.trim() || 'Inasistencias reiteradas' }).unwrap();
      setSancionarOpen(false);
      setMotivo('');
      await refetchClientes();
      showToast('Cliente sancionado');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo sancionar al cliente', 'error');
    }
  };

  const handleLevantarSancion = async () => {
    if (!client?.clientId) return;
    try {
      await levantarSancion(client.clientId).unwrap();
      await refetchClientes();
      showToast('Sanción levantada');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo levantar la sanción', 'error');
    }
  };

  if (!stateClient && isLoadingList) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <FiUserCheck size={48} className="text-[#282828]" />
        <p className="text-[#8A8A8A] text-sm">No encontramos este cliente.</p>
        <Button variant="secondary" icon={FiArrowLeft} onClick={() => navigate('/admin/clientes')}>
          Volver a clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
      <button
        onClick={() => navigate('/admin/clientes')}
        className="flex items-center gap-1.5 text-[13px] text-[#8A8A8A] hover:text-white transition-colors w-fit"
      >
        <FiArrowLeft size={14} /> Volver a clientes
      </button>

      <div className="border-b border-[#202020] pb-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BarberAvatar name={client.clientName} lastname={client.clientLastname} photoUrl={client.clientPhotoUrl} size="xl" />
            <div className="min-w-0">
              <h1 className="flex break-words items-center gap-2 text-[28px] font-bold tracking-[-0.03em] text-white sm:text-[32px]">
                {client.clientName} {client.clientLastname}
                {client.membershipStatus === 'active' && <FiAward className="text-[#FF5C00]" />}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  label={client.kind === 'Registrado' ? 'Registrado' : 'Anónimo'}
                  styles={client.kind === 'Registrado' ? { bg: 'bg-purple-500/10', text: 'text-purple-400' } : undefined}
                />
                {client.membershipStatus === 'active' && (
                  <Badge label="Membresía activa" styles={{ bg: 'bg-[#FF5C00]/10', text: 'text-[#FF5C00]' }} />
                )}
              </div>
            </div>
          </div>

          {client.clientId && (
            <Button
              variant="outline"
              icon={FiCalendar}
className="w-full shrink-0 sm:w-auto"
              onClick={() => actions.handleCreateForClient({
                clientId: client.clientId ?? undefined,
                clientName: client.clientName,
                clientLastname: client.clientLastname,
                clientPhone: client.clientPhone,
                clientEmail: client.clientEmail,
                clientKind: client.kind,
              } as Appointment)}
            >
              Crear turno para este cliente
            </Button>
          )}
        </div>
      </div>

      {client.sancionado ? (
        <div className="rounded-[12px] border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <FiAlertOctagon className="text-red-400 shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-red-400">Cliente sancionado por inasistencias</p>
            <p className="text-[12px] text-red-400/80">
              No puede reservar turnos.
              {client.motivoSancion ? ` Motivo: ${client.motivoSancion}.` : ''}
              {client.fechaSancion ? ` Sancionado el ${formatDate(client.fechaSancion)}.` : ''}
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 border-red-500/40 text-red-400 hover:border-red-500/70 hover:text-red-300"
            loading={isLevantando}
            onClick={handleLevantarSancion}
          >
            Levantar sanción
          </Button>
        </div>
      ) : client.noShowCount >= 3 ? (
        <div className="rounded-[12px] border border-yellow-500/30 bg-yellow-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <FiAlertTriangle className="text-yellow-400 shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-yellow-400">
              Este cliente acumuló {client.noShowCount} inasistencias
            </p>
            <p className="text-[12px] text-yellow-400/80">
              Podés sancionarlo para que no pueda reservar turnos hasta que levantes la sanción.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 border-yellow-500/40 text-yellow-400 hover:border-yellow-500/70 hover:text-yellow-300"
            icon={FiUserX}
            onClick={() => setSancionarOpen(true)}
          >
            Sancionar cliente
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-3">Contacto</h4>
          <div className="divide-y divide-[#282828]/60">
            <InfoRow icon={FiPhone} label="Teléfono" value={client.clientPhone ?? '—'} />
            <InfoRow icon={FiMail} label="Email" value={client.clientEmail ?? '—'} />
            <InfoRow icon={FiUser} label="Cliente desde" value={formatDate(client.registeredAt)} />
          </div>
        </div>

        <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-3">Preferencias</h4>
          <div className="divide-y divide-[#282828]/60">
            <InfoRow icon={FiScissors} label="Servicio favorito" value={insights.favoriteService ?? '—'} />
            <InfoRow icon={FiUser} label="Barbero favorito" value={insights.favoriteBarber ?? '—'} />
            <InfoRow
              icon={FiAward}
              label="Membresía"
              value={membership?.active ? 'Activa' : membership?.history.length ? 'Vencida' : 'Sin membresía'}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile icon={FiTrendingUp} label="Total reservas" value={String(client.totalVisits)} />
        <StatTile icon={FiDollarSign} label="Total gastado" value={formatCurrency(client.totalSpent)} valueClassName="text-green-400" />
        <StatTile icon={FiCalendar} label="Primera reserva" value={client.firstVisit ? formatDate(client.firstVisit) : '—'} />
        <StatTile icon={FiClock} label="Última reserva" value={client.lastVisit ? formatDate(client.lastVisit) : '—'} />
        <StatTile
          icon={FiActivity}
          label="Días sin venir"
          value={client.lastVisit ? `${daysSince(client.lastVisit)} días` : 'Sin visitas'}
        />
        <StatTile
          icon={FiTag}
          label="Ticket promedio"
          value={insights.avgTicket !== null ? formatCurrency(Math.round(insights.avgTicket)) : '—'}
          valueClassName="text-green-400"
        />
        <StatTile
          icon={FiPercent}
          label="Tasa de inasistencia"
          value={insights.noShowRate !== null ? `${insights.noShowRate.toFixed(0)}%` : '—'}
          valueClassName={insights.noShowRate !== null && insights.noShowRate >= 20 ? 'text-red-400' : undefined}
        />
        <StatTile
          icon={FiAlertTriangle}
          label="Inasistencias"
          value={String(client.noShowCount ?? 0)}
          valueClassName={client.sancionado ? 'text-red-400' : (client.noShowCount ?? 0) >= 3 ? 'text-yellow-400' : undefined}
        />
        <StatTile
          icon={FiAward}
          label="Cupones usados"
          value={membership?.active ? `${membership.active.couponsUsed}/${membership.active.couponsTotal}` : 'Sin membresía'}
          valueClassName="text-[#FF5C00]"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-white">Historial de turnos</h2>

        {isLoadingAppointments ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : sortedAppointments.length === 0 ? (
          <p className="text-[14px] text-[#8A8A8A] text-center py-8 rounded-[12px] border border-[#282828] bg-[#1A1A1A]">
            No hay turnos registrados para este cliente.
          </p>
        ) : (
          <>
             <div className="flex flex-col gap-2 lg:hidden">
              {sortedAppointments.map((a) => (
                <div
                  key={a.id}
                  onClick={() => actions.setDetailTarget(a)}
                  className="rounded-[14px] border border-[#282828] bg-[#1A1A1A] p-3 flex flex-col gap-2 text-[13px] cursor-pointer hover:border-[#FF5C00]/40 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{formatDate(a.date)}</span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Badge label={a.status} styles={statusStyles[a.status]} />
                      <AppointmentActionsMenu appointment={a} actions={actions} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[#8A8A8A]">
                    <span>{a.startTime} - {a.endTime}</span>
                    <span className="truncate max-w-[45%]">{a.serviceName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">{a.barberName ?? '—'}</span>
                    <span className="text-green-400 font-medium">{formatCurrency(a.servicePrice)}</span>
                  </div>
                  <div><Badge label={a.paymentStatus} styles={paymentStyles[a.paymentStatus]} /></div>
                </div>
              ))}
            </div>

             <div className="hidden lg:block overflow-x-auto rounded-[12px] border border-[#282828]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#121212] border-b border-[#282828]">
                    <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Fecha</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Horario</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium"><FiScissors className="inline mb-0.5" size={11} /> Servicio</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Barbero</th>
                    <th className="text-right px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Precio</th>
                    <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Estado</th>
                    <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium"><FiCreditCard className="inline mb-0.5" size={11} /> Pago</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {sortedAppointments.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => actions.setDetailTarget(a)}
                      className="border-b border-[#282828]/50 last:border-b-0 cursor-pointer hover:bg-[#1A1A1A]/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-white">{formatDate(a.date)}</td>
                      <td className="px-4 py-3 text-[#8A8A8A]">{a.startTime} - {a.endTime}</td>
                      <td className="px-4 py-3 text-[#8A8A8A] max-w-[160px] truncate">{a.serviceName}</td>
                      <td className="px-4 py-3 text-[#8A8A8A]">{a.barberName ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(a.servicePrice)}</td>
                      <td className="px-4 py-3 text-center"><Badge label={a.status} styles={statusStyles[a.status]} /></td>
                      <td className="px-4 py-3 text-center"><Badge label={a.paymentStatus} styles={paymentStyles[a.paymentStatus]} /></td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}><AppointmentActionsMenu appointment={a} actions={actions} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <AppointmentActionModals {...actions} />

      {sancionarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSancionarOpen(false)}>
          <div
            className="w-full max-w-md rounded-[16px] border border-[#282828] bg-[#121212] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <FiAlertOctagon className="text-red-400" size={18} />
                <h2 className="text-[16px] font-bold text-white">Sancionar cliente</h2>
              </div>
              <button className="text-[#6A6A6A] hover:text-white transition-colors" onClick={() => setSancionarOpen(false)}>
                <FiX size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {client.clientName} {client.clientLastname} acumuló {client.noShowCount ?? 0} inasistencias y no podrá reservar
              turnos hasta que levantes la sanción.
            </p>
            <label className="block text-[12px] text-[#6A6A6A] mb-1.5">Motivo (opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej. 3 inasistencias sin aviso"
              className="w-full rounded-[10px] bg-[#1A1A1A] border border-[#282828] px-3 py-2.5 text-[13px] text-white placeholder-[#6A6A6A] focus:outline-none focus:border-[#FF5C00]/50 resize-none mb-5"
            />
            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setSancionarOpen(false)}>Cancelar</Button>
              <Button variant="danger" loading={isSancionando} onClick={handleSancionar}>Sancionar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
