import { useMemo, useState } from 'react';
import { FiAward, FiCalendar, FiClock, FiDollarSign, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { Modal, Spinner } from '../../../../components/common';
import { OrderDetailModal } from '../../../../components/admin/OrderDetailModal';
import { useGetAppointmentsQuery } from '../../../../services/appointmentApi';
import { useGetAllOrdersQuery } from '../../../../services/orderApi';
import { useGetTransactionsQuery } from '../../../../services/membershipApi';
import type { Appointment } from '../../../../types/booking';
import type { Order } from '../../../../types/order';
import type { MembershipTransaction } from '../../../../types/membership';
import { formatCurrency } from '../../../../utils/formatCurrency';
import DashboardAppointmentDetailModal from './DashboardAppointmentDetailModal';

interface DayActivityDetailModalProps {
  date: string | null;
  isOpen: boolean;
  onClose: () => void;
  revenueBySource?: Record<string, number>;
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function SourceCard({ label, value, amount, icon: Icon, color }: { label: string; value: number; amount: number; icon: typeof FiCalendar; color: string }) {
  return (
    <div className="rounded-xl border border-[#282828] bg-[#1A1A1A] p-3">
      <div className="flex items-center gap-2">
        <Icon className={color} size={15} aria-hidden="true" />
        <span className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-[#8A8A8A]">{formatCurrency(amount)} registrados</p>
    </div>
  );
}

export default function DayActivityDetailModal({ date, isOpen, onClose, revenueBySource = {} }: DayActivityDetailModalProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<MembershipTransaction | null>(null);
  const skip = !isOpen || !date;

  const { data: appointments = [], isLoading: appointmentsLoading } = useGetAppointmentsQuery(
    date ? { date, includeBarber: 'true', includeClient: 'true', limit: 100 } : undefined,
    { skip },
  );
  const { data: ordersData, isLoading: ordersLoading } = useGetAllOrdersQuery(
    date ? { desde: date, hasta: date, limit: 100 } : undefined,
    { skip },
  );
  const { data: transactionsData, isLoading: transactionsLoading } = useGetTransactionsQuery(
    date ? { desde: date, hasta: date, limit: 100 } : {},
    { skip },
  );

  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData?.orders]);
  const memberships = useMemo(() => transactionsData?.data ?? [], [transactionsData?.data]);
  const fallbackAmounts = useMemo(() => ({
    appointment: appointments.filter((appointment) => appointment.paymentStatus === 'Pagado').reduce((sum, appointment) => sum + appointment.servicePrice, 0),
    product_order: orders.filter((order) => ['paid', 'delivered'].includes(order.status)).reduce((sum, order) => sum + order.total, 0),
    membership: memberships.reduce((sum, transaction) => sum + transaction.amount, 0),
  }), [appointments, orders, memberships]);
  const amount = (source: string) => revenueBySource[source] ?? fallbackAmounts[source as keyof typeof fallbackAmounts] ?? 0;
  const loading = appointmentsLoading || ordersLoading || transactionsLoading;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={date ? `Detalle del ${formatDay(date)}` : 'Detalle del día'} size="xl">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SourceCard label="Turnos" value={appointments.length} amount={amount('appointment')} icon={FiCalendar} color="text-blue-400" />
              <SourceCard label="Órdenes" value={orders.length} amount={amount('product_order')} icon={FiPackage} color="text-[#FF5C00]" />
              <SourceCard label="Membresías" value={memberships.length} amount={amount('membership')} icon={FiAward} color="text-purple-400" />
            </div>

            <section aria-labelledby="day-appointments-heading">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="day-appointments-heading" className="text-sm font-semibold text-white">Turnos ({appointments.length})</h3>
                <span className="text-xs text-blue-400">{formatCurrency(amount('appointment'))}</span>
              </div>
              {appointments.length === 0 ? <p className="rounded-xl bg-[#1A1A1A] p-4 text-center text-xs text-[#6A6A6A]">Sin turnos registrados.</p> : (
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {appointments.map((appointment) => (
                    <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="flex items-center gap-3 rounded-xl border border-[#282828] bg-[#1A1A1A] p-3 text-left transition-colors hover:border-[#FF5C00]/40">
                      <FiClock className="shrink-0 text-blue-400" size={15} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white">{appointment.clientName} {appointment.clientLastname}</span>
                        <span className="mt-1 block truncate text-[11px] text-[#8A8A8A]">{formatTime(appointment.startTime)} · {appointment.serviceName} · {appointment.barberName ?? 'Sin barbero'}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-white">{formatCurrency(appointment.servicePrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="day-orders-heading">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="day-orders-heading" className="text-sm font-semibold text-white">Órdenes ({orders.length})</h3>
                <span className="text-xs text-[#FF5C00]">{formatCurrency(amount('product_order'))}</span>
              </div>
              {orders.length === 0 ? <p className="rounded-xl bg-[#1A1A1A] p-4 text-center text-xs text-[#6A6A6A]">Sin órdenes registradas.</p> : (
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {orders.map((order) => (
                    <button key={order.id} type="button" onClick={() => setSelectedOrder(order)} className="flex items-center gap-3 rounded-xl border border-[#282828] bg-[#1A1A1A] p-3 text-left transition-colors hover:border-[#FF5C00]/40">
                      <FiShoppingBag className="shrink-0 text-[#FF5C00]" size={15} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white">{order.userName ?? order.clientName ?? `Orden #${order.id.slice(-6)}`}</span>
                        <span className="mt-1 block truncate text-[11px] text-[#8A8A8A]">{order.items.length} producto(s) · {order.status}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-white">{formatCurrency(order.total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="day-memberships-heading">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="day-memberships-heading" className="text-sm font-semibold text-white">Membresías ({memberships.length})</h3>
                <span className="text-xs text-purple-400">{formatCurrency(amount('membership'))}</span>
              </div>
              {memberships.length === 0 ? <p className="rounded-xl bg-[#1A1A1A] p-4 text-center text-xs text-[#6A6A6A]">Sin transacciones de membresía.</p> : (
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {memberships.map((membership) => (
                    <button key={membership.id} type="button" onClick={() => setSelectedMembership(membership)} className="flex items-center gap-3 rounded-xl border border-[#282828] bg-[#1A1A1A] p-3 text-left transition-colors hover:border-purple-400/40">
                      <FiDollarSign className="shrink-0 text-purple-400" size={15} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white">Transacción de membresía</span>
                        <span className="mt-1 block truncate text-[11px] text-[#8A8A8A]">{membership.paymentMethod} · {membership.createdBy === 'admin' ? 'Admin' : 'Cliente'}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-white">{formatCurrency(membership.amount)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>

      {selectedAppointment && <DashboardAppointmentDetailModal appointment={selectedAppointment} isOpen onClose={() => setSelectedAppointment(null)} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {selectedMembership && (
        <Modal isOpen onClose={() => setSelectedMembership(null)} title="Detalle de membresía" size="sm">
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-xl bg-[#1A1A1A] p-3"><span className="text-xs text-[#6A6A6A]">Importe</span><p className="mt-1 font-bold text-purple-300">{formatCurrency(selectedMembership.amount)}</p></div>
            <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#1A1A1A] p-3"><span className="text-xs text-[#6A6A6A]">Método</span><p className="mt-1 text-white">{selectedMembership.paymentMethod}</p></div><div className="rounded-xl bg-[#1A1A1A] p-3"><span className="text-xs text-[#6A6A6A]">Usuario</span><p className="mt-1 truncate text-white">{selectedMembership.userId}</p></div></div>
          </div>
        </Modal>
      )}
    </>
  );
}
