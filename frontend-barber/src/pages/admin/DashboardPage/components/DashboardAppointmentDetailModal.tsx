import { useState } from 'react';
import { ConfirmModal, useToast } from '../../../../components/common';
import { CancelModal } from '../../AppointmentsPage/CancelModal';
import { CombinedActionModal } from '../../AppointmentsPage/CombinedActionModal';
import { AppointmentDetailModal, type AppointmentDetailAction } from '../../AppointmentsPage/AppointmentDetailModal';
import {
  useCancelAppointmentMutation,
  useMarkAsPaidMutation,
  useSendReminderMutation,
  useUpdateAppointmentStatusMutation,
} from '../../../../services/appointmentApi';
import type { Appointment } from '../../../../types/booking';
import { extractError } from '../../AppointmentsPage/helpers';

interface DashboardAppointmentDetailModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function DashboardAppointmentDetailModal({ appointment, isOpen, onClose, onUpdated }: DashboardAppointmentDetailModalProps) {
  const { showToast } = useToast();
  const [actionTarget, setActionTarget] = useState<{ appointment: Appointment; primaryAction: 'Completado' | 'Pagado' } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkAsPaidMutation();
  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [sendReminder] = useSendReminderMutation();

  const refresh = () => {
    onUpdated?.();
    onClose();
  };

  const handleAction = (action: AppointmentDetailAction) => {
    if (!appointment) return;
    if (action === 'complete') setActionTarget({ appointment, primaryAction: 'Completado' });
    if (action === 'paid') setActionTarget({ appointment, primaryAction: 'Pagado' });
    if (action === 'cancel') setCancelTarget(appointment);
    if (action === 'noShow') setNoShowTarget(appointment);
    if (action === 'reminder') {
      void sendReminder({ id: appointment.id }).unwrap().then(() => showToast('Recordatorio enviado con éxito')).catch((error: unknown) => showToast(extractError(error), 'error'));
    }
  };

  const handleCompleteOnly = async (id: string) => {
    try {
      await updateStatus({ id, status: 'Completado' }).unwrap();
      showToast('Turno completado con éxito');
      setActionTarget(null);
      refresh();
    } catch (error) {
      showToast(extractError(error), 'error');
    }
  };

  const handleCompleteAndPaid = async (id: string) => {
    try {
      await updateStatus({ id, status: 'Completado' }).unwrap();
      await markAsPaid({ id }).unwrap();
      showToast('Turno completado y pago registrado');
      setActionTarget(null);
      refresh();
    } catch (error) {
      showToast(extractError(error), 'error');
    }
  };

  const handleMarkPaidOnly = async (id: string) => {
    try {
      await markAsPaid({ id }).unwrap();
      showToast('Pago registrado con éxito');
      setActionTarget(null);
      refresh();
    } catch (error) {
      showToast(extractError(error), 'error');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment({ id: cancelTarget.id, reason: cancelReason || undefined }).unwrap();
      showToast('Turno cancelado con éxito');
      setCancelTarget(null);
      setCancelReason('');
      refresh();
    } catch (error) {
      showToast(extractError(error), 'error');
    }
  };

  const handleNoShow = async () => {
    if (!noShowTarget) return;
    try {
      await updateStatus({ id: noShowTarget.id, status: 'NoShow' }).unwrap();
      showToast('Turno marcado como no asistido');
      setNoShowTarget(null);
      refresh();
    } catch (error) {
      showToast(extractError(error), 'error');
    }
  };

  return (
    <>
      <AppointmentDetailModal appointment={appointment} isOpen={isOpen} onClose={onClose} onAction={handleAction} />
      <CombinedActionModal
        target={actionTarget}
        isUpdatingStatus={isUpdatingStatus}
        isMarkingPaid={isMarkingPaid}
        onCompleteOnly={handleCompleteOnly}
        onCompleteAndPaid={handleCompleteAndPaid}
        onMarkPaidOnly={handleMarkPaidOnly}
        onClose={() => setActionTarget(null)}
      />
      <CancelModal
        target={cancelTarget}
        reason={cancelReason}
        isCancelling={isCancelling}
        onReasonChange={setCancelReason}
        onConfirm={() => void handleCancel()}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
      />
      <ConfirmModal
        isOpen={noShowTarget !== null}
        onClose={() => setNoShowTarget(null)}
        onConfirm={() => void handleNoShow()}
        title="Marcar como no asistió"
        message="¿Estás seguro de marcar este turno como no asistido? Esta acción no se puede deshacer."
        confirmText="Sí, marcar como no asistió"
        loading={isUpdatingStatus}
      />
    </>
  );
}
