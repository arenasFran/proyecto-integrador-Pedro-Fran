import React from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiInfo,
  FiScissors,
  FiSettings,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import { AnimatedContainer, Input, Pagination, Select, Spinner, StatsCards } from '../../../components/common';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { detectPreset } from '../../../components/common/dateRangeUtils';
import { formatDate } from '../../../utils/formatDate';
import { AppointmentActionModals } from './AppointmentActionModals';
import { AppointmentActionsMenu } from './AppointmentActionsMenu';
import { useAdminAppointments } from './useAdminAppointments';
import { statusStyles, methodLabel, statusLabel, formatTimeRange, paymentBadge, originBadge, formatTimestamp, exportCSV } from './helpers';

export const AdminAppointmentsPage: React.FC = () => {
  const adminAppointments = useAdminAppointments();
  const {
    barbers, appointments, totalPages, isLoading,
    filterDateFrom, filterDateTo, filterBarberId,
    filterStatus, filterPaymentMethod, searchTerm, page, sortBy, sortDir,
    pageSize, showCustomize,
    expandedId,
    isUpdatingStatus,
    stats,
    setPageSize, setShowCustomize,
    setCancelTarget, setCancelReason, setRescheduleTarget,
    setRescheduleDate, setRescheduleTime, setRescheduleBarberId,
    setExpandedId, setDetailTarget,
    setCombinedActionTarget,
    toggleSort, handleDateRangeChange, clearFilters, updateParams,
    handleStatusChange,
    isCancelling,
  } = adminAppointments;

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A]">
                <FiScissors className="text-[#FF5C00]" />
                Gestión de turnos
              </div>
              <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                Administrá todos los turnos desde una sola pantalla.
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#8A8A8A] sm:text-[15px] hidden md:block">
                Visualizá, cancelá, reprogramá y cambiá el estado de los turnos de forma centralizada.
              </p>
            </div>
          </div>
          <StatsCards stats={stats} onStatusClick={(s) => { updateParams({ status: s || undefined }); }} />
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <DateRangeFilter
              onChange={handleDateRangeChange}
              defaultPreset={filterDateFrom && filterDateTo ? detectPreset(filterDateFrom, filterDateTo) : 'semana'}
              skipMountEffect={!!(filterDateFrom || filterDateTo)}
              initialCustomDesde={filterDateFrom}
              initialCustomHasta={filterDateTo}
            />
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className={`flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-[12px] transition-colors ${showCustomize ? 'border-[#FF5C00] text-white' : 'border-[#282828] text-[#8A8A8A] hover:border-[#FF5C00]/50 hover:text-white'}`}
              title="Personalizar lista"
            >
              <FiSettings className="text-sm" />
              Personalizar
            </button>
          </div>

          {showCustomize && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-4 py-3">
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-[#8A8A8A]">Filas por página</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); updateParams({ page: '1' }); }}
                  className="h-[34px] rounded-[8px] border border-[#282828] bg-[#121212] px-2 text-[13px] text-white outline-none focus:border-[#FF5C00]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="w-full sm:w-[180px]">
              <Select
                label="Barbero"
                value={filterBarberId}
                onChange={(v) => updateParams({ barberId: v })}
                options={[
                  { value: '', label: 'Todos' },
                  ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
                ]}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                label="Estado"
                value={filterStatus}
                onChange={(v) => updateParams({ status: v })}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'Confirmado', label: 'Confirmado' },
                  { value: 'Completado', label: 'Completado' },
                  { value: 'Cancelado', label: 'Cancelado' },
                  { value: 'NoShow', label: 'No asistió' },
                ]}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                label="Método de pago"
                value={filterPaymentMethod}
                onChange={(v) => updateParams({ paymentMethod: v })}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'local', label: 'Local' },
                  { value: 'online', label: 'Online' },
                  { value: 'memberPass', label: 'Membresía' },
                ]}
              />
            </div>
            <Input
              label="Buscar"
              type="text"
              value={searchTerm}
              onChange={(e) => updateParams({ search: e.target.value })}
              placeholder="Cliente, email o servicio"
              containerClass="w-full sm:w-[200px]"
            />
            <button
              onClick={() => exportCSV(appointments)}
              className="flex h-[40px] self-end items-center gap-1.5 rounded-[10px] border border-[#282828] px-3 text-[12px] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00]/50 transition-colors"
              title="Exportar a CSV"
            >
              <FiDownload className="text-sm" />
              Exportar CSV
            </button>
            {(filterDateFrom || filterDateTo || filterBarberId || filterStatus || filterPaymentMethod || searchTerm || sortBy) && (
              <button
                onClick={clearFilters}
                className="h-[40px] self-end rounded-[10px] border border-[#282828] px-3 text-[12px] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00]/50 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
              <FiCalendar className="text-4xl mb-3" />
              <p className="text-[15px]">No se encontraron turnos</p>
              <p className="text-[12px] mt-1">Probá cambiar los filtros o seleccionar otro rango de fechas.</p>
            </div>
          ) : (
            <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {appointments.map((appointment) => {
                const style = statusStyles[appointment.status];
                const isActive = appointment.status === 'Confirmado';
                return (
                  <div key={appointment.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white break-words">
                          {appointment.clientName} {appointment.clientLastname}
                        </p>
                        {appointment.clientEmail && (
                          <p className="text-[11px] text-[#8A8A8A] truncate">{appointment.clientEmail}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {appointment.clientKind && (
                          <span className="text-[10px] text-[#8A8A8A] border border-[#282828] rounded-full px-1.5 py-0.5">{appointment.clientKind === 'Registrado' ? 'Reg.' : 'Anón.'}</span>
                        )}
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <button
                          onClick={() => setDetailTarget(appointment)}
                          className="text-[#8A8A8A] hover:text-[#FF5C00] transition-colors shrink-0"
                          aria-label="Ver detalle completo"
                          title="Ver detalle completo"
                        >
                          <FiInfo className="text-sm" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Barbero</span>
                        <span className="text-white">{appointment.barberName ?? barbers.find((b) => b.id === appointment.barberId)?.name ?? appointment.barberId.slice(-6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Servicio</span>
                        <span className="text-white text-right max-w-[60%] truncate">{appointment.serviceName} ({appointment.serviceDuration} min)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Fecha</span>
                        <span className="text-white">{formatDate(appointment.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Horario</span>
                        <span className="text-white">{formatTimeRange(appointment.startTime, appointment.endTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Pago</span>
                        <span>{paymentBadge(appointment.paymentStatus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Origen</span>
                        <span>{originBadge(appointment.createdBy)}</span>
                      </div>
                    </div>

                    {appointment.status === 'Cancelado' && (appointment.cancelReason || appointment.cancelledBy) && (
                      <div className="text-[11px] text-[#8A8A8A] leading-relaxed">
                        {appointment.cancelledBy && <span>Cancelado por {appointment.cancelledBy}</span>}
                        {appointment.cancelledAt && <span> el {formatTimestamp(appointment.cancelledAt)}</span>}
                        {appointment.cancelReason && <span> — Motivo: {appointment.cancelReason}</span>}
                      </div>
                    )}

                    {isActive && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-[#282828]/50">
                        <button
                          onClick={() => { setCombinedActionTarget({ appointment, primaryAction: 'Completado' }); }}
                          className="rounded-[8px] border border-green-500/30 p-1.5 text-green-400 hover:bg-green-500/10 transition-colors"
                          title="Marcar como completado"
                        >
                          <FiCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => { setRescheduleTarget(appointment); setRescheduleDate(appointment.date); setRescheduleTime(appointment.startTime); setRescheduleBarberId(appointment.barberId); }}
                          className="rounded-[8px] border border-blue-500/30 p-1.5 text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Reprogramar"
                        >
                          <FiClock className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'NoShow')}
                          disabled={isUpdatingStatus}
                          className="rounded-[8px] border border-yellow-500/30 p-1.5 text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                          title="Marcar como no asistió"
                        >
                          <FiXCircle className="text-sm" />
                        </button>
                        <button
                          onClick={() => { setCancelTarget(appointment); setCancelReason(''); }}
                          disabled={isCancelling}
                          className="rounded-[8px] border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Cancelar turno"
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#282828] text-[#8A8A8A] text-[12px] uppercase tracking-wider">
                    <th className="pb-3 pr-2 w-6"></th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Barbero</th>
                    <th className="pb-3 pr-4 font-medium">Servicio</th>
                    <th className="pb-3 pr-4 font-medium">
                      <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Fecha
                        {sortBy === 'date' ? (
                          sortDir === 'asc' ? <FiChevronUp className="text-[11px]" /> : <FiChevronDown className="text-[11px]" />
                        ) : (
                          <FiChevronUp className="text-[11px] opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      <button onClick={() => toggleSort('time')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Horario
                        {sortBy === 'time' ? (
                          sortDir === 'asc' ? <FiChevronUp className="text-[11px]" /> : <FiChevronDown className="text-[11px]" />
                        ) : (
                          <FiChevronUp className="text-[11px] opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 pr-4 font-medium">Pago</th>
                    <th className="pb-3 pr-4 font-medium">Origen</th>
                    <th className="pb-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => {
                    const style = statusStyles[appointment.status];
                    const isExpanded = expandedId === appointment.id;
                    return (
                      <React.Fragment key={appointment.id}>
                      <tr
                        className={`border-b border-[#282828]/50 transition-colors ${isExpanded ? 'bg-[#1A1A1A]' : 'hover:bg-[#1A1A1A]/80'}`}
                      >
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : appointment.id)}
                              className="text-[#8A8A8A] hover:text-white transition-colors"
                              aria-label={isExpanded ? 'Colapsar detalle' : 'Expandir detalle'}
                            >
                              {isExpanded ? <FiChevronDown className="text-sm" /> : <FiChevronRight className="text-sm" />}
                            </button>
                            <button
                              onClick={() => setDetailTarget(appointment)}
                              className="text-[#8A8A8A] hover:text-[#FF5C00] transition-colors"
                              aria-label="Ver detalle completo"
                              title="Ver detalle completo"
                            >
                              <FiInfo className="text-sm" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-white">{appointment.clientName} {appointment.clientLastname}</div>
                          <div className="flex items-center gap-1.5">
                            {appointment.clientEmail && (
                              <span className="text-[11px] text-[#8A8A8A]">{appointment.clientEmail}</span>
                            )}
                            {appointment.clientKind && (
                              <span className="text-[10px] text-[#8A8A8A] border border-[#282828] rounded-full px-1.5">{appointment.clientKind === 'Registrado' ? 'Reg.' : 'Anón.'}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A8A]">
                          {appointment.barberName ?? barbers.find((b) => b.id === appointment.barberId)?.name ?? appointment.barberId.slice(-6)}
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A8A]">
                          <span>{appointment.serviceName}</span>
                          <span className="text-[11px] ml-1 text-[#6A6A6A]">({appointment.serviceDuration} min)</span>
                        </td>
                        <td className="py-3 pr-4 text-white whitespace-nowrap">{formatDate(appointment.date)}</td>
                        <td className="py-3 pr-4 text-white whitespace-nowrap">{formatTimeRange(appointment.startTime, appointment.endTime)}</td>
                        <td className="py-3 pr-4">
                          <motion.span
                            key={`${appointment.id}-${appointment.status}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </motion.span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            {paymentBadge(appointment.paymentStatus)}
                            <span className="text-[10px] text-[#6A6A6A]">{methodLabel[appointment.paymentMethod] ?? appointment.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{originBadge(appointment.createdBy)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <AppointmentActionsMenu appointment={appointment} actions={adminAppointments} />
                            {appointment.status === 'Cancelado' && appointment.cancelReason && (
                              <span className="text-[11px] text-[#8A8A8A] max-w-[120px] truncate" title={appointment.cancelReason}>
                                {appointment.cancelReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-[#282828]/50">
                          <td colSpan={10} className="px-6 pb-4 pt-2">
                            <div className="grid grid-cols-3 gap-4 text-[13px]">
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Pago</h4>
                                <div className="flex items-center gap-2">
                                  {paymentBadge(appointment.paymentStatus)}
                                  <span className="text-[#8A8A8A]">{methodLabel[appointment.paymentMethod] ?? appointment.paymentMethod}</span>
                                </div>
                                {appointment.paymentMethod === 'memberPass' && (
                                  <p className="text-[11px] text-[#8A8A8A]">Pago por membresía</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Origen</h4>
                                <div className="flex items-center gap-2">
                                  {originBadge(appointment.createdBy)}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Cliente</h4>
                                <p className="text-white">{appointment.clientName} {appointment.clientLastname}</p>
                                {appointment.clientEmail && <p className="text-[11px] text-[#8A8A8A]">{appointment.clientEmail}</p>}
                                {appointment.clientPhone && <p className="text-[11px] text-[#8A8A8A]">{appointment.clientPhone}</p>}
                                {appointment.clientKind && (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${appointment.clientKind === 'Registrado' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                    {appointment.clientKind === 'Registrado' ? 'Cliente registrado' : 'Cliente anónimo'}
                                  </span>
                                )}
                              </div>
                              {appointment.status === 'Cancelado' && (
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Cancelación</h4>
                                  {appointment.cancelledBy && <p className="text-white">Por: {appointment.cancelledBy}</p>}
                                  {appointment.cancelledAt && <p className="text-[11px] text-[#8A8A8A]">{formatTimestamp(appointment.cancelledAt)}</p>}
                                  {appointment.cancelReason && <p className="text-[11px] text-red-400">Motivo: {appointment.cancelReason}</p>}
                                </div>
                              )}
                              {appointment.statusHistory && appointment.statusHistory.length > 0 && (
                                <div className="col-span-3 space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Historial de cambios</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {appointment.statusHistory.map((entry, idx) => (
                                      <div key={idx} className="flex items-center gap-2 rounded-[8px] border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[12px]">
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusStyles[entry.status]?.bg ?? ''} ${statusStyles[entry.status]?.text ?? ''}`}>
                                          {statusLabel[entry.status] ?? entry.status}
                                        </span>
                                        <span className="text-[#8A8A8A]">{formatTimestamp(entry.timestamp)}</span>
                                        <span className="text-[#6A6A6A]">por {entry.actor}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(n) => updateParams({ page: String(n) }, false)} />
            </>
          )}
        </AnimatedContainer>
      </div>

      <AppointmentActionModals {...adminAppointments} />
    </div>
  );
};

export default AdminAppointmentsPage;
