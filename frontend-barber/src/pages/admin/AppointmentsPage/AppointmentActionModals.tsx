import React from 'react';
import { ConfirmModal } from '../../../components/common';
import { QuickCreateModal } from '../CalendarPage/QuickCreateModal';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { CancelModal } from './CancelModal';
import { RescheduleModal } from './RescheduleModal';
import { ChangeBarberModal } from './ChangeBarberModal';
import { CombinedActionModal } from './CombinedActionModal';
import type { AppointmentActions } from './useAppointmentActions';

// Agrupa los modales flotantes de acciones sobre un turno (cancelar, reprogramar,
// completar/pagar, cambiar barbero, duplicar y el detalle). Se monta una sola vez
// por pantalla que use useAppointmentActions (AppointmentsPage y CalendarPage).
export const AppointmentActionModals: React.FC<AppointmentActions> = (actions) => {
  const {
    barbers,
    cancelTarget, cancelReason, rescheduleTarget, rescheduleDate, rescheduleTime, rescheduleBarberId,
    rescheduleSlots, isLoadingSlots, slotsError,
    confirmTarget, detailTarget, showQuickCreate, quickCreateDate, quickCreateClient,
    changeBarberTarget, changeBarberNewId, combinedActionTarget,
    isCancelling, isUpdatingStatus, isRescheduling, isMarkingPaid, isChangingBarber,
    setCancelTarget, setCancelReason,
    setRescheduleTime,
    setConfirmTarget, setDetailTarget,
    setChangeBarberTarget, setChangeBarberNewId, setCombinedActionTarget,
    handleCancelConfirm, handleStatusChange, handleRescheduleConfirm,
    handleRescheduleDateChange, handleRescheduleBarberChange, handleRescheduleClose,
    handleCreateForClient, handleQuickCreateClose,
    handleChangeBarberConfirm,
    handleCompleteOnly, handleCompleteAndPaid, handleMarkPaidOnly,
  } = actions;

  return (
    <>
      <CancelModal
        target={cancelTarget}
        reason={cancelReason}
        isCancelling={isCancelling}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
      />

      <RescheduleModal
        target={rescheduleTarget}
        date={rescheduleDate}
        time={rescheduleTime}
        barberId={rescheduleBarberId}
        isRescheduling={isRescheduling}
        barbers={barbers}
        slots={rescheduleSlots}
        isLoadingSlots={isLoadingSlots}
        slotsError={slotsError}
        onDateChange={handleRescheduleDateChange}
        onTimeChange={setRescheduleTime}
        onBarberChange={handleRescheduleBarberChange}
        onConfirm={handleRescheduleConfirm}
        onClose={handleRescheduleClose}
      />

      <ConfirmModal
        isOpen={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) {
            handleStatusChange(confirmTarget.id, confirmTarget.action);
            setConfirmTarget(null);
          }
        }}
        title="Marcar como no asistió"
        message="¿Estás seguro de marcar este turno como no asistido? Esta acción no se puede deshacer."
        confirmText="Sí, marcar como no asistió"
        variant="danger"
        loading={isUpdatingStatus}
      />

      <CombinedActionModal
        target={combinedActionTarget}
        isUpdatingStatus={isUpdatingStatus}
        isMarkingPaid={isMarkingPaid}
        onCompleteOnly={handleCompleteOnly}
        onCompleteAndPaid={handleCompleteAndPaid}
        onMarkPaidOnly={handleMarkPaidOnly}
        onClose={() => setCombinedActionTarget(null)}
      />

      <AppointmentDetailModal
        appointment={detailTarget}
        isOpen={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        onCreateAppointment={handleCreateForClient}
      />

      <ChangeBarberModal
        target={changeBarberTarget}
        newBarberId={changeBarberNewId}
        isChangingBarber={isChangingBarber}
        barbers={barbers}
        onBarberChange={setChangeBarberNewId}
        onConfirm={handleChangeBarberConfirm}
        onClose={() => setChangeBarberTarget(null)}
      />

      {showQuickCreate && (
        <QuickCreateModal
          dateStr={quickCreateDate}
          onClose={handleQuickCreateClose}
          initialClient={quickCreateClient ?? undefined}
        />
      )}
    </>
  );
};
